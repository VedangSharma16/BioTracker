import type { Express, NextFunction, Request, Response } from "express";
import type { Server } from "http";
import expressMySqlSession from "express-mysql-session";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { z } from "zod";
import { api } from "./shared/routes";
import { storage } from "./storage";
import { broadcastHealthEvent, setupRealtime } from "./realtime";
import { generateTemporaryPassword, hashPassword, looksHashed, verifyPassword } from "./password";

const MySQLStoreFactory = expressMySqlSession(session);

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  setupRealtime(httpServer);
  const recoverySessions = new Map<string, { otp: string; expiresAt: number; patientId: number }>();
  const mockSmsInbox: Array<{ phone: string; message: string; createdAt: Date }> = [];

  const getRole = (user: any) =>
    typeof user?.role === "string" ? user.role.toLowerCase() : "";

  const getScopedPatientId = (user: any) =>
    getRole(user) === "patient" ? user.patientId : undefined;

  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set in production.");
  }

  if (isProduction) {
    app.set("trust proxy", 1);
  }

  const store = new MySQLStoreFactory({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    clearExpired: true,
    checkExpirationInterval: 15 * 60 * 1000,
    expiration: 7 * 24 * 60 * 60 * 1000,
    createDatabaseTable: true,
  });

  app.use(session({
    secret: process.env.SESSION_SECRET || "health_tracker_secret",
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      secure: isProduction,
      sameSite: "lax",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return done(null, false, { message: "Invalid username or password" });
      }

      const validPassword = looksHashed(user.password)
        ? verifyPassword(username, password, user.password)
        : user.password === password;

      if (!validPassword) {
        return done(null, false, { message: "Invalid username or password" });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));

  passport.serializeUser((user: any, done) => done(null, user.userId));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) return next();
    if (req.path.startsWith("/api")) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated() && getRole(req.user) === "admin") return next();
    res.status(403).json({ message: "Forbidden" });
  };

  const handleZodError = (res: Response, error: unknown) => {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: error.errors[0]?.message ?? "Validation error",
        field: error.errors[0]?.path.join("."),
      });
    }

    return res.status(500).json({ message: "Internal server error" });
  };

  const sendSmsMessage = async (phone: string, message: string): Promise<"sms" | "log"> => {
    const webhookUrl = process.env.SMS_WEBHOOK_URL;

    if (!webhookUrl) {
      mockSmsInbox.unshift({ phone, message, createdAt: new Date() });
      if (mockSmsInbox.length > 20) {
        mockSmsInbox.length = 20;
      }
      console.log(`[sms-fallback] to=${phone} message=${message}`);
      return "log";
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: phone,
        message,
        apiKey: process.env.SMS_API_KEY,
      }),
    });

    if (!response.ok) {
      mockSmsInbox.unshift({ phone, message, createdAt: new Date() });
      if (mockSmsInbox.length > 20) {
        mockSmsInbox.length = 20;
      }
      console.log(`[sms-fallback] to=${phone} message=${message}`);
      return "log";
    }

    return "sms";
  };

  app.post(api.auth.login.path, passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post(api.auth.logout.path, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logged out" });
    });
  });

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get(api.auth.me.path, requireAuth, (req, res) => {
    res.status(200).json(req.user);
  });

  app.post(api.auth.recoveryRequest.path, async (req, res) => {
    try {
      const input = api.auth.recoveryRequest.input.parse(req.body);
      const patient = await storage.getPatientByPhone(input.phone);

      if (!patient) {
        return res.status(400).json({ message: "No patient found for that phone number." });
      }

      const linkedUser = await storage.getUserByPatientId(patient.patientId);
      if (!linkedUser) {
        return res.status(400).json({ message: "No patient login found for that phone number." });
      }

      const otp = String(Math.floor(100000 + Math.random() * 900000));
      recoverySessions.set(input.phone, {
        otp,
        expiresAt: Date.now() + 5 * 60 * 1000,
        patientId: patient.patientId,
      });

      const deliveryMode = await sendSmsMessage(
        input.phone,
        `Your BioTracker OTP is ${otp}. It expires in 5 minutes.`,
      );

      return res.status(200).json({
        message: "OTP sent to the registered phone number.",
        deliveryMode,
      });
    } catch (error) {
      return handleZodError(res, error);
    }
  });

  app.post(api.auth.recoveryVerify.path, async (req, res) => {
    try {
      const input = api.auth.recoveryVerify.input.parse(req.body);
      const recoveryState = recoverySessions.get(input.phone);

      if (!recoveryState || recoveryState.expiresAt < Date.now() || recoveryState.otp !== input.otp) {
        return res.status(400).json({ message: "Invalid or expired OTP." });
      }

      const patient = await storage.getPatient(recoveryState.patientId);
      const linkedUser = await storage.getUserByPatientId(recoveryState.patientId);

      if (!patient || !linkedUser || !patient.phone) {
        recoverySessions.delete(input.phone);
        return res.status(400).json({ message: "Unable to recover account details." });
      }

      const deliveryMode = await sendSmsMessage(
        patient.phone,
        `BioTracker account details. Username: ${linkedUser.username} Password: ${linkedUser.password}`,
      );

      recoverySessions.delete(input.phone);

      return res.status(200).json({
        message: "Account details sent to the registered phone number.",
        deliveryMode,
      });
    } catch (error) {
      return handleZodError(res, error);
    }
  });

  app.get(api.dashboard.stats.path, requireAuth, async (_req, res) => {
    res.status(200).json(await storage.getDashboardStats());
  });

  app.get(api.patients.list.path, requireAdmin, async (_req, res) => {
    res.status(200).json(await storage.getPatients());
  });

  app.post(api.patients.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.patients.create.input.parse(req.body);

      if (!input.phone?.trim()) {
        return res.status(400).json({ message: "Phone is required." });
      }

      if (!input.emergencyContact?.trim()) {
        return res.status(400).json({ message: "Emergency contact is required." });
      }

      if (!input.username?.trim()) {
        return res.status(400).json({ message: "Username is required." });
      }

      if (!input.password?.trim()) {
        return res.status(400).json({ message: "Password is required." });
      }

      const created = await storage.createPatientWithUser(
        {
          name: input.name,
          age: input.age,
          gender: input.gender,
          phone: input.phone,
          emergencyContact: input.emergencyContact,
        },
        {
              username: input.username,
              password: hashPassword(input.username, input.password),
            },
      );

      await sendSmsMessage(
        input.phone,
        `BioTracker login credentials. Username: ${input.username} Password: ${input.password}`,
      );

      res.status(201).json({
        ...created,
        message: "Patient created. Login credentials sent to the patient.",
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Duplicate entry")) {
        return res.status(400).json({ message: "Username already exists." });
      }
      return handleZodError(res, error);
    }
  });

  app.put(api.patients.update.path, requireAdmin, async (req, res) => {
    try {
      const input = api.patients.update.input.parse({
        ...req.body,
        patientId: Number(req.params.patientId),
      });
      const updated = await storage.updatePatient(input.patientId, {
        name: input.name,
        age: input.age,
        gender: input.gender,
        phone: input.phone,
        emergencyContact: input.emergencyContact,
      });
      res.status(200).json(updated);
    } catch (error) {
      return handleZodError(res, error);
    }
  });

  app.delete(api.patients.delete.path, requireAdmin, async (req, res) => {
    try {
      const input = api.patients.delete.input.parse({
        patientId: Number(req.params.patientId),
      });
      await storage.deletePatient(input.patientId);
      res.status(200).json({ message: "Patient deleted." });
    } catch (error) {
      return handleZodError(res, error);
    }
  });

  app.get(api.doctors.list.path, requireAdmin, async (_req, res) => {
    res.status(200).json(await storage.getDoctors());
  });

  app.post(api.doctors.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.doctors.create.input.parse(req.body);
      const created = await storage.createDoctor(input);
      res.status(201).json(created);
    } catch (error) {
      return handleZodError(res, error);
    }
  });

  app.put(api.doctors.update.path, requireAdmin, async (req, res) => {
    try {
      const input = api.doctors.update.input.parse({
        ...req.body,
        doctorId: Number(req.params.doctorId),
      });
      const updated = await storage.updateDoctor(input.doctorId, {
        name: input.name,
        specialization: input.specialization,
        contact: input.contact,
      });
      res.status(200).json(updated);
    } catch (error) {
      return handleZodError(res, error);
    }
  });

  app.delete(api.doctors.delete.path, requireAdmin, async (req, res) => {
    try {
      const input = api.doctors.delete.input.parse({
        doctorId: Number(req.params.doctorId),
      });
      await storage.deleteDoctor(input.doctorId);
      res.status(200).json({ message: "Doctor deleted." });
    } catch (error) {
      return handleZodError(res, error);
    }
  });

  app.get(api.medicines.list.path, requireAuth, async (req, res) => {
    const patientId = getScopedPatientId(req.user);
    res.status(200).json(await storage.getMedicines(patientId));
  });

  app.post(api.medicines.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.medicines.create.input.parse(req.body);
      const created = await storage.createMedicine(input);
      res.status(201).json(created);
    } catch (error) {
      return handleZodError(res, error);
    }
  });

  app.get(api.billing.bills.list.path, requireAuth, async (req, res) => {
    const patientId = getScopedPatientId(req.user);
    res.status(200).json(await storage.getBills(patientId));
  });

  app.post(api.billing.bills.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.billing.bills.create.input.parse(req.body);
      const totalAmount = input.totalAmount ?? input.subtotal + (input.taxAmount ?? 0) - (input.discountAmount ?? 0);
      const paidAmount = input.paidAmount ?? 0;

      if ((input.discountAmount ?? 0) > input.subtotal + (input.taxAmount ?? 0)) {
        return res.status(400).json({ message: "Discount amount cannot exceed subtotal plus tax." });
      }

      if (paidAmount > totalAmount) {
        return res.status(400).json({ message: "Paid amount cannot be greater than total amount." });
      }
      const balanceAmount = input.balanceAmount ?? Math.max(totalAmount - paidAmount, 0);
      const paymentStatus = balanceAmount <= 0 ? "paid" : paidAmount > 0 ? "partial" : "pending";

      const created = await storage.createBill({
        ...input,
        taxAmount: String((input.taxAmount ?? 0).toFixed(2)),
        discountAmount: String((input.discountAmount ?? 0).toFixed(2)),
        subtotal: String(input.subtotal.toFixed(2)),
        totalAmount: String(totalAmount.toFixed(2)),
        paidAmount: String(paidAmount.toFixed(2)),
        balanceAmount: String(balanceAmount.toFixed(2)),
        paymentStatus,
      });
      res.status(201).json(created);
    } catch (error) {
      return handleZodError(res, error);
    }
  });

  app.put(api.billing.bills.update.path, requireAdmin, async (req, res) => {
    try {
      const input = api.billing.bills.update.input.parse({
        ...req.body,
        billId: Number(req.params.billId),
      });

      if ((input.discountAmount ?? 0) > input.subtotal + (input.taxAmount ?? 0)) {
        return res.status(400).json({ message: "Discount amount cannot exceed subtotal plus tax." });
      }

      if ((input.paidAmount ?? 0) > input.totalAmount) {
        return res.status(400).json({ message: "Paid amount cannot be greater than total amount." });
      }

      const updated = await storage.updateBill(input.billId, {
        billNumber: input.billNumber,
        patientId: input.patientId,
        doctorId: input.doctorId,
        prescriptionId: input.prescriptionId,
        dueDate: input.dueDate,
        subtotal: String(input.subtotal.toFixed(2)),
        taxAmount: String((input.taxAmount ?? 0).toFixed(2)),
        discountAmount: String((input.discountAmount ?? 0).toFixed(2)),
        totalAmount: String(input.totalAmount.toFixed(2)),
        paidAmount: input.paidAmount !== undefined ? String(input.paidAmount.toFixed(2)) : undefined,
        balanceAmount: input.balanceAmount !== undefined ? String(input.balanceAmount.toFixed(2)) : undefined,
        paymentStatus: input.paymentStatus,
        billingNotes: input.billingNotes,
      });
      res.status(200).json(updated);
    } catch (error) {
      return handleZodError(res, error);
    }
  });

  app.delete(api.billing.bills.delete.path, requireAdmin, async (req, res) => {
    try {
      const input = api.billing.bills.delete.input.parse({
        billId: Number(req.params.billId),
      });
      await storage.deleteBill(input.billId);
      res.status(200).json({ message: "Bill deleted." });
    } catch (error) {
      return handleZodError(res, error);
    }
  });

  app.get(api.billing.payments.list.path, requireAuth, async (req, res) => {
    const patientId = getScopedPatientId(req.user);
    res.status(200).json(await storage.getPaymentHistory(patientId));
  });

  app.post(api.billing.payments.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.billing.payments.create.input.parse(req.body);
      const currentBills = await storage.getBills();
      const targetBill = currentBills.find((bill) => bill.billId === input.billId);

      if (!targetBill) {
        return res.status(400).json({ message: "Bill not found" });
      }

      if (input.amountPaid > Number(targetBill.balanceAmount)) {
        return res.status(400).json({ message: "Paid amount cannot be greater than the remaining bill amount." });
      }

      const created = await storage.createPaymentHistory({
        ...input,
        amountPaid: String(input.amountPaid.toFixed(2)),
      });
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof Error && error.message === "Bill not found") {
        return res.status(400).json({ message: error.message });
      }
      return handleZodError(res, error);
    }
  });

  app.put(api.billing.payments.update.path, requireAdmin, async (req, res) => {
    try {
      const input = api.billing.payments.update.input.parse({
        ...req.body,
        paymentId: Number(req.params.paymentId),
      });
      const currentBills = await storage.getBills();
      const targetBill = currentBills.find((bill) => bill.billId === input.billId);

      if (!targetBill) {
        return res.status(400).json({ message: "Bill not found" });
      }

      if (input.amountPaid > Number(targetBill.totalAmount)) {
        return res.status(400).json({ message: "Paid amount cannot be greater than the bill amount." });
      }

      const updated = await storage.updatePaymentHistory(input.paymentId, {
        billId: input.billId,
        patientId: input.patientId,
        amountPaid: String(input.amountPaid.toFixed(2)),
        paymentMethod: input.paymentMethod,
        transactionReference: input.transactionReference,
        paymentStatus: input.paymentStatus,
        receivedBy: input.receivedBy,
        paymentNotes: input.paymentNotes,
      });
      res.status(200).json(updated);
    } catch (error) {
      return handleZodError(res, error);
    }
  });

  app.delete(api.billing.payments.delete.path, requireAdmin, async (req, res) => {
    try {
      const input = api.billing.payments.delete.input.parse({
        paymentId: Number(req.params.paymentId),
      });
      await storage.deletePaymentHistory(input.paymentId);
      res.status(200).json({ message: "Payment deleted." });
    } catch (error) {
      return handleZodError(res, error);
    }
  });

  app.get(api.healthRecords.list.path, requireAuth, async (req, res) => {
    const patientId = getScopedPatientId(req.user);
    res.status(200).json(await storage.getHealthRecords(patientId));
  });

  app.post(api.healthRecords.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.healthRecords.create.input.parse(req.body);
      const created = await storage.createHealthRecord({
        ...input,
        bloodSugar: input.bloodSugar !== undefined ? String(input.bloodSugar) : undefined,
        cholesterol: input.cholesterol !== undefined ? String(input.cholesterol) : undefined,
        oxygenSaturation: input.oxygenSaturation !== undefined ? String(input.oxygenSaturation) : undefined,
        bmi: input.bmi !== undefined ? String(input.bmi) : undefined,
      });

      broadcastHealthEvent({ type: "health-record-created", patientId: created.patientId });
      res.status(201).json(created);
    } catch (error) {
      return handleZodError(res, error);
    }
  });

  app.put(api.healthRecords.update.path, requireAdmin, async (req, res) => {
    try {
      const input = api.healthRecords.update.input.parse({
        ...req.body,
        recordId: Number(req.params.recordId),
      });

      const updated = await storage.updateHealthRecord(input.recordId, {
        patientId: input.patientId,
        bloodSugar: input.bloodSugar !== undefined ? String(input.bloodSugar) : undefined,
        bpSystolic: input.bpSystolic,
        bpDiastolic: input.bpDiastolic,
        cholesterol: input.cholesterol !== undefined ? String(input.cholesterol) : undefined,
        oxygenSaturation: input.oxygenSaturation !== undefined ? String(input.oxygenSaturation) : undefined,
        bmi: input.bmi !== undefined ? String(input.bmi) : undefined,
        notes: input.notes,
      });

      broadcastHealthEvent({ type: "health-record-created", patientId: updated.patientId });
      res.status(200).json(updated);
    } catch (error) {
      return handleZodError(res, error);
    }
  });

  app.get(api.alerts.list.path, requireAuth, async (req, res) => {
    const patientId = getScopedPatientId(req.user);
    res.status(200).json(await storage.getAlerts(patientId));
  });

  app.get("/api/alerts/update-status", requireAdmin, async (req, res) => {
    try {
      const input = api.alerts.updateStatus.input.parse(req.query);
      const updated = await storage.updateAlertStatus(input.alertId, input.status);
      res.status(200).json(updated);
    } catch (error) {
      return handleZodError(res, error);
    }
  });

  app.get(api.prescriptions.list.path, requireAuth, async (req, res) => {
    const patientId = getScopedPatientId(req.user);
    res.status(200).json(await storage.getPrescriptions(patientId));
  });

  app.post(api.prescriptions.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.prescriptions.create.input.parse(req.body);
      const created = await storage.createPrescription(input.prescription, input.medicines);
      res.status(201).json(created);
    } catch (error) {
      return handleZodError(res, error);
    }
  });

  app.put(api.prescriptions.update.path, requireAdmin, async (req, res) => {
    try {
      const input = api.prescriptions.update.input.parse({
        ...req.body,
        prescriptionId: Number(req.params.prescriptionId),
      });
      const updated = await storage.updatePrescription(
        input.prescriptionId,
        input.prescription,
        input.medicines,
      );
      res.status(200).json(updated);
    } catch (error) {
      return handleZodError(res, error);
    }
  });

  app.delete(api.prescriptions.delete.path, requireAdmin, async (req, res) => {
    try {
      const input = api.prescriptions.delete.input.parse({
        prescriptionId: Number(req.params.prescriptionId),
      });
      await storage.deletePrescription(input.prescriptionId);
      res.status(200).json({ message: "Prescription deleted." });
    } catch (error) {
      return handleZodError(res, error);
    }
  });

  app.get(api.views.patientPrescriptions.path, requireAuth, async (req, res) => {
    const patientId = getScopedPatientId(req.user);
    res.status(200).json(await storage.getPatientPrescriptionsView(patientId));
  });

  app.get(api.views.patientHealth.path, requireAuth, async (req, res) => {
    const patientId = getScopedPatientId(req.user);
    res.status(200).json(await storage.getPatientHealthView(patientId));
  });

  app.get(api.views.pendingAlerts.path, requireAuth, async (req, res) => {
    const patientId = getScopedPatientId(req.user);
    res.status(200).json(await storage.getPendingAlertsView(patientId));
  });

  app.get(api.views.healthRisk.path, requireAuth, async (req, res) => {
    const patientId = getScopedPatientId(req.user);
    res.status(200).json(await storage.getHealthRiskView(patientId));
  });

  if (!isProduction) {
    app.post(api.dev.seed.path, async (_req, res) => {
      const seeded = await storage.seedDemoData();
      if (seeded) {
        broadcastHealthEvent({ type: "seed-complete" });
      }
      res.status(200).json({
        message: seeded ? "Demo data seeded successfully" : "Demo data already present",
        seeded,
      });
    });

    app.get(api.dev.mockSms.path, (_req, res) => {
      res.status(200).json(mockSmsInbox);
    });
  }

  return httpServer;
}



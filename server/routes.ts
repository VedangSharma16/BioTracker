import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import connectPg from "connect-pg-simple";
import { pool, db } from "./db";
import { users, patients, doctors, healthRecords, alerts, prescriptions, medicines } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const PostgresStore = connectPg(session);
  const store = new PostgresStore({ pool, createTableIfMissing: true });

  app.use(session({
    secret: process.env.SESSION_SECRET || "health_tracker_secret",
    resave: false,
    saveUninitialized: false,
    store,
    cookie: { secure: false }
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return done(null, false, { message: "Invalid username or password" });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser((user: any, done) => done(null, user.userId));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Middleware to ensure user is logged in
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) return next();
    if (req.path.startsWith('/api')) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    // For non-API routes, let them pass through to static/vite handler
    next();
  };

  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated() && (req.user as any).role === "admin") return next();
    res.status(403).json({ message: "Forbidden" });
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

  app.get(api.auth.me.path, requireAuth, (req, res) => {
    res.status(200).json(req.user);
  });

  app.get(api.dashboard.stats.path, requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.status(200).json(stats);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.patients.list.path, requireAuth, async (req, res) => {
    const data = await storage.getPatients();
    res.status(200).json(data);
  });

  app.get(api.doctors.list.path, requireAuth, async (req, res) => {
    const data = await storage.getDoctors();
    res.status(200).json(data);
  });

  app.get(api.healthRecords.list.path, requireAuth, async (req, res) => {
    const user = req.user as any;
    const patientId = user.role === 'patient' ? user.patientId : undefined;
    const data = await storage.getHealthRecords(patientId);
    res.status(200).json(data);
  });

  app.post(api.healthRecords.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.healthRecords.create.input.parse(req.body);
      const created = await storage.createHealthRecord(input);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.alerts.list.path, requireAuth, async (req, res) => {
    const user = req.user as any;
    const patientId = user.role === 'patient' ? user.patientId : undefined;
    const data = await storage.getAlerts(patientId);
    res.status(200).json(data);
  });

  app.get(api.prescriptions.list.path, requireAuth, async (req, res) => {
    const user = req.user as any;
    const patientId = user.role === 'patient' ? user.patientId : undefined;
    const data = await storage.getPrescriptions(patientId);
    res.status(200).json(data);
  });

  app.post(api.prescriptions.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.prescriptions.create.input.parse(req.body);
      const created = await storage.createPrescription(input.prescription, input.medicines);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Seed database
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingUsers = await storage.getPatients();
  if (existingUsers.length === 0) {
    const [patient1] = await db.insert(patients).values({ name: "John Doe", age: 45, gender: "Male", phone: "555-1234", emergencyContact: "Jane Doe" }).returning();
    const [patient2] = await db.insert(patients).values({ name: "Alice Smith", age: 32, gender: "Female", phone: "555-5678", emergencyContact: "Bob Smith" }).returning();
    
    const [doctor1] = await db.insert(doctors).values({ name: "Dr. Gregory House", specialization: "Internal Medicine", contact: "555-9999" }).returning();
    
    // Create admin user and patient user
    await db.insert(users).values({ username: "admin", password: "password", role: "admin" });
    await db.insert(users).values({ username: "john", password: "password", role: "patient", patientId: patient1.patientId });
    await db.insert(users).values({ username: "alice", password: "password", role: "patient", patientId: patient2.patientId });

    await db.insert(healthRecords).values([
      { patientId: patient1.patientId, bpSystolic: 120, bpDiastolic: 80, bloodSugar: "95.5", notes: "Normal checkup" },
      { patientId: patient2.patientId, bpSystolic: 135, bpDiastolic: 88, bloodSugar: "105.0", notes: "Slightly elevated BP" }
    ]);

    await db.insert(alerts).values([
      { patientId: patient2.patientId, alertType: "High Blood Pressure", alertMessage: "Patient BP is 135/88, monitor closely." }
    ]);

    const [rx] = await db.insert(prescriptions).values({ patientId: patient2.patientId, doctorId: doctor1.doctorId }).returning();
    await db.insert(medicines).values({ prescriptionId: rx.prescriptionId, medicineName: "Lisinopril", dosage: "10mg", frequency: "Daily", refillIntervalDays: 30 });
  }
}

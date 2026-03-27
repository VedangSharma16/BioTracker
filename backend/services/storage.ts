import { and, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../config/db";
import { hashPassword } from "../security/password";
import {
  alerts,
  bills,
  doctors,
  healthRecords,
  medicines,
  paymentHistory,
  patients,
  prescriptions,
  refills,
  users,
  type Alert,
  type Bill,
  type Doctor,
  type HealthRecord,
  type InsertAlert,
  type InsertBill,
  type InsertDoctor,
  type InsertHealthRecord,
  type InsertMedicine,
  type InsertPaymentHistory,
  type InsertPatient,
  type InsertPrescription,
  type InsertUser,
  type Medicine,
  type PaymentHistory,
  type Patient,
  type Prescription,
  type User,
} from "../../database/schema";

type DashboardStats = {
  avgSystolic: number | null;
  avgDiastolic: number | null;
  avgBloodSugar: number | null;
  avgCholesterol: number | null;
  avgOxygenSaturation: number | null;
  avgBmi: number | null;
  activeAlerts: number;
  patientCount: number;
  doctorCount: number;
  highAlertPatients: number;
  topDoctorName: string | null;
  highestRefillMedicineName: string | null;
  highestRefillCost: number | null;
};

type PatientListItem = Patient & {
  username: string | null;
};

type PatientPrescriptionView = {
  prescriptionId: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  prescriptionDate: Date;
};

type PatientHealthView = {
  recordId: number;
  patientId: number;
  patientName: string;
  recordDate: Date;
  bloodSugar: string | number | null;
  bpSystolic: number | null;
  bpDiastolic: number | null;
  cholesterol: string | number | null;
  oxygenSaturation: string | number | null;
  bmi: string | number | null;
  notes: string | null;
};

type PendingAlertView = {
  alertId: number;
  patientId: number;
  patientName: string;
  alertType: string;
  alertMessage: string;
  alertDate: Date;
  status: string;
};

type MedicineView = {
  medicineId: number;
  prescriptionId: number;
  patientId: number;
  patientName: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  refillIntervalDays: number | null;
};

type BillView = {
  billId: number;
  billNumber: string;
  patientId: number;
  patientName: string;
  doctorId: number | null;
  doctorName: string | null;
  prescriptionId: number | null;
  billingDate: Date;
  dueDate: Date | null;
  subtotal: string | number;
  taxAmount: string | number;
  discountAmount: string | number;
  totalAmount: string | number;
  paidAmount: string | number;
  balanceAmount: string | number;
  paymentStatus: string;
  billingNotes: string | null;
};

type PaymentHistoryView = {
  paymentId: number;
  billId: number;
  billNumber: string;
  patientId: number;
  patientName: string;
  paymentDate: Date;
  amountPaid: string | number;
  paymentMethod: string;
  transactionReference: string | null;
  paymentStatus: string;
  receivedBy: string | null;
  paymentNotes: string | null;
};

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  return typeof value === "number" ? value : Number(value);
}

async function getLastInsertId(tx: any) {
  const result = await tx.execute(sql.raw("SELECT LAST_INSERT_ID() AS id"));
  const firstRow = Array.isArray(result)
    ? Array.isArray(result[0])
      ? result[0][0]
      : result[0]
    : Array.isArray(result?.rows)
      ? result.rows[0]
      : result?.[0];
  const insertId = Number(firstRow?.id ?? firstRow?.insertId);

  if (!Number.isFinite(insertId)) {
    throw new Error("Unable to resolve last insert id");
  }

  return insertId;
}

function buildAlerts(record: InsertHealthRecord): InsertAlert[] {
  const alertsToCreate: InsertAlert[] = [];
  const bloodSugar = toNumber(record.bloodSugar as string | number | undefined);
  const bpSystolic = toNumber(record.bpSystolic);
  const cholesterol = toNumber(record.cholesterol as string | number | undefined);
  const oxygenSaturation = toNumber(record.oxygenSaturation as string | number | undefined);
  const bmi = toNumber(record.bmi as string | number | undefined);

  if (bloodSugar !== null && bloodSugar > 180) {
    alertsToCreate.push({
      patientId: record.patientId,
      alertType: "Sugar Alert",
      alertMessage: "Blood sugar level is high",
      status: "pending",
    });
  }

  if (bpSystolic !== null && bpSystolic > 140) {
    alertsToCreate.push({
      patientId: record.patientId,
      alertType: "BP Alert",
      alertMessage: "Blood pressure is above normal",
      status: "pending",
    });
  }

  if (cholesterol !== null && cholesterol > 200) {
    alertsToCreate.push({
      patientId: record.patientId,
      alertType: "Cholesterol Alert",
      alertMessage: "Cholesterol level is high",
      status: "pending",
    });
  }

  if (oxygenSaturation !== null && oxygenSaturation < 95) {
    alertsToCreate.push({
      patientId: record.patientId,
      alertType: "Oxygen Alert",
      alertMessage: "Oxygen saturation is low",
      status: "pending",
    });
  }

  if (bmi !== null && bmi > 25) {
    alertsToCreate.push({
      patientId: record.patientId,
      alertType: "BMI Alert",
      alertMessage: "BMI is above normal",
      status: "pending",
    });
  }

  return alertsToCreate;
}

async function deletePrescriptionDependencies(tx: any, prescriptionId: number) {
  const prescriptionMedicines = await tx
    .select({ medicineId: medicines.medicineId })
    .from(medicines)
    .where(eq(medicines.prescriptionId, prescriptionId));

  const medicineIds = prescriptionMedicines.map((medicine: { medicineId: number }) => medicine.medicineId);

  await tx
    .update(bills)
    .set({ prescriptionId: null })
    .where(eq(bills.prescriptionId, prescriptionId));

  if (medicineIds.length > 0) {
    await tx.delete(refills).where(inArray(refills.medicineId, medicineIds));
  }

  await tx.delete(medicines).where(eq(medicines.prescriptionId, prescriptionId));
  await tx.delete(prescriptions).where(eq(prescriptions.prescriptionId, prescriptionId));
}

export interface IStorage {
  getPatient(id: number): Promise<Patient | undefined>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByPatientId(patientId: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(userId: number, password: string): Promise<User>;
  recordFailedLoginAttempt(userId: number): Promise<User>;
  resetFailedLoginAttempts(userId: number): Promise<User>;
  getPatientByPhone(phone: string): Promise<Patient | undefined>;
  getDashboardStats(): Promise<DashboardStats>;
  getPatients(): Promise<PatientListItem[]>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  createPatientWithUser(patient: InsertPatient, credentials?: Pick<InsertUser, "username" | "password">): Promise<Patient>;
  updatePatient(patientId: number, patient: InsertPatient, credentials?: Partial<Pick<InsertUser, "username" | "password">>): Promise<PatientListItem>;
  deletePatient(patientId: number): Promise<void>;
  getDoctors(): Promise<Doctor[]>;
  createDoctor(doctor: InsertDoctor): Promise<Doctor>;
  updateDoctor(doctorId: number, doctor: InsertDoctor): Promise<Doctor>;
  deleteDoctor(doctorId: number): Promise<void>;
  getMedicines(patientId?: number): Promise<MedicineView[]>;
  createMedicine(medicine: InsertMedicine & { prescriptionId: number }): Promise<Medicine>;
  getBills(patientId?: number): Promise<BillView[]>;
  createBill(bill: InsertBill & { billingDate?: Date }): Promise<Bill>;
  updateBill(billId: number, bill: Partial<InsertBill>): Promise<Bill>;
  deleteBill(billId: number): Promise<void>;
  getPaymentHistory(patientId?: number): Promise<PaymentHistoryView[]>;
  createPaymentHistory(payment: InsertPaymentHistory & { paymentDate?: Date }): Promise<PaymentHistory>;
  updatePaymentHistory(paymentId: number, payment: Partial<InsertPaymentHistory>): Promise<PaymentHistory>;
  deletePaymentHistory(paymentId: number): Promise<void>;
  getHealthRecords(patientId?: number): Promise<PatientHealthView[]>;
  createHealthRecord(record: InsertHealthRecord & { recordDate?: Date }): Promise<HealthRecord>;
  updateHealthRecord(recordId: number, record: InsertHealthRecord): Promise<HealthRecord>;
  getAlerts(patientId?: number): Promise<(Alert & { patientName?: string | null })[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  updateAlertStatus(alertId: number, status: string): Promise<Alert>;
  getPrescriptions(patientId?: number): Promise<(Prescription & { patientName?: string | null; doctorName?: string | null; medicines: Medicine[] })[]>;
  createPrescription(prescription: InsertPrescription, meds: InsertMedicine[]): Promise<Prescription>;
  updatePrescription(prescriptionId: number, prescription: InsertPrescription, meds: InsertMedicine[]): Promise<Prescription>;
  deletePrescription(prescriptionId: number): Promise<void>;
  getPatientPrescriptionsView(patientId?: number): Promise<PatientPrescriptionView[]>;
  getPatientHealthView(patientId?: number): Promise<PatientHealthView[]>;
  getPendingAlertsView(patientId?: number): Promise<PendingAlertView[]>;
  getHealthRiskView(patientId?: number): Promise<PatientHealthView[]>;
  seedDemoData(): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.patientId, id));
    return patient;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.userId, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByPatientId(patientId: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.patientId, patientId));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return db.transaction(async (tx) => {
      await tx.insert(users).values(insertUser);
      const userId = await getLastInsertId(tx);
      const [created] = await tx.select().from(users).where(eq(users.userId, userId));
      return created;
    });
  }

  async updateUserPassword(userId: number, password: string): Promise<User> {
    await db.update(users).set({ password, failedLoginAttempts: 0, lockedAt: null }).where(eq(users.userId, userId));
    const [updated] = await db.select().from(users).where(eq(users.userId, userId));
    return updated;
  }

  async recordFailedLoginAttempt(userId: number): Promise<User> {
    const [current] = await db.select().from(users).where(eq(users.userId, userId));
    if (!current) {
      throw new Error("User not found");
    }

    const nextAttempts = (current.failedLoginAttempts ?? 0) + 1;
    const shouldLock = nextAttempts >= 5;

    await db.update(users).set({ failedLoginAttempts: nextAttempts, lockedAt: shouldLock ? new Date() : current.lockedAt ?? null }).where(eq(users.userId, userId));
    const [updated] = await db.select().from(users).where(eq(users.userId, userId));
    return updated;
  }

  async resetFailedLoginAttempts(userId: number): Promise<User> {
    await db.update(users).set({ failedLoginAttempts: 0, lockedAt: null }).where(eq(users.userId, userId));
    const [updated] = await db.select().from(users).where(eq(users.userId, userId));
    return updated;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const [metricRow] = await db
      .select({
        avgSystolic: sql<number>`avg(${healthRecords.bpSystolic})`,
        avgDiastolic: sql<number>`avg(${healthRecords.bpDiastolic})`,
        avgBloodSugar: sql<number>`avg(${healthRecords.bloodSugar})`,
        avgCholesterol: sql<number>`avg(${healthRecords.cholesterol})`,
        avgOxygenSaturation: sql<number>`avg(${healthRecords.oxygenSaturation})`,
        avgBmi: sql<number>`avg(${healthRecords.bmi})`,
      })
      .from(healthRecords);

    const [{ count: activeAlerts }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(alerts)
      .where(eq(alerts.status, "pending"));

    const [{ count: patientCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(patients);

    const [{ count: doctorCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(doctors);

    const highAlertPatients = await db
      .select({
        patientId: alerts.patientId,
      })
      .from(alerts)
      .groupBy(alerts.patientId)
      .having(gt(sql<number>`count(${alerts.alertId})`, 1));

    const [topDoctor] = await db
      .select({
        name: doctors.name,
        prescriptionCount: sql<number>`count(${prescriptions.prescriptionId})`,
      })
      .from(prescriptions)
      .innerJoin(doctors, eq(prescriptions.doctorId, doctors.doctorId))
      .groupBy(doctors.doctorId, doctors.name)
      .orderBy(desc(sql`count(${prescriptions.prescriptionId})`))
      .limit(1);

    const [highestRefill] = await db
      .select({
        medicineName: medicines.medicineName,
        cost: refills.cost,
      })
      .from(refills)
      .innerJoin(medicines, eq(refills.medicineId, medicines.medicineId))
      .orderBy(desc(refills.cost))
      .limit(1);

    return {
      avgSystolic: metricRow?.avgSystolic ? Number(metricRow.avgSystolic) : null,
      avgDiastolic: metricRow?.avgDiastolic ? Number(metricRow.avgDiastolic) : null,
      avgBloodSugar: metricRow?.avgBloodSugar ? Number(metricRow.avgBloodSugar) : null,
      avgCholesterol: metricRow?.avgCholesterol ? Number(metricRow.avgCholesterol) : null,
      avgOxygenSaturation: metricRow?.avgOxygenSaturation ? Number(metricRow.avgOxygenSaturation) : null,
      avgBmi: metricRow?.avgBmi ? Number(metricRow.avgBmi) : null,
      activeAlerts: Number(activeAlerts),
      patientCount: Number(patientCount),
      doctorCount: Number(doctorCount),
      highAlertPatients: highAlertPatients.length,
      topDoctorName: topDoctor?.name ?? null,
      highestRefillMedicineName: highestRefill?.medicineName ?? null,
      highestRefillCost: highestRefill?.cost ? Number(highestRefill.cost) : null,
    };
  }

  async getPatients(): Promise<PatientListItem[]> {
    return db
      .select({
        patientId: patients.patientId,
        name: patients.name,
        age: patients.age,
        gender: patients.gender,
        phone: patients.phone,
        emergencyContact: patients.emergencyContact,
        username: users.username,
      })
      .from(patients)
      .leftJoin(users, eq(users.patientId, patients.patientId))
      .orderBy(patients.name);
  }

  async getPatientByPhone(phone: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.phone, phone));
    return patient;
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    return db.transaction(async (tx) => {
      await tx.insert(patients).values(patient);
      const patientId = await getLastInsertId(tx);
      const [created] = await tx.select().from(patients).where(eq(patients.patientId, patientId));
      return created;
    });
  }

  async createPatientWithUser(patient: InsertPatient, credentials?: Pick<InsertUser, "username" | "password">): Promise<Patient> {
    return db.transaction(async (tx) => {
      await tx.insert(patients).values(patient);
      const patientId = await getLastInsertId(tx);

      if (credentials?.username && credentials?.password) {
        await tx.insert(users).values({
          username: credentials.username,
          password: credentials.password,
          role: "patient",
          patientId,
        });
      }

      const [created] = await tx.select().from(patients).where(eq(patients.patientId, patientId));
      return created;
    });
  }

﻿  async updatePatient(
    patientId: number,
    patient: InsertPatient,
    credentials?: Partial<Pick<InsertUser, "username" | "password">>,
  ): Promise<PatientListItem> {
    return db.transaction(async (tx) => {
      await tx.update(patients).set(patient).where(eq(patients.patientId, patientId));

      const [existingUser] = await tx.select().from(users).where(eq(users.patientId, patientId));
      const nextUsername = credentials?.username?.trim();
      const nextPassword = credentials?.password?.trim();

      if (existingUser) {
        if (nextUsername && nextUsername !== existingUser.username && !nextPassword) {
          throw new Error("Enter a new password when changing the username.");
        }

        if (nextUsername || nextPassword) {
          const finalUsername = nextUsername || existingUser.username;
          const updates: Partial<InsertUser> & {
            failedLoginAttempts?: number;
            lockedAt?: Date | null;
          } = {};

          if (nextUsername) {
            updates.username = nextUsername;
          }

          if (nextPassword) {
            updates.password = hashPassword(finalUsername, nextPassword);
            updates.failedLoginAttempts = 0;
            updates.lockedAt = null;
          }

          await tx.update(users).set(updates).where(eq(users.userId, existingUser.userId));
        }
      } else if (nextUsername || nextPassword) {
        if (!nextUsername || !nextPassword) {
          throw new Error("Username and password are both required to create patient login access.");
        }

        await tx.insert(users).values({
          username: nextUsername,
          password: hashPassword(nextUsername, nextPassword),
          role: "patient",
          patientId,
        });
      }

      const [updated] = await tx
        .select({
          patientId: patients.patientId,
          name: patients.name,
          age: patients.age,
          gender: patients.gender,
          phone: patients.phone,
          emergencyContact: patients.emergencyContact,
          username: users.username,
        })
        .from(patients)
        .leftJoin(users, eq(users.patientId, patients.patientId))
        .where(eq(patients.patientId, patientId));

      return updated;
    });
  }

  async deletePatient(patientId: number): Promise<void> {
    await db.transaction(async (tx) => {
      const patientPrescriptions = await tx
        .select({ prescriptionId: prescriptions.prescriptionId })
        .from(prescriptions)
        .where(eq(prescriptions.patientId, patientId));

      for (const prescription of patientPrescriptions) {
        await deletePrescriptionDependencies(tx, prescription.prescriptionId);
      }

      await tx.delete(paymentHistory).where(eq(paymentHistory.patientId, patientId));
      await tx.delete(bills).where(eq(bills.patientId, patientId));
      await tx.delete(alerts).where(eq(alerts.patientId, patientId));
      await tx.delete(healthRecords).where(eq(healthRecords.patientId, patientId));
      await tx.delete(users).where(eq(users.patientId, patientId));
      await tx.delete(patients).where(eq(patients.patientId, patientId));
    });
  }

  async getDoctors(): Promise<Doctor[]> {
    return db.select().from(doctors).orderBy(doctors.name);
  }

  async createDoctor(doctor: InsertDoctor): Promise<Doctor> {
    return db.transaction(async (tx) => {
      await tx.insert(doctors).values(doctor);
      const doctorId = await getLastInsertId(tx);
      const [created] = await tx.select().from(doctors).where(eq(doctors.doctorId, doctorId));
      return created;
    });
  }

  async updateDoctor(doctorId: number, doctor: InsertDoctor): Promise<Doctor> {
    await db.update(doctors).set(doctor).where(eq(doctors.doctorId, doctorId));
    const [updated] = await db.select().from(doctors).where(eq(doctors.doctorId, doctorId));
    return updated;
  }

  async deleteDoctor(doctorId: number): Promise<void> {
    await db.transaction(async (tx) => {
      const doctorPrescriptions = await tx
        .select({ prescriptionId: prescriptions.prescriptionId })
        .from(prescriptions)
        .where(eq(prescriptions.doctorId, doctorId));

      for (const prescription of doctorPrescriptions) {
        await deletePrescriptionDependencies(tx, prescription.prescriptionId);
      }

      await tx
        .update(bills)
        .set({ doctorId: null })
        .where(eq(bills.doctorId, doctorId));

      await tx.delete(doctors).where(eq(doctors.doctorId, doctorId));
    });
  }

  async getMedicines(patientId?: number): Promise<MedicineView[]> {
    let query = db
      .select({
        medicineId: medicines.medicineId,
        prescriptionId: medicines.prescriptionId,
        patientId: prescriptions.patientId,
        patientName: patients.name,
        medicineName: medicines.medicineName,
        dosage: medicines.dosage,
        frequency: medicines.frequency,
        refillIntervalDays: medicines.refillIntervalDays,
      })
      .from(medicines)
      .innerJoin(prescriptions, eq(medicines.prescriptionId, prescriptions.prescriptionId))
      .innerJoin(patients, eq(prescriptions.patientId, patients.patientId));

    if (patientId) {
      query = query.where(eq(prescriptions.patientId, patientId)) as typeof query;
    }

    return query.orderBy(patients.name, medicines.medicineName);
  }

  async createMedicine(medicine: InsertMedicine & { prescriptionId: number }): Promise<Medicine> {
    return db.transaction(async (tx) => {
      await tx.insert(medicines).values(medicine);
      const medicineId = await getLastInsertId(tx);
      const [created] = await tx.select().from(medicines).where(eq(medicines.medicineId, medicineId));
      return created;
    });
  }

  async getBills(patientId?: number): Promise<BillView[]> {
    let query = db
      .select({
        billId: bills.billId,
        billNumber: bills.billNumber,
        patientId: bills.patientId,
        patientName: patients.name,
        doctorId: bills.doctorId,
        doctorName: doctors.name,
        prescriptionId: bills.prescriptionId,
        billingDate: bills.billingDate,
        dueDate: bills.dueDate,
        subtotal: bills.subtotal,
        taxAmount: bills.taxAmount,
        discountAmount: bills.discountAmount,
        totalAmount: bills.totalAmount,
        paidAmount: bills.paidAmount,
        balanceAmount: bills.balanceAmount,
        paymentStatus: bills.paymentStatus,
        billingNotes: bills.billingNotes,
      })
      .from(bills)
      .innerJoin(patients, eq(bills.patientId, patients.patientId))
      .leftJoin(doctors, eq(bills.doctorId, doctors.doctorId));

    if (patientId) {
      query = query.where(eq(bills.patientId, patientId)) as typeof query;
    }

    return query.orderBy(desc(bills.billingDate));
  }

  async createBill(bill: InsertBill & { billingDate?: Date }): Promise<Bill> {
    return db.transaction(async (tx) => {
      await tx.insert(bills).values(bill);
      const billId = await getLastInsertId(tx);
      const [created] = await tx.select().from(bills).where(eq(bills.billId, billId));
      return created;
    });
  }

  async updateBill(billId: number, bill: Partial<InsertBill>): Promise<Bill> {
    await db.update(bills).set(bill).where(eq(bills.billId, billId));
    const [updated] = await db.select().from(bills).where(eq(bills.billId, billId));
    return updated;
  }

  async deleteBill(billId: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(paymentHistory).where(eq(paymentHistory.billId, billId));
      await tx.delete(bills).where(eq(bills.billId, billId));
    });
  }

  async getPaymentHistory(patientId?: number): Promise<PaymentHistoryView[]> {
    let query = db
      .select({
        paymentId: paymentHistory.paymentId,
        billId: paymentHistory.billId,
        billNumber: bills.billNumber,
        patientId: paymentHistory.patientId,
        patientName: patients.name,
        paymentDate: paymentHistory.paymentDate,
        amountPaid: paymentHistory.amountPaid,
        paymentMethod: paymentHistory.paymentMethod,
        transactionReference: paymentHistory.transactionReference,
        paymentStatus: paymentHistory.paymentStatus,
        receivedBy: paymentHistory.receivedBy,
        paymentNotes: paymentHistory.paymentNotes,
      })
      .from(paymentHistory)
      .innerJoin(bills, eq(paymentHistory.billId, bills.billId))
      .innerJoin(patients, eq(paymentHistory.patientId, patients.patientId));

    if (patientId) {
      query = query.where(eq(paymentHistory.patientId, patientId)) as typeof query;
    }

    return query.orderBy(desc(paymentHistory.paymentDate));
  }

  async createPaymentHistory(payment: InsertPaymentHistory & { paymentDate?: Date }): Promise<PaymentHistory> {
    return db.transaction(async (tx) => {
      const [bill] = await tx.select().from(bills).where(eq(bills.billId, payment.billId));
      if (!bill) {
        throw new Error("Bill not found");
      }

      const currentPaidAmount = toNumber(bill.paidAmount) ?? 0;
      const totalAmount = toNumber(bill.totalAmount) ?? 0;
      const paymentAmount = toNumber(payment.amountPaid as string | number | undefined) ?? 0;
      const nextPaidAmount = currentPaidAmount + paymentAmount;
      const nextBalanceAmount = Math.max(totalAmount - nextPaidAmount, 0);
      const nextStatus = nextBalanceAmount <= 0 ? "paid" : nextPaidAmount > 0 ? "partial" : "pending";

      await tx.insert(paymentHistory).values(payment);
      const paymentId = await getLastInsertId(tx);

      await tx
        .update(bills)
        .set({
          paidAmount: String(nextPaidAmount.toFixed(2)),
          balanceAmount: String(nextBalanceAmount.toFixed(2)),
          paymentStatus: nextStatus,
        })
        .where(eq(bills.billId, payment.billId));

      const [created] = await tx.select().from(paymentHistory).where(eq(paymentHistory.paymentId, paymentId));
      return created;
    });
  }


  async updatePaymentHistory(paymentId: number, payment: Partial<InsertPaymentHistory>): Promise<PaymentHistory> {
    await db.update(paymentHistory).set(payment).where(eq(paymentHistory.paymentId, paymentId));
    const [updated] = await db.select().from(paymentHistory).where(eq(paymentHistory.paymentId, paymentId));
    return updated;
  }

  async deletePaymentHistory(paymentId: number): Promise<void> {
    await db.delete(paymentHistory).where(eq(paymentHistory.paymentId, paymentId));
  }
  async getHealthRecords(patientId?: number): Promise<PatientHealthView[]> {
    return this.getPatientHealthView(patientId);
  }

  async createHealthRecord(record: InsertHealthRecord & { recordDate?: Date }): Promise<HealthRecord> {
    return db.transaction(async (tx) => {
      await tx.insert(healthRecords).values(record);
      const recordId = await getLastInsertId(tx);
      const generatedAlerts = buildAlerts(record);

      if (generatedAlerts.length > 0) {
        await tx.insert(alerts).values(generatedAlerts);
      }

      const [created] = await tx.select().from(healthRecords).where(eq(healthRecords.recordId, recordId));
      return created;
    });
  }

  async updateHealthRecord(recordId: number, record: InsertHealthRecord): Promise<HealthRecord> {
    await db
      .update(healthRecords)
      .set(record)
      .where(eq(healthRecords.recordId, recordId));

    const [updated] = await db
      .select()
      .from(healthRecords)
      .where(eq(healthRecords.recordId, recordId));

    return updated;
  }

  async getAlerts(patientId?: number) {
    let query = db
      .select({
        alertId: alerts.alertId,
        patientId: alerts.patientId,
        alertType: alerts.alertType,
        alertMessage: alerts.alertMessage,
        alertDate: alerts.alertDate,
        status: alerts.status,
        patientName: patients.name,
      })
      .from(alerts)
      .leftJoin(patients, eq(alerts.patientId, patients.patientId));

    if (patientId) {
      query = query.where(eq(alerts.patientId, patientId)) as typeof query;
    }

    return query.orderBy(desc(alerts.alertDate));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    return db.transaction(async (tx) => {
      await tx.insert(alerts).values(alert);
      const alertId = await getLastInsertId(tx);
      const [created] = await tx.select().from(alerts).where(eq(alerts.alertId, alertId));
      return created;
    });
  }

  async updateAlertStatus(alertId: number, status: string): Promise<Alert> {
    await db.update(alerts).set({ status }).where(eq(alerts.alertId, alertId));
    const [updated] = await db.select().from(alerts).where(eq(alerts.alertId, alertId));
    return updated;
  }

  async getPrescriptions(patientId?: number) {
    let query = db
      .select({
        prescriptionId: prescriptions.prescriptionId,
        patientId: prescriptions.patientId,
        doctorId: prescriptions.doctorId,
        prescriptionDate: prescriptions.prescriptionDate,
        patientName: patients.name,
        doctorName: doctors.name,
      })
      .from(prescriptions)
      .leftJoin(patients, eq(prescriptions.patientId, patients.patientId))
      .leftJoin(doctors, eq(prescriptions.doctorId, doctors.doctorId));

    if (patientId) {
      query = query.where(eq(prescriptions.patientId, patientId)) as typeof query;
    }

    const rows = await query.orderBy(desc(prescriptions.prescriptionDate));
    const medicationRows = await db.select().from(medicines);

    return rows.map((row) => ({
      ...row,
      medicines: medicationRows.filter((medicine) => medicine.prescriptionId === row.prescriptionId),
    }));
  }

  async createPrescription(prescription: InsertPrescription, meds: InsertMedicine[]): Promise<Prescription> {
    return db.transaction(async (tx) => {
      await tx.insert(prescriptions).values(prescription);
      const prescriptionId = await getLastInsertId(tx);
      if (meds.length > 0) {
        await tx.insert(medicines).values(
          meds.map((medicine) => ({
            ...medicine,
            prescriptionId,
          })),
        );
      }

      const [created] = await tx.select().from(prescriptions).where(eq(prescriptions.prescriptionId, prescriptionId));
      return created;
    });
  }

  async updatePrescription(prescriptionId: number, prescription: InsertPrescription, meds: InsertMedicine[]): Promise<Prescription> {
    return db.transaction(async (tx) => {
      await tx
        .update(prescriptions)
        .set({
          patientId: prescription.patientId,
          doctorId: prescription.doctorId,
        })
        .where(eq(prescriptions.prescriptionId, prescriptionId));

      await tx.delete(medicines).where(eq(medicines.prescriptionId, prescriptionId));

      if (meds.length > 0) {
        await tx.insert(medicines).values(
          meds.map((medicine) => ({
            ...medicine,
            prescriptionId,
          })),
        );
      }

      const [updated] = await tx.select().from(prescriptions).where(eq(prescriptions.prescriptionId, prescriptionId));
      return updated;
    });
  }

  async deletePrescription(prescriptionId: number): Promise<void> {
    await db.transaction(async (tx) => {
      await deletePrescriptionDependencies(tx, prescriptionId);
    });
  }

  async getPatientPrescriptionsView(patientId?: number): Promise<PatientPrescriptionView[]> {
    let query = db
      .select({
        prescriptionId: prescriptions.prescriptionId,
        patientId: patients.patientId,
        patientName: patients.name,
        doctorId: doctors.doctorId,
        doctorName: doctors.name,
        prescriptionDate: prescriptions.prescriptionDate,
      })
      .from(prescriptions)
      .innerJoin(patients, eq(prescriptions.patientId, patients.patientId))
      .innerJoin(doctors, eq(prescriptions.doctorId, doctors.doctorId));

    if (patientId) {
      query = query.where(eq(patients.patientId, patientId)) as typeof query;
    }

    return query.orderBy(desc(prescriptions.prescriptionDate));
  }

  async getPatientHealthView(patientId?: number): Promise<PatientHealthView[]> {
    let query = db
      .select({
        recordId: healthRecords.recordId,
        patientId: healthRecords.patientId,
        patientName: patients.name,
        recordDate: healthRecords.recordDate,
        bloodSugar: healthRecords.bloodSugar,
        bpSystolic: healthRecords.bpSystolic,
        bpDiastolic: healthRecords.bpDiastolic,
        cholesterol: healthRecords.cholesterol,
        oxygenSaturation: healthRecords.oxygenSaturation,
        bmi: healthRecords.bmi,
        notes: healthRecords.notes,
      })
      .from(healthRecords)
      .innerJoin(patients, eq(healthRecords.patientId, patients.patientId));

    if (patientId) {
      query = query.where(eq(healthRecords.patientId, patientId)) as typeof query;
    }

    return query.orderBy(desc(healthRecords.recordDate));
  }

  async getPendingAlertsView(patientId?: number): Promise<PendingAlertView[]> {
    let query = db
      .select({
        alertId: alerts.alertId,
        patientId: alerts.patientId,
        patientName: patients.name,
        alertType: alerts.alertType,
        alertMessage: alerts.alertMessage,
        alertDate: alerts.alertDate,
        status: alerts.status,
      })
      .from(alerts)
      .innerJoin(patients, eq(alerts.patientId, patients.patientId));

    if (patientId) {
      query = query.where(and(eq(alerts.status, "pending"), eq(alerts.patientId, patientId))) as typeof query;
    } else {
      query = query.where(eq(alerts.status, "pending")) as typeof query;
    }

    return query.orderBy(desc(alerts.alertDate));
  }

  async getHealthRiskView(patientId?: number): Promise<PatientHealthView[]> {
    const riskCondition = sql`${healthRecords.bloodSugar} > 180
      OR ${healthRecords.bpSystolic} > 140
      OR ${healthRecords.cholesterol} > 200
      OR ${healthRecords.oxygenSaturation} < 95
      OR ${healthRecords.bmi} > 25`;

    let query = db
      .select({
        recordId: healthRecords.recordId,
        patientId: healthRecords.patientId,
        patientName: patients.name,
        recordDate: healthRecords.recordDate,
        bloodSugar: healthRecords.bloodSugar,
        bpSystolic: healthRecords.bpSystolic,
        bpDiastolic: healthRecords.bpDiastolic,
        cholesterol: healthRecords.cholesterol,
        oxygenSaturation: healthRecords.oxygenSaturation,
        bmi: healthRecords.bmi,
        notes: healthRecords.notes,
      })
      .from(healthRecords)
      .innerJoin(patients, eq(healthRecords.patientId, patients.patientId));

    if (patientId) {
      query = query.where(and(eq(healthRecords.patientId, patientId), riskCondition)) as typeof query;
    } else {
      query = query.where(riskCondition) as typeof query;
    }

    return query.orderBy(desc(healthRecords.recordDate));
  }

  async seedDemoData(): Promise<boolean> {
    const existingPatients = await db.select({ patientId: patients.patientId }).from(patients).limit(1);
    if (existingPatients.length > 0) {
      return false;
    }

    await db.insert(patients).values({
      name: "Vedang Sharma",
      age: 19,
      gender: "Male",
      phone: "+91 8103385262",
      emergencyContact: "+91 7987223055",
    });
    const vedangId = await getLastInsertId(db);

    await db.insert(patients).values({
      name: "Sunita Sharma",
      age: 52,
      gender: "Female",
      phone: "+91 7987223055",
      emergencyContact: "+91 8103385262",
    });
    const sunitaId = await getLastInsertId(db);

    await db.insert(doctors).values({
      name: "Dr. Mehta",
      specialization: "Cardiologist",
      contact: "+91 9988776655",
    });
    const mehtaId = await getLastInsertId(db);

    await db.insert(doctors).values({
      name: "Dr. Rao",
      specialization: "Diabetologist",
      contact: "+91 9977665544",
    });
    const raoId = await getLastInsertId(db);

    await db.insert(users).values([
      { username: "admin", password: hashPassword("admin", "admin123"), role: "admin" },
      { username: "vedang_user", password: hashPassword("vedang_user", "pass123"), role: "patient", patientId: vedangId },
      { username: "sunita_user", password: hashPassword("sunita_user", "pass456"), role: "patient", patientId: sunitaId },
    ]);

    await db.insert(prescriptions).values({
      patientId: vedangId,
      doctorId: mehtaId,
      prescriptionDate: new Date("2026-01-10"),
    });
    const vedangPrescriptionId = await getLastInsertId(db);

    await db.insert(prescriptions).values({
      patientId: sunitaId,
      doctorId: raoId,
      prescriptionDate: new Date("2026-01-15"),
    });
    const sunitaPrescriptionId = await getLastInsertId(db);

    await db.insert(medicines).values([
      {
        prescriptionId: vedangPrescriptionId,
        medicineName: "Amlodipine",
        dosage: "5mg",
        frequency: "Once Daily",
        refillIntervalDays: 30,
      },
      {
        prescriptionId: sunitaPrescriptionId,
        medicineName: "Metformin",
        dosage: "500mg",
        frequency: "Twice Daily",
        refillIntervalDays: 30,
      },
    ]);

    const [allMedicines] = await Promise.all([
      db.select().from(medicines).orderBy(medicines.medicineId),
      this.createHealthRecord({
        patientId: vedangId,
        recordDate: new Date("2026-02-01"),
        bloodSugar: "140",
        bpSystolic: 150,
        bpDiastolic: 95,
        cholesterol: "210",
        oxygenSaturation: "96",
        bmi: "24.8",
        notes: "High BP observed",
      }),
      this.createHealthRecord({
        patientId: sunitaId,
        recordDate: new Date("2026-02-01"),
        bloodSugar: "180",
        bpSystolic: 130,
        bpDiastolic: 85,
        cholesterol: "240",
        oxygenSaturation: "94",
        bmi: "29.1",
        notes: "High sugar level",
      }),
    ]);

    await db.insert(refills).values([
      {
        medicineId: allMedicines[0].medicineId,
        refillDate: new Date("2026-01-10"),
        nextRefillDate: new Date("2026-02-09"),
        cost: "250.00",
      },
      {
        medicineId: allMedicines[1].medicineId,
        refillDate: new Date("2026-01-15"),
        nextRefillDate: new Date("2026-02-14"),
        cost: "180.00",
      },
    ]);

    await db.insert(bills).values({
      billNumber: "BILL-1001",
      patientId: sunitaId,
      doctorId: raoId,
      prescriptionId: sunitaPrescriptionId,
      billingDate: new Date("2026-02-05"),
      dueDate: new Date("2026-02-20"),
      subtotal: "180.00",
      taxAmount: "18.00",
      discountAmount: "10.00",
      totalAmount: "188.00",
      paidAmount: "100.00",
      balanceAmount: "88.00",
      paymentStatus: "partial",
      billingNotes: "Medicine refill and consultation charges",
    });
    const billId = await getLastInsertId(db);

    await db.insert(paymentHistory).values({
      billId,
      patientId: sunitaId,
      paymentDate: new Date("2026-02-06"),
      amountPaid: "100.00",
      paymentMethod: "UPI",
      transactionReference: "UPI-TXN-1001",
      paymentStatus: "completed",
      receivedBy: "Admin Desk",
      paymentNotes: "Initial partial payment received",
    });

    return true;
  }
}

export const storage = new DatabaseStorage();




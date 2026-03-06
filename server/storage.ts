import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import {
  patients, doctors, users, prescriptions, medicines, refills, healthRecords, alerts,
  type User, type Patient, type Doctor, type Prescription, type Medicine, type HealthRecord, type Alert,
  type InsertUser, type InsertPatient, type InsertDoctor, type InsertPrescription, type InsertMedicine, type InsertHealthRecord, type InsertAlert
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getDashboardStats(): Promise<{ avgSystolic: number | null, avgDiastolic: number | null, avgBloodSugar: number | null, activeAlerts: number }>;

  getPatients(): Promise<Patient[]>;
  getDoctors(): Promise<Doctor[]>;
  
  getHealthRecords(patientId?: number): Promise<(HealthRecord & { patientName?: string })[]>;
  createHealthRecord(record: InsertHealthRecord): Promise<HealthRecord>;
  
  getAlerts(patientId?: number): Promise<(Alert & { patientName?: string })[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  updateAlertStatus(alertId: number, status: string): Promise<Alert>;
  
  getPrescriptions(patientId?: number): Promise<(Prescription & { patientName?: string, doctorName?: string, medicines: Medicine[] })[]>;
  createPrescription(prescription: InsertPrescription, meds: InsertMedicine[]): Promise<Prescription>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.userId, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getDashboardStats() {
    const stats = await db.select({
      avgSystolic: sql<number>`avg(${healthRecords.bpSystolic})`,
      avgDiastolic: sql<number>`avg(${healthRecords.bpDiastolic})`,
      avgBloodSugar: sql<number>`avg(${healthRecords.bloodSugar})`,
    }).from(healthRecords);

    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
      .from(alerts).where(eq(alerts.status, 'pending'));

    return {
      avgSystolic: stats[0]?.avgSystolic ? Number(stats[0].avgSystolic) : null,
      avgDiastolic: stats[0]?.avgDiastolic ? Number(stats[0].avgDiastolic) : null,
      avgBloodSugar: stats[0]?.avgBloodSugar ? Number(stats[0].avgBloodSugar) : null,
      activeAlerts: Number(count)
    };
  }

  async getPatients(): Promise<Patient[]> {
    return await db.select().from(patients);
  }

  async getDoctors(): Promise<Doctor[]> {
    return await db.select().from(doctors);
  }

  async getHealthRecords(patientId?: number) {
    let query = db.select({
      recordId: healthRecords.recordId,
      patientId: healthRecords.patientId,
      recordDate: healthRecords.recordDate,
      bloodSugar: healthRecords.bloodSugar,
      bpSystolic: healthRecords.bpSystolic,
      bpDiastolic: healthRecords.bpDiastolic,
      notes: healthRecords.notes,
      patientName: patients.name
    }).from(healthRecords).leftJoin(patients, eq(healthRecords.patientId, patients.patientId));

    if (patientId) {
      query = query.where(eq(healthRecords.patientId, patientId)) as any;
    }

    return await query;
  }

  async createHealthRecord(record: InsertHealthRecord): Promise<HealthRecord> {
    const [created] = await db.insert(healthRecords).values(record).returning();
    return created;
  }

  async getAlerts(patientId?: number) {
    let query = db.select({
      alertId: alerts.alertId,
      patientId: alerts.patientId,
      alertType: alerts.alertType,
      alertMessage: alerts.alertMessage,
      alertDate: alerts.alertDate,
      status: alerts.status,
      patientName: patients.name
    }).from(alerts).leftJoin(patients, eq(alerts.patientId, patients.patientId));

    if (patientId) {
      query = query.where(eq(alerts.patientId, patientId)) as any;
    }

    return await query;
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [created] = await db.insert(alerts).values(alert).returning();
    return created;
  }

  async updateAlertStatus(alertId: number, status: string): Promise<Alert> {
    const [updated] = await db.update(alerts).set({ status }).where(eq(alerts.alertId, alertId)).returning();
    return updated;
  }

  async getPrescriptions(patientId?: number) {
    let query = db.select({
      prescriptionId: prescriptions.prescriptionId,
      patientId: prescriptions.patientId,
      doctorId: prescriptions.doctorId,
      prescriptionDate: prescriptions.prescriptionDate,
      patientName: patients.name,
      doctorName: doctors.name
    }).from(prescriptions)
      .leftJoin(patients, eq(prescriptions.patientId, patients.patientId))
      .leftJoin(doctors, eq(prescriptions.doctorId, doctors.doctorId));

    if (patientId) {
      query = query.where(eq(prescriptions.patientId, patientId)) as any;
    }

    const prs = await query;
    const allMeds = await db.select().from(medicines);

    return prs.map(p => ({
      ...p,
      medicines: allMeds.filter(m => m.prescriptionId === p.prescriptionId)
    }));
  }

  async createPrescription(prescription: InsertPrescription, meds: InsertMedicine[]): Promise<Prescription> {
    return await db.transaction(async (tx) => {
      const [created] = await tx.insert(prescriptions).values(prescription).returning();
      if (meds.length > 0) {
        await tx.insert(medicines).values(meds.map(m => ({ ...m, prescriptionId: created.prescriptionId })));
      }
      return created;
    });
  }
}

export const storage = new DatabaseStorage();

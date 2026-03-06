import { pgTable, serial, text, integer, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const patients = pgTable("patient", {
  patientId: serial("patient_id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  gender: text("gender").notNull(),
  phone: text("phone"),
  emergencyContact: text("emergency_contact")
});

export const doctors = pgTable("doctor", {
  doctorId: serial("doctor_id").primaryKey(),
  name: text("name").notNull(),
  specialization: text("specialization").notNull(),
  contact: text("contact")
});

export const users = pgTable("user", {
  userId: serial("user_id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // 'admin' or 'patient'
  patientId: integer("patient_id").references(() => patients.patientId)
});

export const prescriptions = pgTable("prescription", {
  prescriptionId: serial("prescription_id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.patientId),
  doctorId: integer("doctor_id").notNull().references(() => doctors.doctorId),
  prescriptionDate: timestamp("prescription_date").defaultNow().notNull()
});

export const medicines = pgTable("medicine", {
  medicineId: serial("medicine_id").primaryKey(),
  prescriptionId: integer("prescription_id").notNull().references(() => prescriptions.prescriptionId),
  medicineName: text("medicine_name").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(),
  refillIntervalDays: integer("refill_interval_days")
});

export const refills = pgTable("refill", {
  refillId: serial("refill_id").primaryKey(),
  medicineId: integer("medicine_id").notNull().references(() => medicines.medicineId),
  refillDate: timestamp("refill_date").notNull(),
  nextRefillDate: timestamp("next_refill_date"),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull()
});

export const healthRecords = pgTable("health_record", {
  recordId: serial("record_id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.patientId),
  recordDate: timestamp("record_date").defaultNow().notNull(),
  bloodSugar: decimal("blood_sugar", { precision: 5, scale: 2 }),
  bpSystolic: integer("bp_systolic"),
  bpDiastolic: integer("bp_diastolic"),
  notes: text("notes")
});

export const alerts = pgTable("alert", {
  alertId: serial("alert_id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.patientId),
  alertType: text("alert_type").notNull(),
  alertMessage: text("alert_message").notNull(),
  alertDate: timestamp("alert_date").defaultNow().notNull(),
  status: text("status").notNull().default('pending') // 'pending', 'resolved'
});

// Zod schemas
export const insertPatientSchema = createInsertSchema(patients).omit({ patientId: true });
export const insertDoctorSchema = createInsertSchema(doctors).omit({ doctorId: true });
export const insertUserSchema = createInsertSchema(users).omit({ userId: true });
export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({ prescriptionId: true, prescriptionDate: true });
export const insertMedicineSchema = createInsertSchema(medicines).omit({ medicineId: true });
export const insertRefillSchema = createInsertSchema(refills).omit({ refillId: true });
export const insertHealthRecordSchema = createInsertSchema(healthRecords).omit({ recordId: true, recordDate: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ alertId: true, alertDate: true });

// Types
export type Patient = typeof patients.$inferSelect;
export type Doctor = typeof doctors.$inferSelect;
export type User = typeof users.$inferSelect;
export type Prescription = typeof prescriptions.$inferSelect;
export type Medicine = typeof medicines.$inferSelect;
export type Refill = typeof refills.$inferSelect;
export type HealthRecord = typeof healthRecords.$inferSelect;
export type Alert = typeof alerts.$inferSelect;

export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type InsertHealthRecord = z.infer<typeof insertHealthRecordSchema>;
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

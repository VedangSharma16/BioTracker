import {
  decimal,
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const patients = mysqlTable("patient", {
  patientId: int("patient_id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  age: int("age").notNull(),
  gender: varchar("gender", { length: 10 }).notNull(),
  phone: varchar("phone", { length: 15 }),
  emergencyContact: varchar("emergency_contact", { length: 15 }),
});

export const doctors = mysqlTable("doctor", {
  doctorId: int("doctor_id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  specialization: varchar("specialization", { length: 50 }).notNull(),
  contact: varchar("contact", { length: 15 }),
});

export const users = mysqlTable("users", {
  userId: int("user_id").autoincrement().primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  failedLoginAttempts: int("failed_login_attempts").notNull().default(0),
  lockedAt: timestamp("locked_at"),
  role: text("role").notNull(),
  patientId: int("patient_id").references(() => patients.patientId),
});

export const prescriptions = mysqlTable("prescription", {
  prescriptionId: int("prescription_id").autoincrement().primaryKey(),
  patientId: int("patient_id").notNull().references(() => patients.patientId),
  doctorId: int("doctor_id").notNull().references(() => doctors.doctorId),
  prescriptionDate: timestamp("prescription_date").defaultNow().notNull(),
});

export const medicines = mysqlTable("medicine", {
  medicineId: int("medicine_id").autoincrement().primaryKey(),
  prescriptionId: int("prescription_id").notNull().references(() => prescriptions.prescriptionId),
  medicineName: varchar("medicine_name", { length: 100 }).notNull(),
  dosage: varchar("dosage", { length: 50 }).notNull(),
  frequency: varchar("frequency", { length: 50 }).notNull(),
  refillIntervalDays: int("refill_interval_days"),
});

export const refills = mysqlTable("refill", {
  refillId: int("refill_id").autoincrement().primaryKey(),
  medicineId: int("medicine_id").notNull().references(() => medicines.medicineId),
  refillDate: timestamp("refill_date").notNull(),
  nextRefillDate: timestamp("next_refill_date"),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
});

export const bills = mysqlTable("bill", {
  billId: int("bill_id").autoincrement().primaryKey(),
  billNumber: varchar("bill_number", { length: 50 }).notNull().unique(),
  patientId: int("patient_id").notNull().references(() => patients.patientId),
  doctorId: int("doctor_id").references(() => doctors.doctorId),
  prescriptionId: int("prescription_id").references(() => prescriptions.prescriptionId),
  billingDate: timestamp("billing_date").defaultNow().notNull(),
  dueDate: timestamp("due_date"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  balanceAmount: decimal("balance_amount", { precision: 10, scale: 2 }).notNull(),
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("pending"),
  billingNotes: text("billing_notes"),
});

export const paymentHistory = mysqlTable("payment_history", {
  paymentId: int("payment_id").autoincrement().primaryKey(),
  billId: int("bill_id").notNull().references(() => bills.billId),
  patientId: int("patient_id").notNull().references(() => patients.patientId),
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 30 }).notNull(),
  transactionReference: varchar("transaction_reference", { length: 100 }),
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("completed"),
  receivedBy: varchar("received_by", { length: 100 }),
  paymentNotes: text("payment_notes"),
});

export const healthRecords = mysqlTable("health_record", {
  recordId: int("record_id").autoincrement().primaryKey(),
  patientId: int("patient_id").notNull().references(() => patients.patientId),
  recordDate: timestamp("record_date").defaultNow().notNull(),
  bloodSugar: decimal("blood_sugar", { precision: 5, scale: 2 }),
  bpSystolic: int("bp_systolic"),
  bpDiastolic: int("bp_diastolic"),
  cholesterol: decimal("cholesterol", { precision: 5, scale: 2 }),
  oxygenSaturation: decimal("oxygen_saturation", { precision: 5, scale: 2 }),
  bmi: decimal("bmi", { precision: 5, scale: 2 }),
  notes: text("notes"),
});

export const alerts = mysqlTable("alert", {
  alertId: int("alert_id").autoincrement().primaryKey(),
  patientId: int("patient_id").notNull().references(() => patients.patientId),
  alertType: varchar("alert_type", { length: 50 }).notNull(),
  alertMessage: text("alert_message").notNull(),
  alertDate: timestamp("alert_date").defaultNow().notNull(),
  status: text("status").notNull().default("pending"),
});

export const insertPatientSchema = createInsertSchema(patients).omit({ patientId: true });
export const insertDoctorSchema = createInsertSchema(doctors).omit({ doctorId: true });
export const insertUserSchema = createInsertSchema(users).omit({ userId: true });
export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({ prescriptionId: true, prescriptionDate: true });
export const insertMedicineSchema = createInsertSchema(medicines).omit({ medicineId: true, prescriptionId: true });
export const insertRefillSchema = createInsertSchema(refills).omit({ refillId: true });
export const insertBillSchema = createInsertSchema(bills).omit({ billId: true, billingDate: true });
export const insertPaymentHistorySchema = createInsertSchema(paymentHistory).omit({ paymentId: true, paymentDate: true });
export const insertHealthRecordSchema = createInsertSchema(healthRecords).omit({ recordId: true, recordDate: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ alertId: true, alertDate: true });

export type Patient = typeof patients.$inferSelect;
export type Doctor = typeof doctors.$inferSelect;
export type User = typeof users.$inferSelect;
export type Prescription = typeof prescriptions.$inferSelect;
export type Medicine = typeof medicines.$inferSelect;
export type Refill = typeof refills.$inferSelect;
export type Bill = typeof bills.$inferSelect;
export type PaymentHistory = typeof paymentHistory.$inferSelect;
export type HealthRecord = typeof healthRecords.$inferSelect;
export type Alert = typeof alerts.$inferSelect;

export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertHealthRecord = z.infer<typeof insertHealthRecordSchema>;
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type InsertMedicine = z.infer<typeof insertMedicineSchema>;
export type InsertBill = z.infer<typeof insertBillSchema>;
export type InsertPaymentHistory = z.infer<typeof insertPaymentHistorySchema>;
export type InsertAlert = z.infer<typeof insertAlertSchema>;


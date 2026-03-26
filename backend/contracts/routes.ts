import { z } from "zod";
import {
  alerts,
  bills,
  doctors,
  healthRecords,
  insertAlertSchema,
  insertBillSchema,
  insertDoctorSchema,
  insertHealthRecordSchema,
  insertMedicineSchema,
  insertPaymentHistorySchema,
  insertPatientSchema,
  insertPrescriptionSchema,
  medicines,
  paymentHistory,
  patients,
  prescriptions,
  users,
} from "../../database/schema";

const patientHealthViewSchema = z.object({
  recordId: z.number(),
  patientId: z.number(),
  patientName: z.string(),
  recordDate: z.coerce.date(),
  bloodSugar: z.union([z.string(), z.number()]).nullable(),
  bpSystolic: z.number().nullable(),
  bpDiastolic: z.number().nullable(),
  cholesterol: z.union([z.string(), z.number()]).nullable(),
  oxygenSaturation: z.union([z.string(), z.number()]).nullable(),
  bmi: z.union([z.string(), z.number()]).nullable(),
  notes: z.string().nullable(),
});

const pendingAlertViewSchema = z.object({
  alertId: z.number(),
  patientId: z.number(),
  patientName: z.string(),
  alertType: z.string(),
  alertMessage: z.string(),
  alertDate: z.coerce.date(),
  status: z.string(),
});

const patientPrescriptionViewSchema = z.object({
  prescriptionId: z.number(),
  patientId: z.number(),
  patientName: z.string(),
  doctorId: z.number(),
  doctorName: z.string(),
  prescriptionDate: z.coerce.date(),
});

const medicineViewSchema = z.object({
  medicineId: z.number(),
  prescriptionId: z.number(),
  patientId: z.number(),
  patientName: z.string(),
  medicineName: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  refillIntervalDays: z.number().nullable(),
});

const billViewSchema = z.object({
  billId: z.number(),
  billNumber: z.string(),
  patientId: z.number(),
  patientName: z.string(),
  doctorId: z.number().nullable(),
  doctorName: z.string().nullable(),
  prescriptionId: z.number().nullable(),
  billingDate: z.coerce.date(),
  dueDate: z.coerce.date().nullable(),
  subtotal: z.union([z.string(), z.number()]),
  taxAmount: z.union([z.string(), z.number()]),
  discountAmount: z.union([z.string(), z.number()]),
  totalAmount: z.union([z.string(), z.number()]),
  paidAmount: z.union([z.string(), z.number()]),
  balanceAmount: z.union([z.string(), z.number()]),
  paymentStatus: z.string(),
  billingNotes: z.string().nullable(),
});

const paymentHistoryViewSchema = z.object({
  paymentId: z.number(),
  billId: z.number(),
  billNumber: z.string(),
  patientId: z.number(),
  patientName: z.string(),
  paymentDate: z.coerce.date(),
  amountPaid: z.union([z.string(), z.number()]),
  paymentMethod: z.string(),
  transactionReference: z.string().nullable(),
  paymentStatus: z.string(),
  receivedBy: z.string().nullable(),
  paymentNotes: z.string().nullable(),
});

const dashboardStatsSchema = z.object({
  avgSystolic: z.number().nullable(),
  avgDiastolic: z.number().nullable(),
  avgBloodSugar: z.number().nullable(),
  avgCholesterol: z.number().nullable(),
  avgOxygenSaturation: z.number().nullable(),
  avgBmi: z.number().nullable(),
  activeAlerts: z.number(),
  patientCount: z.number(),
  doctorCount: z.number(),
  highAlertPatients: z.number(),
  topDoctorName: z.string().nullable(),
  highestRefillMedicineName: z.string().nullable(),
  highestRefillCost: z.number().nullable(),
});

const prescriptionPayloadSchema = z.object({
  prescription: insertPrescriptionSchema.extend({
    patientId: z.coerce.number().int(),
    doctorId: z.coerce.number().int(),
  }),
  medicines: z.array(insertMedicineSchema.extend({
    refillIntervalDays: z.coerce.number().int().optional().nullable(),
  })),
});

const nonNegativeNumber = (label: string) =>
  z.coerce.number().refine((value) => value >= 0, {
    message: `${label} cannot be negative`,
  });

const positiveNumber = (label: string) =>
  z.coerce.number().refine((value) => value > 0, {
    message: `${label} must be greater than 0`,
  });

const phoneSchema = z
  .string()
  .regex(/^\+\d{1,4}\s\d{10}$/, "Use a valid country code and a 10 digit phone number");
const patientInputSchema = insertPatientSchema.extend({
  age: z.coerce.number().int().min(0, "Age cannot be negative"),
  gender: z.enum(["Male", "Female", "Other"]),
  phone: phoneSchema,
  emergencyContact: phoneSchema,
});

const patientCreateSchema = patientInputSchema.extend({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(4, "Password must be at least 4 characters"),
});

const doctorInputSchema = insertDoctorSchema.extend({
  name: z.string().min(2, "Doctor name is required"),
  specialization: z.string().min(2, "Specialization is required"),
  contact: phoneSchema,
});

const healthRecordInputSchema = insertHealthRecordSchema.extend({
  patientId: z.coerce.number().int(),
  bloodSugar: nonNegativeNumber("Blood sugar").optional(),
  bpSystolic: nonNegativeNumber("BP systolic").optional(),
  bpDiastolic: nonNegativeNumber("BP diastolic").optional(),
  cholesterol: nonNegativeNumber("Cholesterol").optional(),
  oxygenSaturation: nonNegativeNumber("Oxygen saturation").optional(),
  bmi: nonNegativeNumber("BMI").optional(),
});

const billInputSchema = insertBillSchema.extend({
  patientId: z.coerce.number().int(),
  doctorId: z.coerce.number().int().optional().nullable(),
  prescriptionId: z.coerce.number().int().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  subtotal: nonNegativeNumber("Subtotal"),
  taxAmount: nonNegativeNumber("Tax amount").optional(),
  discountAmount: nonNegativeNumber("Discount amount").optional(),
  totalAmount: nonNegativeNumber("Total amount"),
  paidAmount: nonNegativeNumber("Paid amount").optional(),
  balanceAmount: nonNegativeNumber("Balance amount").optional(),
  paymentStatus: z.string().optional(),
}).superRefine((value, ctx) => {
  const taxAmount = value.taxAmount ?? 0;
  const discountAmount = value.discountAmount ?? 0;
  const paidAmount = value.paidAmount ?? 0;

  if (discountAmount > value.subtotal + taxAmount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["discountAmount"],
      message: "Discount amount cannot exceed subtotal plus tax",
    });
  }

  if (paidAmount > value.totalAmount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["paidAmount"],
      message: "Paid amount cannot be greater than total amount",
    });
  }
});

const paymentMethodSchema = z.enum(["Cash", "Card", "UPI", "Net Banking", "Cheque", "Insurance"]);

const paymentInputSchema = insertPaymentHistorySchema.extend({
  billId: z.coerce.number().int(),
  patientId: z.coerce.number().int(),
  amountPaid: positiveNumber("Amount paid"),
  paymentMethod: paymentMethodSchema,
});

const billUpdateSchema = z.object({
  billId: z.coerce.number().int(),
}).and(billInputSchema);

const paymentUpdateSchema = paymentInputSchema.extend({
  paymentId: z.coerce.number().int(),
});

const alertStatusSchema = z.enum(["pending", "resolved", "suppressed"]);

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    login: {
      method: "POST" as const,
      path: "/api/login" as const,
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: "POST" as const,
      path: "/api/logout" as const,
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    me: {
      method: "GET" as const,
      path: "/api/me" as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    recoveryRequest: {
      method: "POST" as const,
      path: "/api/auth/recovery/request" as const,
      input: z.object({
        phone: z.string().min(6),
      }),
      responses: {
        200: z.object({
          message: z.string(),
          deliveryMode: z.enum(["sms", "log"]),
        }),
        400: errorSchemas.validation,
      },
    },
    recoveryVerify: {
      method: "POST" as const,
      path: "/api/auth/recovery/verify" as const,
      input: z.object({
        phone: z.string().min(6),
        otp: z.string().length(6),
      }),
      responses: {
        200: z.object({
          message: z.string(),
          deliveryMode: z.enum(["sms", "log"]),
        }),
        400: errorSchemas.validation,
      },
    },
  },
  dashboard: {
    stats: {
      method: "GET" as const,
      path: "/api/dashboard/stats" as const,
      responses: {
        200: dashboardStatsSchema,
      },
    },
  },
  patients: {
    list: {
      method: "GET" as const,
      path: "/api/patients" as const,
      responses: {
        200: z.array(z.custom<typeof patients.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/patients" as const,
      input: patientCreateSchema,
      responses: {
        201: z.custom<typeof patients.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PUT" as const,
      path: "/api/patients/:patientId" as const,
      input: patientInputSchema.extend({
        patientId: z.coerce.number().int(),
      }),
      responses: {
        200: z.custom<typeof patients.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/patients/:patientId" as const,
      input: z.object({
        patientId: z.coerce.number().int(),
      }),
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation,
      },
    },
  },
  doctors: {
    list: {
      method: "GET" as const,
      path: "/api/doctors" as const,
      responses: {
        200: z.array(z.custom<typeof doctors.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/doctors" as const,
      input: doctorInputSchema,
      responses: {
        201: z.custom<typeof doctors.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PUT" as const,
      path: "/api/doctors/:doctorId" as const,
      input: doctorInputSchema.extend({
        doctorId: z.coerce.number().int(),
      }),
      responses: {
        200: z.custom<typeof doctors.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/doctors/:doctorId" as const,
      input: z.object({
        doctorId: z.coerce.number().int(),
      }),
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation,
      },
    },
  },
  medicines: {
    list: {
      method: "GET" as const,
      path: "/api/medicines" as const,
      responses: {
        200: z.array(medicineViewSchema),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/medicines" as const,
      input: insertMedicineSchema.extend({
        prescriptionId: z.coerce.number().int(),
        refillIntervalDays: z.coerce.number().int().optional().nullable(),
      }),
      responses: {
        201: z.custom<typeof medicines.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  healthRecords: {
    list: {
      method: "GET" as const,
      path: "/api/health-records" as const,
      responses: {
        200: z.array(patientHealthViewSchema),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/health-records" as const,
      input: healthRecordInputSchema,
      responses: {
        201: z.custom<typeof healthRecords.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PUT" as const,
      path: "/api/health-records/:recordId" as const,
      input: healthRecordInputSchema.extend({
        recordId: z.coerce.number().int(),
      }),
      responses: {
        200: z.custom<typeof healthRecords.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  alerts: {
    list: {
      method: "GET" as const,
      path: "/api/alerts" as const,
      responses: {
        200: z.array(z.custom<typeof alerts.$inferSelect & { patientName?: string | null }>()),
      },
    },
    updateStatus: {
      method: "GET" as const,
      path: "/api/alerts/update-status" as const,
      input: z.object({
        alertId: z.coerce.number().int(),
        status: alertStatusSchema,
      }),
      responses: {
        200: z.custom<typeof alerts.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  billing: {
    bills: {
      list: {
        method: "GET" as const,
        path: "/api/billing/bills" as const,
        responses: {
          200: z.array(billViewSchema),
        },
      },
      create: {
        method: "POST" as const,
        path: "/api/billing/bills" as const,
        input: billInputSchema,
        responses: {
          201: z.custom<typeof bills.$inferSelect>(),
          400: errorSchemas.validation,
        },
      },
      update: {
        method: "PUT" as const,
        path: "/api/billing/bills/:billId" as const,
        input: billUpdateSchema,
        responses: {
          200: z.custom<typeof bills.$inferSelect>(),
          400: errorSchemas.validation,
        },
      },
      delete: {
        method: "DELETE" as const,
        path: "/api/billing/bills/:billId" as const,
        input: z.object({
          billId: z.coerce.number().int(),
        }),
        responses: {
          200: z.object({ message: z.string() }),
          400: errorSchemas.validation,
        },
      },
    },
    payments: {
      list: {
        method: "GET" as const,
        path: "/api/billing/payments" as const,
        responses: {
          200: z.array(paymentHistoryViewSchema),
        },
      },
      create: {
        method: "POST" as const,
        path: "/api/billing/payments" as const,
        input: paymentInputSchema,
        responses: {
          201: z.custom<typeof paymentHistory.$inferSelect>(),
          400: errorSchemas.validation,
        },
      },
      update: {
        method: "PUT" as const,
        path: "/api/billing/payments/:paymentId" as const,
        input: paymentUpdateSchema,
        responses: {
          200: z.custom<typeof paymentHistory.$inferSelect>(),
          400: errorSchemas.validation,
        },
      },
      delete: {
        method: "DELETE" as const,
        path: "/api/billing/payments/:paymentId" as const,
        input: z.object({
          paymentId: z.coerce.number().int(),
        }),
        responses: {
          200: z.object({ message: z.string() }),
          400: errorSchemas.validation,
        },
      },
    },
  },
  prescriptions: {
    list: {
      method: "GET" as const,
      path: "/api/prescriptions" as const,
      responses: {
        200: z.array(z.custom<typeof prescriptions.$inferSelect & {
          patientName?: string | null;
          doctorName?: string | null;
          medicines: Array<typeof medicines.$inferSelect>;
        }>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/prescriptions" as const,
      input: prescriptionPayloadSchema,
      responses: {
        201: z.custom<typeof prescriptions.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PUT" as const,
      path: "/api/prescriptions/:prescriptionId" as const,
      input: prescriptionPayloadSchema.extend({
        prescriptionId: z.coerce.number().int(),
      }),
      responses: {
        200: z.custom<typeof prescriptions.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/prescriptions/:prescriptionId" as const,
      input: z.object({
        prescriptionId: z.coerce.number().int(),
      }),
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation,
      },
    },
  },
  views: {
    patientPrescriptions: {
      method: "GET" as const,
      path: "/api/views/patient-prescriptions" as const,
      responses: {
        200: z.array(patientPrescriptionViewSchema),
      },
    },
    patientHealth: {
      method: "GET" as const,
      path: "/api/views/patient-health" as const,
      responses: {
        200: z.array(patientHealthViewSchema),
      },
    },
    pendingAlerts: {
      method: "GET" as const,
      path: "/api/views/pending-alerts" as const,
      responses: {
        200: z.array(pendingAlertViewSchema),
      },
    },
    healthRisk: {
      method: "GET" as const,
      path: "/api/views/health-risk" as const,
      responses: {
        200: z.array(patientHealthViewSchema),
      },
    },
  },
  dev: {
    seed: {
      method: "POST" as const,
      path: "/api/dev/seed" as const,
      responses: {
        200: z.object({
          message: z.string(),
          seeded: z.boolean(),
        }),
      },
    },
    mockSms: {
      method: "GET" as const,
      path: "/api/dev/mock-sms" as const,
      responses: {
        200: z.array(z.object({
          phone: z.string(),
          message: z.string(),
          createdAt: z.coerce.date(),
        })),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}


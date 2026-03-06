import { z } from 'zod';
import { 
  insertPatientSchema, 
  insertHealthRecordSchema, 
  insertPrescriptionSchema,
  insertMedicineSchema,
  insertAlertSchema,
  patients,
  healthRecords,
  prescriptions,
  alerts,
  medicines,
  doctors,
  users
} from './schema';

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
    message: z.string()
  })
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/login' as const,
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized
      }
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout' as const,
      responses: {
        200: z.object({ message: z.string() })
      }
    },
    me: {
      method: 'GET' as const,
      path: '/api/me' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized
      }
    }
  },
  dashboard: {
    stats: {
      method: 'GET' as const,
      path: '/api/dashboard/stats' as const,
      responses: {
        200: z.object({
          avgSystolic: z.number().nullable(),
          avgDiastolic: z.number().nullable(),
          avgBloodSugar: z.number().nullable(),
          activeAlerts: z.number()
        })
      }
    }
  },
  patients: {
    list: {
      method: 'GET' as const,
      path: '/api/patients' as const,
      responses: {
        200: z.array(z.custom<typeof patients.$inferSelect>())
      }
    }
  },
  doctors: {
    list: {
      method: 'GET' as const,
      path: '/api/doctors' as const,
      responses: {
        200: z.array(z.custom<typeof doctors.$inferSelect>())
      }
    }
  },
  healthRecords: {
    list: {
      method: 'GET' as const,
      path: '/api/health-records' as const,
      responses: {
        200: z.array(z.custom<typeof healthRecords.$inferSelect & { patientName?: string }>())
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/health-records' as const,
      input: insertHealthRecordSchema.extend({
        bloodSugar: z.coerce.number().optional(),
        bpSystolic: z.coerce.number().optional(),
        bpDiastolic: z.coerce.number().optional(),
        patientId: z.coerce.number(),
      }),
      responses: {
        201: z.custom<typeof healthRecords.$inferSelect>(),
        400: errorSchemas.validation
      }
    }
  },
  alerts: {
    list: {
      method: 'GET' as const,
      path: '/api/alerts' as const,
      responses: {
        200: z.array(z.custom<typeof alerts.$inferSelect & { patientName?: string }>())
      }
    }
  },
  prescriptions: {
    list: {
      method: 'GET' as const,
      path: '/api/prescriptions' as const,
      responses: {
        200: z.array(z.custom<typeof prescriptions.$inferSelect & { 
          patientName?: string,
          doctorName?: string,
          medicines: Array<typeof medicines.$inferSelect> 
        }>())
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/prescriptions' as const,
      input: z.object({
        prescription: insertPrescriptionSchema.extend({
          patientId: z.coerce.number(),
          doctorId: z.coerce.number()
        }),
        medicines: z.array(insertMedicineSchema.extend({
          refillIntervalDays: z.coerce.number().optional()
        }))
      }),
      responses: {
        201: z.custom<typeof prescriptions.$inferSelect>(),
        400: errorSchemas.validation
      }
    }
  }
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

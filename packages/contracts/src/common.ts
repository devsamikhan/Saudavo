import { z } from "zod";

export const ApiErrorDetailSchema = z.object({
  field: z.string().min(1),
  issue: z.string().min(1)
});
export type ApiErrorDetail = z.infer<typeof ApiErrorDetailSchema>;

export const ApiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.array(ApiErrorDetailSchema).optional(),
    requestId: z.string().min(1)
  })
});
export type ApiErrorEnvelope = z.infer<typeof ApiErrorEnvelopeSchema>;

export const HealthResponseSchema = z.object({
  data: z.object({
    status: z.literal("ok"),
    service: z.literal("saudavo-api"),
    environment: z.string().min(1),
    timestamp: z.string().datetime()
  }),
  meta: z.object({
    requestId: z.string().min(1)
  })
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

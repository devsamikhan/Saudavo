import { z } from "zod";

export const NotificationDtoSchema = z.object({
  id: z.string().uuid(),
  eventType: z.string(),
  titleKey: z.string(),
  payloadJson: z.record(z.string(), z.unknown()),
  readAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime()
});
export type NotificationDto = z.infer<typeof NotificationDtoSchema>;

export const NotificationsResponseSchema = z.object({
  data: z.array(NotificationDtoSchema),
  meta: z.object({
    requestId: z.string().min(1),
    unreadCount: z.number().int().nonnegative()
  })
});
export type NotificationsResponse = z.infer<typeof NotificationsResponseSchema>;

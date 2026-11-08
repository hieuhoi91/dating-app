import { z } from 'zod';

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(8).max(128),
});

export const emailSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  username: z
    .string()
    .trim()
    .optional()
    .default('')
    .refine(
      (value) => value === '' || /^[a-zA-Z0-9_]{3,30}$/.test(value),
      'Tên tài khoản cần từ 3 đến 30 ký tự, chỉ gồm chữ không dấu, số hoặc dấu gạch dưới.',
    ),
  dateOfBirth: z.iso.date(),
  gender: z.enum(['Nữ', 'Nam', 'Khác', 'Không muốn chia sẻ']),
  bio: z.string().max(5000).default(''),
  coarseLocation: z.string().max(120).nullable().default(null),
  latitude: z.number().min(-90).max(90).nullable().default(null),
  longitude: z.number().min(-180).max(180).nullable().default(null),
});

export const likeSchema = z.object({
  targetUserId: z.uuid(),
  action: z.enum(['like', 'pass']),
});

export const invitationSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3)
    .max(254)
    .refine(
      (value) =>
        z.email().safeParse(value).success ||
        /^@?[a-zA-Z0-9_]{3,30}$/.test(value),
      'Hãy nhập email hoặc username hợp lệ.',
    ),
});
export const respondInvitationSchema = z.object({ accept: z.boolean() });
export const answerSchema = z.object({
  sessionId: z.uuid(),
  answer: z.string().trim().min(1).max(5000),
});
export const notificationReadSchema = z.object({
  id: z.uuid(),
  read: z.boolean(),
});
export const reportSchema = z.object({
  reportedUserId: z.uuid(),
  reason: z.string().trim().min(2).max(80),
  description: z.string().max(4000).default(''),
});
export const blockSchema = z.object({ blockedUserId: z.uuid() });
export const messageSchema = z.object({
  content: z.string().trim().min(1).max(5000),
});
export const preferencesSchema = z
  .object({
    interested_in: z.array(z.string().max(40)).max(12).optional(),
    age_min: z.number().int().min(18).max(99).optional(),
    age_max: z.number().int().min(18).max(99).optional(),
    max_distance_km: z.number().int().min(1).max(500).optional(),
    interests: z.array(z.string().max(40)).max(30).optional(),
    discovery_enabled: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.age_min === undefined ||
      value.age_max === undefined ||
      value.age_min <= value.age_max,
    {
      message: 'Độ tuổi tối thiểu không được lớn hơn độ tuổi tối đa.',
      path: ['age_min'],
    },
  );
export const settingsSchema = z.object({
  profile_visibility: z.enum(['discoverable', 'hidden']).optional(),
  push_enabled: z.boolean().optional(),
  email_enabled: z.boolean().optional(),
  privacy_preferences: z.record(z.string(), z.boolean()).optional(),
  notification_preferences: z.record(z.string(), z.boolean()).optional(),
});
export const memorySchema = z
  .object({
    coupleId: z.uuid(),
    title: z.string().trim().min(1).max(160),
    description: z.string().max(5000).default(''),
    memoryDate: z.iso.date().optional(),
    locationName: z.string().trim().max(180).default(''),
    locationArea: z.string().trim().max(180).default(''),
    locationLatitude: z.number().min(-90).max(90).nullable().default(null),
    locationLongitude: z.number().min(-180).max(180).nullable().default(null),
    isPublic: z.boolean().default(false),
  })
  .refine(
    (value) =>
      (value.locationLatitude === null) === (value.locationLongitude === null),
    {
      message: 'Tọa độ vị trí chưa đầy đủ.',
    },
  );
export const coupleFeedPostSchema = z
  .object({
    coupleId: z.uuid(),
    content: z.string().trim().min(1).max(3000),
    locationName: z.string().trim().max(180).default(''),
    locationArea: z.string().trim().max(180).default(''),
    locationLatitude: z.number().min(-90).max(90).nullable().default(null),
    locationLongitude: z.number().min(-180).max(180).nullable().default(null),
  })
  .refine(
    (value) =>
      (value.locationLatitude === null) === (value.locationLongitude === null),
    {
      message: 'Tọa độ vị trí chưa đầy đủ.',
    },
  );
export const journalSchema = z.object({
  coupleId: z.uuid(),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(10000),
  entryDate: z.iso.date().optional(),
});
export const datePlanSchema = z.object({
  coupleId: z.uuid(),
  title: z.string().trim().min(1).max(160),
  startsAt: z.iso.datetime(),
  location: z.string().max(300).default(''),
  notes: z.string().max(3000).default(''),
});

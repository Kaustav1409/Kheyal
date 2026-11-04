const { z } = require('zod');

// Accepts standard ISO 8601 datetime strings (e.g. 2026-10-25T11:30:00.000Z or without ms)
const isoDateTimeSchema = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: 'dueAt must be a valid ISO 8601 date string',
  });

const createDeadlineSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(1, 'Title cannot be empty')
    .max(255, 'Title cannot exceed 255 characters'),
  subject: z
    .string()
    .trim()
    .max(100, 'Subject cannot exceed 100 characters')
    .optional()
    .nullable(),
  dueAt: isoDateTimeSchema.optional().nullable(),
  hasDueTime: z.boolean().optional().default(true),
  effortHours: z
    .number()
    .positive('Effort hours must be greater than zero')
    .max(1000, 'Effort cannot exceed 1000 hours')
    .optional()
    .nullable(),
});

const updateDeadlineSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title cannot be empty')
      .max(255, 'Title cannot exceed 255 characters')
      .optional(),
    subject: z
      .string()
      .trim()
      .max(100, 'Subject cannot exceed 100 characters')
      .optional()
      .nullable(),
    dueAt: isoDateTimeSchema.optional().nullable(),
    hasDueTime: z.boolean().optional(),
    effortHours: z
      .number()
      .positive('Effort hours must be greater than zero')
      .max(1000, 'Effort cannot exceed 1000 hours')
      .optional()
      .nullable(),
    status: z.enum(['active', 'completed']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

const deadlineQuerySchema = z.object({
  status: z
    .enum(['active', 'completed', 'overdue', 'all'])
    .optional()
    .default('active'),
  subject: z.string().trim().optional(),
});

module.exports = {
  createDeadlineSchema,
  updateDeadlineSchema,
  deadlineQuerySchema,
};

const { z } = require('zod');

const signupSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .max(255)
    .transform((val) => val.toLowerCase().trim()),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must not exceed 100 characters'),
  timezone: z
    .string()
    .max(64)
    .optional()
    .default('Asia/Kolkata'),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .transform((val) => val.toLowerCase().trim()),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

const googleAuthSchema = z.object({
  idToken: z
    .string({ required_error: 'Google ID token is required' })
    .min(1, 'Google ID token is required'),
});

module.exports = {
  signupSchema,
  loginSchema,
  googleAuthSchema,
};

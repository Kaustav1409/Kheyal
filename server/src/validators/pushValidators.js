const { z } = require('zod');

const subscribeSchema = z.object({
  endpoint: z
    .string({ required_error: 'Endpoint is required' })
    .url('Endpoint must be a valid URL'),
  keys: z.object({
    p256dh: z
      .string({ required_error: 'p256dh key is required' })
      .min(1, 'p256dh key cannot be empty'),
    auth: z
      .string({ required_error: 'auth secret is required' })
      .min(1, 'auth secret cannot be empty'),
  }),
});

const unsubscribeSchema = z.object({
  endpoint: z
    .string({ required_error: 'Endpoint is required' })
    .url('Endpoint must be a valid URL'),
});

module.exports = {
  subscribeSchema,
  unsubscribeSchema,
};

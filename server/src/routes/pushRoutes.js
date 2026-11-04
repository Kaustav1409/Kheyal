const express = require('express');
const router = express.Router();
const pushController = require('../controllers/pushController');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  subscribeSchema,
  unsubscribeSchema,
} = require('../validators/pushValidators');

// Public endpoint for frontend Service Worker to fetch VAPID key
router.get('/vapid-public-key', pushController.getVapidKey);

// Authenticated subscription management
router.post('/subscribe', requireAuth, validate(subscribeSchema), pushController.subscribe);
router.delete('/subscribe', requireAuth, validate(unsubscribeSchema), pushController.unsubscribe);

module.exports = router;

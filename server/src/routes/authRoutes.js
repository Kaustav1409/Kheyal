const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  signupSchema,
  loginSchema,
  googleAuthSchema,
} = require('../validators/authValidators');

router.post('/signup', validate(signupSchema), authController.signup);
router.post('/login', validate(loginSchema), authController.login);
router.post('/google', validate(googleAuthSchema), authController.googleAuth);
router.get('/me', requireAuth, authController.getMe);
router.post('/logout', requireAuth, authController.logout);

module.exports = router;

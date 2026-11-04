const express = require('express');
const router = express.Router();
const deadlineController = require('../controllers/deadlineController');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  createDeadlineSchema,
  updateDeadlineSchema,
  deadlineQuerySchema,
  parseDeadlineSchema,
} = require('../validators/deadlineValidators');

// Protect all deadline operations
router.use(requireAuth);

// Intelligence endpoints (must precede parameterized /:id route)
router.post('/parse', validate(parseDeadlineSchema), deadlineController.parse);
router.get('/next', deadlineController.getNext);

// Core CRUD endpoints
router.post('/', validate(createDeadlineSchema), deadlineController.create);
router.get('/', validate(deadlineQuerySchema, 'query'), deadlineController.list);
router.get('/:id', deadlineController.getById);
router.patch('/:id', validate(updateDeadlineSchema), deadlineController.update);
router.delete('/:id', deadlineController.remove);

module.exports = router;

const deadlineService = require('../services/deadlineService');
const parsingService = require('../services/parsingService');

async function parse(req, res, next) {
  try {
    const { text, timezone } = req.body;
    const preview = parsingService.parseDeadlineText(text, { timezone });
    return res.status(200).json({ preview });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { deadline, remindersScheduled } = await deadlineService.createDeadline(req.user.id, req.body);
    return res.status(201).json({
      message: 'Deadline created successfully',
      deadline,
      remindersScheduled,
    });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const deadlines = await deadlineService.getDeadlines(req.user.id, req.query);
    return res.status(200).json({
      deadlines,
    });
  } catch (err) {
    next(err);
  }
}

async function getNext(req, res, next) {
  try {
    const result = await deadlineService.getRankedNext(req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const deadline = await deadlineService.getDeadlineById(req.user.id, req.params.id);
    return res.status(200).json({
      deadline,
    });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const deadline = await deadlineService.updateDeadline(req.user.id, req.params.id, req.body);
    return res.status(200).json({
      message: 'Deadline updated successfully',
      deadline,
    });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await deadlineService.deleteDeadline(req.user.id, req.params.id);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  parse,
  create,
  list,
  getNext,
  getById,
  update,
  remove,
};

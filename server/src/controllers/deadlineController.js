const deadlineService = require('../services/deadlineService');

async function create(req, res, next) {
  try {
    const deadline = await deadlineService.createDeadline(req.user.id, req.body);
    return res.status(201).json({
      message: 'Deadline created successfully',
      deadline,
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
  create,
  list,
  getById,
  update,
  remove,
};

const express = require('express');
const controller = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

router.patch('/users/:userId/role', authenticate, authorize('admin'), controller.updateUserRole);
router.get('/audit-logs', authenticate, authorize('admin'), controller.listAuditLogs);

module.exports = router;

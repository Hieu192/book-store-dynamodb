/**
 * Migration API Routes
 * API để quản lý migration process
 */

const express = require('express');
const router = express.Router();
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const { getInstance } = require('../services/MigrationManager');

/**
 * Get current migration status
 * GET /api/v1/migration/status
 * Public endpoint for testing
 */
router.get('/status', catchAsyncErrors(async (req, res) => {
  const manager = getInstance();
  const stats = await manager.getStatistics();
  
  res.status(200).json({
    success: true,
    data: {
      currentPhase: manager.getCurrentPhase(),
      statistics: stats,
      errorCount: manager.getErrorLog().length
    }
  });
}));

/**
 * Change migration phase
 * POST /api/v1/migration/phase
 * Public endpoint for testing
 */
router.post('/phase', catchAsyncErrors(async (req, res) => {
  const { phase } = req.body;
  
  if (!phase) {
    return res.status(400).json({
      success: false,
      message: 'Phase is required'
    });
  }

  const manager = getInstance();
  manager.setPhase(phase);
  
  res.status(200).json({
    success: true,
    message: `Migration phase changed to ${phase}`,
    currentPhase: manager.getCurrentPhase()
  });
}));

/**
 * Verify data consistency
 * POST /api/v1/migration/verify
 * Public endpoint for testing
 */
router.post('/verify', catchAsyncErrors(async (req, res) => {
  const { sampleSize = 10 } = req.body;
  
  const manager = getInstance();
  const results = await manager.verifyConsistency(sampleSize);
  
  res.status(200).json({
    success: true,
    data: results
  });
}));

/**
 * Get error log
 * GET /api/v1/migration/errors
 * Public endpoint for testing
 */
router.get('/errors', catchAsyncErrors(async (req, res) => {
  const manager = getInstance();
  const errors = manager.getErrorLog();
  
  res.status(200).json({
    success: true,
    count: errors.length,
    errors
  });
}));

/**
 * Clear error log
 * DELETE /api/v1/migration/errors
 * Public endpoint for testing
 */
router.delete('/errors', catchAsyncErrors(async (req, res) => {
  const manager = getInstance();
  manager.clearErrorLog();
  
  res.status(200).json({
    success: true,
    message: 'Error log cleared'
  });
}));

/**
 * Get migration statistics
 * GET /api/v1/migration/statistics
 * Public endpoint for testing
 */
router.get('/statistics', catchAsyncErrors(async (req, res) => {
  const manager = getInstance();
  const stats = await manager.getStatistics();
  
  res.status(200).json({
    success: true,
    data: stats
  });
}));

module.exports = router;

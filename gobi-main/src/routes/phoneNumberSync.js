const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const PhoneNumberSyncService = require('../services/PhoneNumberSyncService');

const router = express.Router();

/**
 * @swagger
 * /api/phone-sync/status:
 *   get:
 *     summary: Get phone number sync service status
 *     tags: [Phone Sync]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync service status and statistics
 */
router.get('/phone-sync/status', authenticateToken, async (req, res) => {
  try {
    const status = PhoneNumberSyncService.getStatus();

    res.json({
      success: true,
      data: {
        service: {
          running: status.isRunning,
          lastSync: status.lastSyncTime,
          lastStatus: status.lastSyncStatus
        },
        statistics: {
          totalSyncs: status.stats.totalSyncs,
          successfulSyncs: status.stats.successfulSyncs,
          failedSyncs: status.stats.failedSyncs,
          numbersImported: status.stats.numbersImported,
          orphansFound: status.stats.orphansFound,
          successRate: status.stats.totalSyncs > 0
            ? ((status.stats.successfulSyncs / status.stats.totalSyncs) * 100).toFixed(2) + '%'
            : 'N/A'
        },
        recentErrors: status.stats.recentErrors,
        health: {
          status: status.isRunning && status.lastSyncStatus === 'success' ? 'healthy' : 'degraded',
          message: status.isRunning
            ? (status.lastSyncStatus === 'success' ? 'Service operating normally' : 'Last sync failed')
            : 'Service not running'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get sync status',
        code: 'SYNC_STATUS_ERROR'
      }
    });
  }
});

/**
 * @swagger
 * /api/phone-sync/trigger:
 *   post:
 *     summary: Manually trigger phone number sync
 *     tags: [Phone Sync]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync triggered successfully
 */
router.post('/phone-sync/trigger', authenticateToken, async (req, res) => {
  try {
    console.log(`[API] Manual sync triggered by user ${req.user.email}`);

    // Trigger sync in background (don't wait for completion)
    PhoneNumberSyncService.triggerSync().catch(error => {
      console.error('[API] Manual sync failed:', error);
    });

    res.json({
      success: true,
      message: 'Sync triggered successfully',
      note: 'Sync is running in background. Check /api/phone-sync/status for progress.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to trigger sync',
        code: 'SYNC_TRIGGER_ERROR'
      }
    });
  }
});

/**
 * @swagger
 * /api/phone-sync/health:
 *   get:
 *     summary: Health check endpoint for monitoring
 *     tags: [Phone Sync]
 *     responses:
 *       200:
 *         description: Service is healthy
 *       503:
 *         description: Service is unhealthy
 */
router.get('/phone-sync/health', async (req, res) => {
  try {
    const status = PhoneNumberSyncService.getStatus();

    const isHealthy = status.isRunning && status.lastSyncStatus === 'success';

    if (isHealthy) {
      res.json({
        status: 'healthy',
        service: 'phone-number-sync',
        lastSync: status.lastSyncTime,
        uptime: process.uptime()
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        service: 'phone-number-sync',
        reason: !status.isRunning ? 'Service not running' : 'Last sync failed',
        lastSync: status.lastSyncTime,
        lastStatus: status.lastSyncStatus
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'phone-number-sync',
      error: error.message
    });
  }
});

module.exports = router;

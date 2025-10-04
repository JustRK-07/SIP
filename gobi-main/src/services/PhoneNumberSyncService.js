const TwilioService = require('./TwilioService');
const DatabaseService = require('./DatabaseService');

/**
 * Production-ready sync service for Twilio <-> Database phone numbers
 * Ensures consistency between Twilio and local database
 */
class PhoneNumberSyncService {
  constructor() {
    this.syncInterval = null;
    this.isRunning = false;
    this.lastSyncTime = null;
    this.lastSyncStatus = null;
    this.syncStats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      numbersImported: 0,
      orphansFound: 0,
      errors: []
    };
  }

  /**
   * Start background sync service
   * @param {number} intervalMs Sync interval in milliseconds (default: 5 minutes)
   */
  start(intervalMs = 5 * 60 * 1000) {
    if (this.syncInterval) {
      console.log('[SYNC] Service already running');
      return;
    }

    console.log(`[SYNC] Starting sync service (interval: ${intervalMs / 1000}s)`);

    // Run immediately
    this.syncPhoneNumbers();

    // Then run on interval
    this.syncInterval = setInterval(() => {
      this.syncPhoneNumbers();
    }, intervalMs);

    this.isRunning = true;
  }

  /**
   * Stop background sync service
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.isRunning = false;
      console.log('[SYNC] Service stopped');
    }
  }

  /**
   * Main sync function - reconciles Twilio and Database
   */
  async syncPhoneNumbers() {
    if (!TwilioService.isConfigured()) {
      console.warn('[SYNC] Twilio not configured, skipping sync');
      return;
    }

    const syncStartTime = Date.now();
    console.log(`[SYNC] Starting sync at ${new Date().toISOString()}`);

    try {
      const prisma = DatabaseService.getClient();

      // Fetch all numbers from Twilio
      const twilioClient = TwilioService.getClient();
      const twilioNumbers = await twilioClient.incomingPhoneNumbers.list();
      console.log(`[SYNC] Found ${twilioNumbers.length} numbers in Twilio`);

      // Fetch all numbers from Database
      const dbNumbers = await prisma.phoneNumber.findMany({
        include: {
          tenant: { select: { id: true, name: true } }
        }
      });
      console.log(`[SYNC] Found ${dbNumbers.length} numbers in Database`);

      // Find orphaned Twilio numbers (in Twilio but not in DB)
      const twilioOnly = twilioNumbers.filter(tn =>
        !dbNumbers.find(db => db.twilioSid === tn.sid)
      );

      // Find orphaned DB records (in DB but not in Twilio)
      const dbOnly = dbNumbers.filter(db =>
        !twilioNumbers.find(tn => tn.sid === db.twilioSid)
      );

      console.log(`[SYNC] Found ${twilioOnly.length} Twilio orphans, ${dbOnly.length} DB orphans`);

      // Handle Twilio orphans - Auto-import with default tenant
      let importedCount = 0;
      for (const twilioNumber of twilioOnly) {
        try {
          // Try to find a default tenant or use the first available tenant
          const defaultTenant = await prisma.tenant.findFirst({
            orderBy: { createdAt: 'asc' }
          });

          if (!defaultTenant) {
            console.error(`[SYNC] No tenant found to assign orphaned number ${twilioNumber.phoneNumber}`);
            continue;
          }

          await prisma.phoneNumber.create({
            data: {
              number: twilioNumber.phoneNumber,
              friendlyName: twilioNumber.friendlyName,
              status: 'ACTIVE',
              capabilities: [
                twilioNumber.capabilities.voice && 'voice',
                twilioNumber.capabilities.sms && 'sms',
                twilioNumber.capabilities.mms && 'mms'
              ].filter(Boolean).join(','),
              twilioSid: twilioNumber.sid,
              twilioAccount: twilioNumber.accountSid,
              country: twilioNumber.isoCountry || 'US',
              region: twilioNumber.region,
              monthlyCost: 1.00, // Default, update based on Twilio pricing
              callDirection: 'BOTH',
              tenantId: defaultTenant.id
            }
          });

          importedCount++;
          console.log(`[SYNC] ✅ Auto-imported ${twilioNumber.phoneNumber} to tenant ${defaultTenant.name}`);
        } catch (importError) {
          console.error(`[SYNC] ❌ Failed to import ${twilioNumber.phoneNumber}:`, importError.message);
          this.syncStats.errors.push({
            timestamp: new Date(),
            type: 'import_failed',
            number: twilioNumber.phoneNumber,
            error: importError.message
          });
        }
      }

      // Handle DB orphans - Alert and optionally clean up
      for (const dbNumber of dbOnly) {
        console.error(`[SYNC] ⚠️ ORPHAN: ${dbNumber.number} exists in DB but not in Twilio!`);
        console.error(`[SYNC]   - Tenant: ${dbNumber.tenant?.name || 'Unknown'}`);
        console.error(`[SYNC]   - Twilio SID: ${dbNumber.twilioSid}`);
        console.error(`[SYNC]   - Recommendation: Check if number was released from Twilio manually`);

        // Optional: Auto-cleanup after X days
        const daysSinceUpdate = (Date.now() - new Date(dbNumber.updatedAt)) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate > 7) {
          console.log(`[SYNC] 🗑️ Auto-removing stale orphan (${daysSinceUpdate.toFixed(0)} days old)`);
          await prisma.phoneNumber.delete({ where: { id: dbNumber.id } });
        }

        this.syncStats.errors.push({
          timestamp: new Date(),
          type: 'db_orphan',
          number: dbNumber.number,
          twilioSid: dbNumber.twilioSid,
          tenant: dbNumber.tenant?.name
        });
      }

      // Update stats
      const syncDuration = Date.now() - syncStartTime;
      this.syncStats.totalSyncs++;
      this.syncStats.successfulSyncs++;
      this.syncStats.numbersImported += importedCount;
      this.syncStats.orphansFound += dbOnly.length;

      this.lastSyncTime = new Date();
      this.lastSyncStatus = 'success';

      console.log(`[SYNC] ✅ Sync completed in ${syncDuration}ms`);
      console.log(`[SYNC]   - Imported: ${importedCount}`);
      console.log(`[SYNC]   - Orphans found: ${dbOnly.length}`);

    } catch (error) {
      console.error('[SYNC] ❌ Sync failed:', error);
      this.syncStats.failedSyncs++;
      this.lastSyncStatus = 'failed';
      this.syncStats.errors.push({
        timestamp: new Date(),
        type: 'sync_failed',
        error: error.message
      });
    }
  }

  /**
   * Get sync service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      lastSyncStatus: this.lastSyncStatus,
      stats: {
        ...this.syncStats,
        recentErrors: this.syncStats.errors.slice(-10) // Last 10 errors
      }
    };
  }

  /**
   * Manually trigger sync
   */
  async triggerSync() {
    console.log('[SYNC] Manual sync triggered');
    await this.syncPhoneNumbers();
  }
}

// Export singleton instance
module.exports = new PhoneNumberSyncService();

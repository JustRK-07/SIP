/**
 * Automatic cleanup scheduler for local agents
 * Runs cleanup tasks periodically to remove offline agents
 */

import { db } from "@/server/db";

export class CleanupScheduler {
  private static cleanupInterval: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * Start the automatic cleanup scheduler
   */
  static start(intervalSeconds: number = 5) {
    if (this.isRunning) {
      console.log("[CleanupScheduler] Already running, skipping start");
      return;
    }

    console.log(`[CleanupScheduler] Starting automatic cleanup every ${intervalSeconds} seconds`);
    
    this.isRunning = true;
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupOfflineAgents();
      } catch (error) {
        console.error("[CleanupScheduler] Error during cleanup:", error);
      }
    }, intervalSeconds * 1000);

    // Run initial cleanup
    this.cleanupOfflineAgents().catch(error => {
      console.error("[CleanupScheduler] Error during initial cleanup:", error);
    });
  }

  /**
   * Stop the automatic cleanup scheduler
   */
  static stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isRunning = false;
    console.log("[CleanupScheduler] Stopped automatic cleanup");
  }

  /**
   * Clean up offline agents
   */
  static async cleanupOfflineAgents() {
    try {
      const now = new Date();
      const tenSecondsAgo = new Date(now.getTime() - 10 * 1000); // 10 seconds
      const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000); // 30 seconds (safety net)

      console.log("[CleanupScheduler] Starting cleanup of offline agents...");

      // Step 1: Remove agents that haven't sent heartbeat in 10 seconds
      const staleAgents = await db.localAgent.findMany({
        where: {
          status: "RUNNING",
          lastHeartbeat: {
            lt: tenSecondsAgo,
          },
        },
      });

      if (staleAgents.length > 0) {
        console.log(`[CleanupScheduler] Removing ${staleAgents.length} agents (no heartbeat for 10+ seconds)`);
        
        // Directly delete agents that haven't sent heartbeat in 10 seconds
        const deletedAgents = await db.localAgent.deleteMany({
          where: {
            status: "RUNNING",
            lastHeartbeat: {
              lt: tenSecondsAgo,
            },
          },
        });

        console.log(`[CleanupScheduler] Removed ${deletedAgents.count} stale agents`);
      }

      // Step 2: Safety net - remove any agents that might have been left in OFFLINE state
      const offlineAgents = await db.localAgent.deleteMany({
        where: {
          status: "OFFLINE",
          lastHeartbeat: {
            lt: thirtySecondsAgo,
          },
        },
      });

      if (offlineAgents.count > 0) {
        console.log(`[CleanupScheduler] Removed ${offlineAgents.count} offline agents (safety net)`);
      }

      // Step 3: Clean up any agents that might have been left in RUNNING state
      // but haven't sent heartbeat in 2 minutes (final safety net)
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
      const orphanedAgents = await db.localAgent.deleteMany({
        where: {
          status: "RUNNING",
          lastHeartbeat: {
            lt: twoMinutesAgo,
          },
        },
      });

      if (orphanedAgents.count > 0) {
        console.log(`[CleanupScheduler] Removed ${orphanedAgents.count} orphaned agents (final safety net)`);
      }

      const totalCleaned = staleAgents.length + offlineAgents.count + orphanedAgents.count;
      if (totalCleaned > 0) {
        console.log(`[CleanupScheduler] Cleanup completed: ${totalCleaned} agents processed`);
      }

    } catch (error) {
      console.error("[CleanupScheduler] Error during cleanup:", error);
      throw error;
    }
  }

  /**
   * Get cleanup status
   */
  static getStatus() {
    return {
      isRunning: this.isRunning,
      hasInterval: this.cleanupInterval !== null,
    };
  }

  /**
   * Force cleanup (for manual triggers)
   */
  static async forceCleanup() {
    console.log("[CleanupScheduler] Force cleanup triggered");
    await this.cleanupOfflineAgents();
  }
}

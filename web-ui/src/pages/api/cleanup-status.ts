import { NextApiRequest, NextApiResponse } from "next";
import { CleanupScheduler } from "@/lib/cleanup-scheduler";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // Get cleanup status
    try {
      const status = CleanupScheduler.getStatus();
      return res.status(200).json({
        success: true,
        status,
        message: "Cleanup status retrieved successfully",
      });
    } catch (error) {
      console.error("[API] Error getting cleanup status:", error);
      return res.status(500).json({
        error: `Failed to get cleanup status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  } else if (req.method === "POST") {
    // Force cleanup
    try {
      await CleanupScheduler.forceCleanup();
      return res.status(200).json({
        success: true,
        message: "Force cleanup completed successfully",
        status: CleanupScheduler.getStatus(),
      });
    } catch (error) {
      console.error("[API] Error during force cleanup:", error);
      return res.status(500).json({
        error: `Failed to perform force cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}

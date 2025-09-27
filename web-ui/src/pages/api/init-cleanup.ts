import { NextApiRequest, NextApiResponse } from "next";
import { CleanupScheduler } from "@/lib/cleanup-scheduler";

// Global flag to ensure cleanup is only started once
let cleanupStarted = false;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!cleanupStarted) {
      // Start the cleanup scheduler
      CleanupScheduler.start(5); // Run every 5 seconds
      cleanupStarted = true;
      
      console.log("[API] Cleanup scheduler started");
      
      return res.status(200).json({
        success: true,
        message: "Cleanup scheduler started successfully",
        status: CleanupScheduler.getStatus(),
      });
    } else {
      return res.status(200).json({
        success: true,
        message: "Cleanup scheduler already running",
        status: CleanupScheduler.getStatus(),
      });
    }
  } catch (error) {
    console.error("[API] Error starting cleanup scheduler:", error);
    return res.status(500).json({
      error: `Failed to start cleanup scheduler: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

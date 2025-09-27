import { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/server/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({ 
        error: "Missing required field: agentId" 
      });
    }

    await db.localAgent.delete({
      where: { agentId },
    });

    return res.status(200).json({
      success: true,
      message: "Local agent removed successfully",
    });
  } catch (error) {
    console.error("Error removing local agent:", error);
    return res.status(500).json({
      error: `Failed to remove local agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}


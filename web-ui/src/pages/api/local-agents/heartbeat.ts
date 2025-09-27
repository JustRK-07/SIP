import { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/server/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      agentId,
      name,
      description,
      model,
      voice,
      temperature,
      prompt,
      processId,
      port,
      host,
    } = req.body;

    // Validate required fields
    if (!agentId || !name || !prompt) {
      return res.status(400).json({ 
        error: "Missing required fields: agentId, name, and prompt are required" 
      });
    }

    const now = new Date();
    
    // Upsert local agent record
    const localAgent = await db.localAgent.upsert({
      where: { agentId },
      update: {
        name,
        description: description || null,
        model: model || "gpt-3.5-turbo",
        voice: voice || "nova",
        temperature: temperature || 0.7,
        prompt,
        status: "RUNNING",
        lastHeartbeat: now,
        processId: processId || null,
        port: port || null,
        host: host || "localhost",
        updatedAt: now,
      },
      create: {
        agentId,
        name,
        description: description || null,
        model: model || "gpt-3.5-turbo",
        voice: voice || "nova",
        temperature: temperature || 0.7,
        prompt,
        status: "RUNNING",
        lastHeartbeat: now,
        processId: processId || null,
        port: port || null,
        host: host || "localhost",
      },
    });

    return res.status(200).json({
      success: true,
      agent: localAgent,
      message: "Heartbeat registered successfully",
    });
  } catch (error) {
    console.error("Error registering heartbeat:", error);
    return res.status(500).json({
      error: `Failed to register heartbeat: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}


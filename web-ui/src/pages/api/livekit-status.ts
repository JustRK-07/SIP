import type { NextApiRequest, NextApiResponse } from "next";
import { LiveKitService } from "@/lib/livekit";
import { RoomServiceClient } from "livekit-server-sdk";
import { env } from "@/env";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Test LiveKit connection
    const connectionStatus = await LiveKitService.testConnection();
    
    // List all deployed agents
    const deployedAgents = await LiveKitService.listDeployedAgents();
    
    // Check for cloud agents by looking at the livekit-agents directory
    const fs = await import('fs');
    const path = await import('path');
    const agentPath = path.join(process.cwd(), 'livekit-agents');
    const hasAgentDirectory = fs.existsSync(agentPath);
    
    // Initialize LiveKit client to list rooms
    let rooms = [];
    let cloudAgents = [];
    
    try {
      const livekitClient = new RoomServiceClient(
        env.LIVEKIT_API_ENDPOINT!,
        env.LIVEKIT_API_KEY!,
        env.LIVEKIT_API_SECRET!
      );
      
      // Get all rooms
      const allRooms = await livekitClient.listRooms();
      rooms = allRooms.map(room => ({
        name: room.name,
        participants: room.numParticipants,
        createdAt: room.creationTime,
        metadata: room.metadata ? JSON.parse(room.metadata) : null,
      }));
      
      // Check for cloud agents specifically
      for (const agent of deployedAgents) {
        try {
          const cloudStatus = await LiveKitService.getCloudAgentStatus(agent.agentId);
          if (cloudStatus.success) {
            cloudAgents.push({
              agentId: agent.agentId,
              status: cloudStatus.status,
              logs: cloudStatus.logs?.slice(-5) // Last 5 log lines
            });
          }
        } catch (e) {
          // Not a cloud agent, skip
        }
      }
    } catch (e) {
      console.error("Error fetching rooms:", e);
    }
    
    // Check Python agent status
    let pythonAgentStatus = null;
    const pythonAgentPath = path.join(process.cwd(), '..', 'ai-agent');
    if (fs.existsSync(pythonAgentPath)) {
      const requirementsPath = path.join(pythonAgentPath, 'requirements.txt');
      if (fs.existsSync(requirementsPath)) {
        pythonAgentStatus = {
          exists: true,
          path: pythonAgentPath,
          hasLivekitAgents: true, // We know from requirements.txt it uses livekit-agents
        };
      }
    }
    
    res.status(200).json({
      connection: connectionStatus,
      deployedAgents: deployedAgents,
      cloudAgents: cloudAgents,
      rooms: rooms,
      pythonAgent: pythonAgentStatus,
      hasAgentDirectory: hasAgentDirectory,
      livekitSDKs: {
        client: "livekit-client@2.15.7",
        serverSDK: "livekit-server-sdk@2.13.3",
        pythonAgents: pythonAgentStatus ? "livekit-agents@1.0.23" : null,
      },
      summary: {
        totalDeployedAgents: deployedAgents.length,
        totalCloudAgents: cloudAgents.length,
        totalRooms: rooms.length,
        activeRooms: rooms.filter(r => r.participants > 0).length,
        isConnected: connectionStatus.connected,
      }
    });
    
  } catch (error) {
    console.error("LiveKit status error:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Unknown error",
      connection: { connected: false },
      deployedAgents: [],
      cloudAgents: [],
      rooms: [],
      summary: {
        totalDeployedAgents: 0,
        totalCloudAgents: 0,
        totalRooms: 0,
        activeRooms: 0,
        isConnected: false,
      }
    });
  }
}
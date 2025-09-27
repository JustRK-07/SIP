import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { LiveKitService } from "@/lib/livekit";
import { RoomServiceClient } from "livekit-server-sdk";

export const livekitSyncRouter = createTRPCRouter({
  // Sync all agents with LiveKit cloud status
  syncAgentStatus: publicProcedure
    .mutation(async ({ ctx }) => {
      try {
        console.log("[SYNC] Starting LiveKit agent status synchronization");
        
        // Get all agents from database
        const agents = await ctx.prisma.agent.findMany();
        
        // Get actual LiveKit rooms/agents
        const deployedAgents = await LiveKitService.listDeployedAgents();
        
        // Check actual status for each agent - room must have participants to be "running"
        const updates = [];
        for (const agent of agents) {
          const agentStatus = await LiveKitService.getAgentStatus(agent.id);
          
          // Determine correct status based on LiveKit reality
          let newStatus = agent.status;
          
          if (agent.status === "RUNNING" && (!agentStatus.isDeployed || agentStatus.participants === 0)) {
            // Agent thinks it's running but either no room or empty room (no agent process)
            newStatus = "ACTIVE"; // Room exists but no agent running
            console.log(`[SYNC] Agent ${agent.id} marked as RUNNING but has ${agentStatus.participants} participants, updating to ACTIVE`);
          } else if (agent.status === "ACTIVE" && agentStatus.isDeployed && agentStatus.participants > 0) {
            // Agent has participants in room - actually running
            newStatus = "RUNNING";
            console.log(`[SYNC] Agent ${agent.id} marked as ACTIVE but has ${agentStatus.participants} participants, updating to RUNNING`);
          } else if (agent.status !== "STOPPED" && !agentStatus.roomName) {
            // No room exists at all
            newStatus = "STOPPED";
            console.log(`[SYNC] Agent ${agent.id} has no LiveKit room, updating to STOPPED`);
          }
          
          // Update if needed
          if (newStatus !== agent.status) {
            const updated = await ctx.prisma.agent.update({
              where: { id: agent.id },
              data: { 
                status: newStatus,
                updatedAt: new Date()
              }
            });
            updates.push({
              agentId: agent.id,
              oldStatus: agent.status,
              newStatus: newStatus,
              inLiveKit: agentStatus.isDeployed,
              hasParticipants: agentStatus.participants > 0
            });
          }
        }
        
        console.log(`[SYNC] Synchronization complete. Updated ${updates.length} agents`);
        
        return {
          success: true,
          message: `Synchronized ${agents.length} agents with LiveKit cloud`,
          updates: updates,
          livekitAgents: deployedAgents.length,
          databaseAgents: agents.length
        };
      } catch (error) {
        console.error("[SYNC] Failed to sync agent status:", error);
        throw new Error(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Get LiveKit deployment status for a specific agent
  getAgentLiveKitStatus: publicProcedure
    .input(z.object({
      agentId: z.string()
    }))
    .query(async ({ input }) => {
      try {
        const status = await LiveKitService.getAgentStatus(input.agentId);
        
        // Also check cloud agent status
        let cloudStatus = null;
        try {
          cloudStatus = await LiveKitService.getCloudAgentStatus(input.agentId);
        } catch (e) {
          // Not a cloud agent
        }
        
        return {
          isDeployed: status.isDeployed,
          isActive: status.isActive,
          roomName: status.roomName,
          participants: status.participants,
          metadata: status.metadata,
          cloudStatus: cloudStatus,
          actuallyRunning: status.isDeployed && (status.isActive || status.participants > 0)
        };
      } catch (error) {
        return {
          isDeployed: false,
          isActive: false,
          actuallyRunning: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }),

  // Get all LiveKit rooms/agents
  getLiveKitRooms: publicProcedure
    .query(async () => {
      try {
        const rooms = await LiveKitService.listDeployedAgents();
        
        // Get LiveKit client directly to get more details
        const livekitClient = new RoomServiceClient(
          process.env.LIVEKIT_API_ENDPOINT!,
          process.env.LIVEKIT_API_KEY!,
          process.env.LIVEKIT_API_SECRET!
        );
        
        const allRooms = await livekitClient.listRooms();
        
        return {
          agentRooms: rooms,
          allRooms: allRooms.map(room => ({
            name: room.name,
            sid: room.sid,
            participants: room.numParticipants,
            maxParticipants: room.maxParticipants,
            creationTime: room.creationTime,
            metadata: room.metadata ? JSON.parse(room.metadata) : null
          })),
          totalRooms: allRooms.length,
          agentRoomsCount: rooms.length
        };
      } catch (error) {
        return {
          agentRooms: [],
          allRooms: [],
          totalRooms: 0,
          agentRoomsCount: 0,
          error: error instanceof Error ? error.message : 'Connection failed'
        };
      }
    })
});
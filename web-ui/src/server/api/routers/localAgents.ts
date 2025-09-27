import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const localAgentsRouter = createTRPCRouter({
  // Register or update local agent heartbeat
  heartbeat: publicProcedure
    .input(
      z.object({
        agentId: z.string().min(1, "Agent ID is required"),
        name: z.string().min(1, "Agent name is required"),
        description: z.string().optional(),
        model: z.string().default("gpt-3.5-turbo"),
        voice: z.string().default("nova"),
        temperature: z.number().min(0).max(2).default(0.7),
        prompt: z.string().min(1, "Agent prompt is required"),
        processId: z.string().optional(),
        port: z.number().optional(),
        host: z.string().default("localhost"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const now = new Date();
        
        // Upsert local agent record
        const localAgent = await ctx.prisma.localAgent.upsert({
          where: { agentId: input.agentId },
          update: {
            name: input.name,
            description: input.description,
            model: input.model,
            voice: input.voice,
            temperature: input.temperature,
            prompt: input.prompt,
            status: "RUNNING",
            lastHeartbeat: now,
            processId: input.processId,
            port: input.port,
            host: input.host,
            updatedAt: now,
          },
          create: {
            agentId: input.agentId,
            name: input.name,
            description: input.description,
            model: input.model,
            voice: input.voice,
            temperature: input.temperature,
            prompt: input.prompt,
            status: "RUNNING",
            lastHeartbeat: now,
            processId: input.processId,
            port: input.port,
            host: input.host,
          },
        });

        return {
          success: true,
          agent: localAgent,
          message: "Heartbeat registered successfully",
        };
      } catch (error) {
        console.error("Error registering heartbeat:", error);
        throw new Error(`Failed to register heartbeat: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Get all local agents
  getAll: publicProcedure.query(async ({ ctx }) => {
    try {
      const localAgents = await ctx.prisma.localAgent.findMany({
        orderBy: { lastHeartbeat: "desc" },
      });

      // Mark agents as offline if they haven't sent heartbeat in 30 seconds
      const now = new Date();
      const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);

      const updatedAgents = await Promise.all(
        localAgents.map(async (agent) => {
          if (agent.lastHeartbeat < thirtySecondsAgo && agent.status === "RUNNING") {
            const updatedAgent = await ctx.prisma.localAgent.update({
              where: { id: agent.id },
              data: { status: "OFFLINE" },
            });
            return updatedAgent;
          }
          return agent;
        })
      );

      return {
        success: true,
        agents: updatedAgents,
      };
    } catch (error) {
      console.error("Error fetching local agents:", error);
      throw new Error(`Failed to fetch local agents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }),

  // Get local agent by ID
  getById: publicProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const localAgent = await ctx.prisma.localAgent.findUnique({
          where: { agentId: input.agentId },
        });

        if (!localAgent) {
          throw new Error("Local agent not found");
        }

        return {
          success: true,
          agent: localAgent,
        };
      } catch (error) {
        console.error("Error fetching local agent:", error);
        throw new Error(`Failed to fetch local agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Remove local agent (when it stops)
  remove: publicProcedure
    .input(z.object({ agentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.prisma.localAgent.delete({
          where: { agentId: input.agentId },
        });

        return {
          success: true,
          message: "Local agent removed successfully",
        };
      } catch (error) {
        console.error("Error removing local agent:", error);
        throw new Error(`Failed to remove local agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Clean up offline agents (older than 5 minutes)
  cleanup: publicProcedure.mutation(async ({ ctx }) => {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const deletedAgents = await ctx.prisma.localAgent.deleteMany({
        where: {
          status: "OFFLINE",
          lastHeartbeat: {
            lt: fiveMinutesAgo,
          },
        },
      });

      return {
        success: true,
        deletedCount: deletedAgents.count,
        message: `Cleaned up ${deletedAgents.count} offline agents`,
      };
    } catch (error) {
      console.error("Error cleaning up local agents:", error);
      throw new Error(`Failed to cleanup local agents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }),
});


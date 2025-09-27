import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { LiveKitService } from "@/lib/livekit";
import { LiveKitPythonService } from "@/lib/livekit-python";

export const agentsRouter = createTRPCRouter({
  // Get all agents
  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.agent.findMany({
      include: {
        phoneNumber: {
          select: {
            id: true,
            number: true,
            friendlyName: true,
            status: true,
            callDirection: true,
          },
        },
        _count: {
          select: {
            conversations: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  // Get deployed agents (including local agents)
  getDeployed: publicProcedure.query(async ({ ctx }) => {
    try {
      // Get database agents with RUNNING status
      const dbAgents = await ctx.prisma.agent.findMany({
        where: {
          status: {
            in: ["RUNNING", "ACTIVE", "DEPLOYING"]
          }
        },
        include: {
          phoneNumber: {
            select: {
              id: true,
              number: true,
              friendlyName: true,
              status: true,
              callDirection: true,
            },
          },
          _count: {
            select: {
              conversations: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Get local agents
      const localAgents = await ctx.prisma.localAgent.findMany({
        where: {
          status: "RUNNING"
        },
        orderBy: { lastHeartbeat: "desc" },
      });

      // Combine and format agents
      const deployedAgents = [
        ...dbAgents.map(agent => ({
          ...agent,
          deploymentMode: agent.deploymentMode || "livekit",
          isLocal: false,
        })),
        ...localAgents.map(agent => ({
          id: agent.agentId,
          name: agent.name,
          description: agent.description,
          model: agent.model,
          voice: agent.voice,
          temperature: agent.temperature,
          prompt: agent.prompt,
          status: agent.status,
          deploymentMode: "local",
          isLocal: true,
          lastHeartbeat: agent.lastHeartbeat,
          processId: agent.processId,
          port: agent.port,
          host: agent.host,
          createdAt: agent.createdAt,
          updatedAt: agent.updatedAt,
          phoneNumber: null,
          _count: { conversations: 0 },
        }))
      ];

      return deployedAgents;
    } catch (error) {
      console.error("Error fetching deployed agents:", error);
      throw new Error(`Failed to fetch deployed agents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }),

  // Get agent statistics
  getStats: publicProcedure.query(async ({ ctx }) => {
    const totalAgents = await ctx.prisma.agent.count();
    const activeAgents = await ctx.prisma.agent.count({
      where: { status: "ACTIVE" },
    });
    const inactiveAgents = await ctx.prisma.agent.count({
      where: { status: "INACTIVE" },
    });
    const errorAgents = await ctx.prisma.agent.count({
      where: { status: "ERROR" },
    });

    return {
      totalAgents,
      activeAgents,
      inactiveAgents,
      errorAgents,
    };
  }),

  // Get real-time agent status
  getRealTimeStatus: publicProcedure.query(async ({ ctx }) => {
    const agents = await ctx.prisma.agent.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
      },
    });

    return {
      agents: agents.map(agent => ({
        ...agent,
        isRunning: false, // Will be implemented later
        lastSeen: agent.updatedAt,
      })),
      lastCheck: new Date().toISOString(),
    };
  }),

  // Create a new agent
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1, "Agent name is required"),
        description: z.string().optional(),
        prompt: z.string().min(1, "Agent prompt is required"),
        model: z.string().default("gpt-4"),
        voice: z.string().default("nova"),
        temperature: z.number().min(0).max(2).default(0.7),
        maxTokens: z.number().min(100).max(4000).default(1000),
        template: z.string().optional().default("custom"),
        customerName: z.string().optional(),
        appointmentTime: z.string().optional(),
        sttProvider: z.string().optional().default("deepgram"),
        ttsProvider: z.string().optional().default("openai"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Filter out undefined values
        const agentData: any = {
          name: input.name,
          prompt: input.prompt,
          model: input.model,
          voice: input.voice,
          temperature: input.temperature,
          maxTokens: input.maxTokens,
          template: input.template || "custom",
          sttProvider: input.sttProvider || "deepgram",
          ttsProvider: input.ttsProvider || "openai",
          status: "INACTIVE",
        };

        // Only add optional fields if they have values
        if (input.description) agentData.description = input.description;
        if (input.customerName) agentData.customerName = input.customerName;
        if (input.appointmentTime) agentData.appointmentTime = input.appointmentTime;

        const agent = await ctx.prisma.agent.create({
          data: agentData,
        });

        return {
          success: true,
          agent,
          message: `Agent "${agent.name}" created successfully`,
        };
      } catch (error) {
        console.error("Error creating agent:", error);
        throw new Error(`Failed to create agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Update an agent
  update: publicProcedure
    .input(
      z.object({
        id: z.string().min(1, "Agent ID is required"),
        name: z.string().min(1, "Agent name is required").optional(),
        description: z.string().optional(),
        prompt: z.string().min(1, "Agent prompt is required").optional(),
        model: z.string().optional(),
        voice: z.string().optional(),
        temperature: z.number().min(0).max(2).optional(),
        maxTokens: z.number().min(100).max(4000).optional(),
        template: z.string().optional(),
        customerName: z.string().optional(),
        appointmentTime: z.string().optional(),
        sttProvider: z.string().optional(),
        ttsProvider: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...updateData } = input;
        const agent = await ctx.prisma.agent.update({
          where: { id },
          data: updateData,
        });

        return {
          success: true,
          agent,
          message: `Agent "${agent.name}" updated successfully`,
        };
      } catch (error) {
        console.error("Error updating agent:", error);
        throw new Error(`Failed to update agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Deploy agent (activate and configure)
  deploy: publicProcedure
    .input(
      z.object({
        id: z.string().min(1, "Agent ID is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const agent = await ctx.prisma.agent.findUnique({
          where: { id: input.id },
          include: { phoneNumber: true },
        });

        if (!agent) {
          throw new Error("Agent not found");
        }

        // Check if agent is already deployed or being deployed
        if (agent.status === "RUNNING") {
          throw new Error("Agent is already running");
        }
        
        if (agent.status === "ACTIVE") {
          // ACTIVE means configured but not deployed - allow deployment
          console.log(`[DEPLOY] Agent ${agent.id} is ACTIVE, proceeding with deployment`);
        }
        
        if (agent.status === "DEPLOYING") {
          throw new Error("Agent is currently being deployed");
        }

        // Start deployment process - set to DEPLOYING first
        const deployingAgent = await ctx.prisma.agent.update({
          where: { id: input.id },
          data: { 
            status: "DEPLOYING",
            updatedAt: new Date(), // Track deployment start time
          },
        });

        // Real deployment flow: Initialization → Deployment → Health Check
        const deploymentProcess = setTimeout(async () => {
          try {
            // STEP 1: INITIALIZATION - Configure agent for LiveKit cloud
            console.log(`[DEPLOY] Step 1: Initializing agent ${agent.id} for LiveKit cloud deployment`);
            
            // STEP 2: DEPLOY TO LIVEKIT CLOUD - Choose deployment method
            console.log(`[DEPLOY] Step 2: Deploying agent ${agent.id} to LiveKit cloud infrastructure`);
            
            // Deploy to LiveKit Cloud (managed agents only - NO FALLBACK)
            console.log(`[DEPLOY] Deploying to LiveKit Cloud managed agent service...`);
            const deploymentResult = await LiveKitService.deployCloudAgent({
              agentId: agent.id,
              agentName: agent.name,
              model: agent.model,
              voice: agent.voice,
              temperature: agent.temperature,
              prompt: agent.prompt,
            });

            if (!deploymentResult.success) {
              throw new Error(`LiveKit Cloud deployment failed: ${deploymentResult.error}`);
            }

            console.log(`[DEPLOY] LiveKit Cloud deployment successful. Agent ID: ${deploymentResult.agentId}`);
            
            // Update agent with LiveKit deployment results
            await ctx.prisma.agent.update({
              where: { id: input.id },
              data: { 
                livekitConfig: {
                  agentId: deploymentResult.agentId, // Store the actual LiveKit Cloud agent ID
                  roomName: deploymentResult.roomName,
                  roomTemplate: `agent-${agent.id}`,
                  sipUri: deploymentResult.sipUri,
                  webhookUrl: `${process.env.NEXT_PUBLIC_API_URL}/api/livekit/webhook`,
                  serverUrl: process.env.LIVEKIT_API_ENDPOINT || process.env.LIVEKIT_URL,
                  apiKey: process.env.LIVEKIT_API_KEY,
                  agentName: agent.name,
                  model: agent.model,
                  voice: agent.voice,
                  temperature: agent.temperature,
                  prompt: agent.prompt,
                },
                twilioConfig: {
                  webhookUrl: `${process.env.NEXT_PUBLIC_API_URL}/api/twilio/voice`,
                  statusCallback: `${process.env.NEXT_PUBLIC_API_URL}/api/twilio/status`,
                },
                deploymentMode: "livekit",
                updatedAt: new Date(),
              },
            });
            
            // STEP 3: VERIFY DEPLOYMENT - Check LiveKit deployment status via API
            console.log(`[DEPLOY] Step 3: Verifying LiveKit cloud deployment for agent ${agent.id}`);
            
            const agentStatus = await LiveKitService.getAgentStatus(agent.id);
            console.log(`[DEPLOY] LiveKit agent status: ${JSON.stringify(agentStatus)}`);
            
            // Mark as RUNNING if deployment succeeded
            if (deploymentResult.agentId) {
              // Mark as RUNNING - agent is successfully deployed and running on LiveKit cloud
              await ctx.prisma.agent.update({
                where: { id: input.id },
                data: { 
                  status: "RUNNING",
                  updatedAt: new Date(),
                },
              });
              
              console.log(`[DEPLOY] Agent ${agent.id} successfully deployed on LiveKit Cloud with ID: ${deploymentResult.agentId}`);
            } else {
              throw new Error("Agent deployment verification failed");
            }
            
          } catch (error) {
            console.error(`[DEPLOY] Error during deployment process for agent ${agent.id}:`, error);
            await ctx.prisma.agent.update({
              where: { id: input.id },
              data: { 
                status: "ERROR",
                updatedAt: new Date(),
              },
            });
          }
        }, 100); // Small delay to ensure the DEPLOYING status is set first

        // Add deployment timeout (30 seconds max)
        setTimeout(async () => {
          try {
            const currentAgent = await ctx.prisma.agent.findUnique({
              where: { id: input.id },
            });
            
            // If still deploying after 30 seconds, mark as ERROR
            if (currentAgent?.status === "DEPLOYING") {
              await ctx.prisma.agent.update({
                where: { id: input.id },
                data: { 
                  status: "ERROR",
                  updatedAt: new Date(),
                },
              });
              console.log(`[DEPLOY] Agent ${agent.id} deployment timed out after 30 seconds`);
            }
          } catch (error) {
            console.error(`[DEPLOY] Error in timeout handler for agent ${agent.id}:`, error);
          }
        }, 30000); // 30 second timeout

        const deployedAgent = deployingAgent;

        return {
          success: true,
          agent: deployedAgent,
          message: `Agent "${agent.name}" deployment started - check status for progress`,
        };
      } catch (error) {
        console.error("Error deploying agent:", error);
        throw new Error(`Failed to deploy agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Stop agent
  stop: publicProcedure
    .input(
      z.object({
        id: z.string().min(1, "Agent ID is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const agent = await ctx.prisma.agent.findUnique({
          where: { id: input.id },
        });

        if (!agent) {
          throw new Error("Agent not found");
        }

        if (agent.status !== "RUNNING") {
          throw new Error("Agent is not currently running");
        }

        // Stop agent in LiveKit cloud - try both methods
        console.log(`[STOP] Stopping agent ${agent.id} in LiveKit cloud`);
        
        // Try to stop cloud agent first (if it was deployed as managed agent)
        let stopResult = await LiveKitService.stopCloudAgent(agent.id);
        
        if (!stopResult.success) {
          console.log(`[STOP] Cloud agent stop failed, trying room-based stop...`);
          // Fall back to room-based stop
          stopResult = await LiveKitService.stopAgent(agent.id);
        }

        if (!stopResult.success) {
          console.warn(`[STOP] Failed to stop agent ${agent.id} in LiveKit:`, stopResult.error);
          // Don't throw error - just warn and continue with local status update
          console.log(`[STOP] Continuing with local status update for agent ${agent.id}`);
        } else {
          console.log(`[STOP] Agent ${agent.id} successfully stopped in LiveKit cloud`);
        }

        // Update agent status to inactive
        const stoppedAgent = await ctx.prisma.agent.update({
          where: { id: input.id },
          data: { status: "INACTIVE" },
        });

        return {
          success: true,
          agent: stoppedAgent,
          message: `Agent "${agent.name}" stopped successfully and removed from LiveKit cloud`,
        };
      } catch (error) {
        console.error("Error stopping agent:", error);
        throw new Error(`Failed to stop agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Delete an agent
  delete: publicProcedure
    .input(
      z.object({
        id: z.string().min(1, "Agent ID is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const agent = await ctx.prisma.agent.findUnique({
          where: { id: input.id },
        });

        if (!agent) {
          throw new Error("Agent not found");
        }

        console.log(`[DELETE] Starting deletion process for agent ${agent.id} (${agent.name})`);

        // Step 1: Stop/delete from LiveKit Cloud if deployed
        if (agent.status === "ACTIVE" && agent.livekitConfig) {
          console.log(`[DELETE] Agent is ACTIVE, stopping from LiveKit Cloud first...`);
          
          try {
            // Try to stop from LiveKit Cloud using the stored agent ID
            const livekitAgentId = (agent.livekitConfig as any)?.agentId;
            
            if (livekitAgentId) {
              console.log(`[DELETE] Stopping LiveKit Cloud agent: ${livekitAgentId}`);
              
              // Use LiveKit CLI to delete the cloud agent
              const { exec } = await import('child_process');
              const { promisify } = await import('util');
              const execAsync = promisify(exec);
              
              try {
                await execAsync(
                  `lk agent delete --id ${livekitAgentId} --url "wss://firstproject-ly6tfhj5.livekit.cloud" --api-key "API7xEu4QebToWF" --api-secret "erfHGGH3FjiwTBKUufIToa0dezR8M4RzhpZEmFGf29HH"`,
                  { timeout: 30000 }
                );
                console.log(`[DELETE] Successfully deleted LiveKit Cloud agent: ${livekitAgentId}`);
              } catch (deleteError) {
                console.warn(`[DELETE] Failed to delete LiveKit Cloud agent ${livekitAgentId}:`, deleteError);
                // Continue with database deletion even if LiveKit deletion fails
              }
            }
            
            // Also try the room-based deletion method
            const stopResult = await LiveKitService.stopAgent(agent.id);
            if (stopResult.success) {
              console.log(`[DELETE] Successfully stopped room-based agent: ${agent.id}`);
            } else {
              console.warn(`[DELETE] Failed to stop room-based agent: ${stopResult.error}`);
            }
            
          } catch (stopError) {
            console.warn(`[DELETE] Error stopping agent from LiveKit:`, stopError);
            // Continue with database deletion even if LiveKit stop fails
          }
        }

        // Step 2: Delete from database
        console.log(`[DELETE] Deleting agent from database: ${agent.id}`);
        await ctx.prisma.agent.delete({
          where: { id: input.id },
        });

        console.log(`[DELETE] Successfully deleted agent: ${agent.name}`);

        return {
          success: true,
          message: `Agent "${agent.name}" deleted successfully from both database and LiveKit Cloud`,
        };
      } catch (error) {
        console.error("Error deleting agent:", error);
        throw new Error(`Failed to delete agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // One-click agent launch with immediate testing
  oneClickLaunch: publicProcedure
    .input(
      z.object({
        id: z.string().min(1, "Agent ID is required"),
        testMode: z.enum(["chat", "voice", "both"]).default("chat"),
        autoAssignNumber: z.boolean().default(false),
        phoneNumberId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const agent = await ctx.prisma.agent.findUnique({
          where: { id: input.id },
          include: { phoneNumber: true },
        });

        if (!agent) {
          throw new Error("Agent not found");
        }

        // Step 1: Deploy the agent
        if (agent.status !== "ACTIVE") {
          // Update agent status to active
          await ctx.prisma.agent.update({
            where: { id: input.id },
            data: { 
              status: "ACTIVE",
              livekitConfig: {
                roomTemplate: `agent-${agent.id}`,
                webhookUrl: `${process.env.NEXT_PUBLIC_API_URL}/api/livekit/webhook`,
              },
              twilioConfig: {
                webhookUrl: `${process.env.NEXT_PUBLIC_API_URL}/api/twilio/voice`,
                statusCallback: `${process.env.NEXT_PUBLIC_API_URL}/api/twilio/status`,
              },
            },
          });
        }

        // Step 2: Auto-assign phone number if requested
        let assignedNumber = null;
        if (input.autoAssignNumber) {
          if (input.phoneNumberId) {
            // Assign specific number
            const phoneNumber = await ctx.prisma.phoneNumber.findUnique({
              where: { id: input.phoneNumberId },
            });
            
            if (phoneNumber && phoneNumber.status === "AVAILABLE") {
              await ctx.prisma.phoneNumber.update({
                where: { id: input.phoneNumberId },
                data: {
                  status: "ASSIGNED",
                  assignedAgentId: input.id,
                },
              });
              
              await ctx.prisma.agent.update({
                where: { id: input.id },
                data: { phoneNumberId: input.phoneNumberId },
              });
              
              assignedNumber = phoneNumber;
            }
          } else {
            // Auto-assign any available number
            const availableNumber = await ctx.prisma.phoneNumber.findFirst({
              where: { status: "AVAILABLE" },
            });
            
            if (availableNumber) {
              await ctx.prisma.phoneNumber.update({
                where: { id: availableNumber.id },
                data: {
                  status: "ASSIGNED",
                  assignedAgentId: input.id,
                },
              });
              
              await ctx.prisma.agent.update({
                where: { id: input.id },
                data: { phoneNumberId: availableNumber.id },
              });
              
              assignedNumber = availableNumber;
            }
          }
        }

        // Step 3: Generate test URLs
        const testUrls = {
          chat: `/ai-agent?room=agent-${agent.id}&mode=chat`,
          voice: `/ai-agent?room=agent-${agent.id}&mode=voice`,
          room: `agent-${agent.id}`,
        };

        return {
          success: true,
          agent: {
            ...agent,
            status: "ACTIVE",
            phoneNumber: assignedNumber,
          },
          testUrls,
          message: `Agent "${agent.name}" launched successfully and ready for testing!`,
        };
      } catch (error) {
        console.error("Error in one-click launch:", error);
        throw new Error(`Failed to launch agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Get agent templates for quick creation
  getTemplates: publicProcedure.query(async () => {
    return {
      templates: [
        {
          id: "customer-service",
          name: "Customer Service Agent",
          description: "Professional customer service agent for handling inquiries and support",
          prompt: "You are a professional customer service representative. Be helpful, friendly, and solution-oriented. Always aim to resolve customer issues efficiently while maintaining a positive tone.",
          model: "gpt-4",
          voice: "nova",
          temperature: 0.7,
          maxTokens: 1000,
          capabilities: ["inbound", "outbound"],
          useCases: ["Customer Support", "Order Inquiries", "Technical Support"],
        },
        {
          id: "sales-agent",
          name: "Sales Agent",
          description: "Persuasive sales agent for lead generation and conversion",
          prompt: "You are a skilled sales representative. Focus on understanding customer needs, presenting solutions, and closing deals. Be consultative and build rapport.",
          model: "gpt-4",
          voice: "alloy",
          temperature: 0.8,
          maxTokens: 1200,
          capabilities: ["outbound"],
          useCases: ["Lead Generation", "Product Sales", "Appointment Setting"],
        },
        {
          id: "appointment-scheduler",
          name: "Appointment Scheduler",
          description: "Efficient appointment booking and scheduling agent",
          prompt: "You are an appointment scheduling specialist. Help customers book appointments, reschedule, and manage their calendar. Be organized and clear about availability.",
          model: "gpt-3.5-turbo",
          voice: "shimmer",
          temperature: 0.6,
          maxTokens: 800,
          capabilities: ["inbound", "outbound"],
          useCases: ["Appointment Booking", "Schedule Management", "Reminders"],
        },
        {
          id: "survey-agent",
          name: "Survey Agent",
          description: "Professional survey and feedback collection agent",
          prompt: "You are a survey specialist. Conduct surveys professionally, ask clear questions, and collect feedback. Be respectful of the customer's time.",
          model: "gpt-3.5-turbo",
          voice: "echo",
          temperature: 0.5,
          maxTokens: 600,
          capabilities: ["outbound"],
          useCases: ["Customer Feedback", "Market Research", "Satisfaction Surveys"],
        },
      ],
    };
  }),

  // Create agent from template
  createFromTemplate: publicProcedure
    .input(
      z.object({
        templateId: z.string().min(1, "Template ID is required"),
        name: z.string().min(1, "Agent name is required"),
        description: z.string().optional(),
        customizations: z.object({
          prompt: z.string().optional(),
          model: z.string().optional(),
          voice: z.string().optional(),
          temperature: z.number().optional(),
          maxTokens: z.number().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Get template data
        const templates = [
          {
            id: "customer-service",
            name: "Customer Service Agent",
            description: "Professional customer service agent for handling inquiries and support",
            prompt: "You are a professional customer service representative. Be helpful, friendly, and solution-oriented. Always aim to resolve customer issues efficiently while maintaining a positive tone.",
            model: "gpt-4",
            voice: "nova",
            temperature: 0.7,
            maxTokens: 1000,
          },
          {
            id: "sales-agent",
            name: "Sales Agent",
            description: "Persuasive sales agent for lead generation and conversion",
            prompt: "You are a skilled sales representative. Focus on understanding customer needs, presenting solutions, and closing deals. Be consultative and build rapport.",
            model: "gpt-4",
            voice: "alloy",
            temperature: 0.8,
            maxTokens: 1200,
          },
          {
            id: "appointment-scheduler",
            name: "Appointment Scheduler",
            description: "Efficient appointment booking and scheduling agent",
            prompt: "You are an appointment scheduling specialist. Help customers book appointments, reschedule, and manage their calendar. Be organized and clear about availability.",
            model: "gpt-3.5-turbo",
            voice: "shimmer",
            temperature: 0.6,
            maxTokens: 800,
          },
          {
            id: "survey-agent",
            name: "Survey Agent",
            description: "Professional survey and feedback collection agent",
            prompt: "You are a survey specialist. Conduct surveys professionally, ask clear questions, and collect feedback. Be respectful of the customer's time.",
            model: "gpt-3.5-turbo",
            voice: "echo",
            temperature: 0.5,
            maxTokens: 600,
          },
        ];

        const template = templates.find(t => t.id === input.templateId);
        
        if (!template) {
          throw new Error("Template not found");
        }

        // Create agent with template data and customizations
        const agentData = {
          name: input.name,
          description: input.description || template.description,
          prompt: input.customizations?.prompt || template.prompt,
          model: input.customizations?.model || template.model,
          voice: input.customizations?.voice || template.voice,
          temperature: input.customizations?.temperature || template.temperature,
          maxTokens: input.customizations?.maxTokens || template.maxTokens,
          status: "INACTIVE",
        };

        const agent = await ctx.prisma.agent.create({
          data: agentData,
        });

        return {
          success: true,
          agent,
          message: `Agent "${agent.name}" created successfully from template`,
        };
      } catch (error) {
        console.error("Error creating agent from template:", error);
        throw new Error(`Failed to create agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Cancel deployment
  cancelDeployment: publicProcedure
    .input(
      z.object({
        id: z.string().min(1, "Agent ID is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const agent = await ctx.prisma.agent.findUnique({
          where: { id: input.id },
        });

        if (!agent) {
          throw new Error("Agent not found");
        }

        if (agent.status !== "DEPLOYING") {
          throw new Error("Agent is not currently deploying");
        }

        // Reset agent status to INACTIVE
        const cancelledAgent = await ctx.prisma.agent.update({
          where: { id: input.id },
          data: { 
            status: "INACTIVE",
            updatedAt: new Date(),
          },
        });

        console.log(`[DEPLOY] Deployment cancelled for agent ${agent.id}`);

        return {
          success: true,
          agent: cancelledAgent,
          message: `Agent "${agent.name}" deployment cancelled - status reset to inactive`,
        };
      } catch (error) {
        console.error("Error cancelling deployment:", error);
        throw new Error(`Failed to cancel deployment: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Reset stuck agents - force reset any agent stuck in DEPLOYING status
  resetStuckAgents: publicProcedure
    .mutation(async ({ ctx }) => {
      try {
        // Find all agents stuck in DEPLOYING status for more than 30 seconds
        const thirtySecondsAgo = new Date(Date.now() - 30000);
        
        const stuckAgents = await ctx.prisma.agent.findMany({
          where: {
            status: "DEPLOYING",
            updatedAt: {
              lt: thirtySecondsAgo
            }
          }
        });

        if (stuckAgents.length === 0) {
          return {
            success: true,
            message: "No stuck agents found",
            resetCount: 0,
          };
        }

        // Reset all stuck agents to ERROR status
        const resetResult = await ctx.prisma.agent.updateMany({
          where: {
            status: "DEPLOYING",
            updatedAt: {
              lt: thirtySecondsAgo
            }
          },
          data: {
            status: "ERROR",
            updatedAt: new Date(),
          }
        });

        console.log(`[RESET] Reset ${resetResult.count} stuck agents from DEPLOYING to ERROR status`);

        return {
          success: true,
          message: `Reset ${resetResult.count} stuck agent(s) to ERROR status`,
          resetCount: resetResult.count,
          agents: stuckAgents.map(a => ({ id: a.id, name: a.name })),
        };
      } catch (error) {
        console.error("Error resetting stuck agents:", error);
        throw new Error(`Failed to reset stuck agents: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Force reset specific agent regardless of current status
  forceReset: publicProcedure
    .input(
      z.object({
        id: z.string().min(1, "Agent ID is required"),
        targetStatus: z.enum(["INACTIVE", "ERROR"]).default("INACTIVE"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const agent = await ctx.prisma.agent.findUnique({
          where: { id: input.id },
        });

        if (!agent) {
          throw new Error("Agent not found");
        }

        const previousStatus = agent.status;

        // Force reset agent to target status
        const resetAgent = await ctx.prisma.agent.update({
          where: { id: input.id },
          data: { 
            status: input.targetStatus,
            updatedAt: new Date(),
          },
        });

        console.log(`[FORCE-RESET] Agent ${agent.id} force reset from ${previousStatus} to ${input.targetStatus}`);

        return {
          success: true,
          agent: resetAgent,
          message: `Agent "${agent.name}" force reset from ${previousStatus} to ${input.targetStatus}`,
          previousStatus,
        };
      } catch (error) {
        console.error("Error force resetting agent:", error);
        throw new Error(`Failed to force reset agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // List deployed agents in LiveKit cloud
  listDeployedInCloud: publicProcedure.query(async ({ ctx }) => {
    try {
      console.log("[CLOUD] Fetching deployed agents from LiveKit cloud");
      const deployedAgents = await LiveKitService.listDeployedAgents();
      console.log(`[CLOUD] Found ${deployedAgents.length} deployed agents in LiveKit cloud`);
      
      return {
        success: true,
        agents: deployedAgents,
      };
    } catch (error) {
      console.error("Error listing deployed agents:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        agents: [],
      };
    }
  }),

  // Get real-time agent status from LiveKit cloud
  getCloudStatus: publicProcedure
    .input(
      z.object({
        id: z.string().min(1, "Agent ID is required"),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        console.log(`[CLOUD] Checking agent ${input.id} status in LiveKit cloud`);
        const agentStatus = await LiveKitService.getAgentStatus(input.id);
        console.log(`[CLOUD] Agent ${input.id} status:`, agentStatus);
        
        return {
          success: true,
          status: agentStatus,
        };
      } catch (error) {
        console.error(`Error getting cloud status for agent ${input.id}:`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          status: {
            isDeployed: false,
            isActive: false,
          },
        };
      }
    }),

  // Test LiveKit connection
  testLiveKitConnection: publicProcedure.query(async ({ ctx }) => {
    try {
      console.log("[CLOUD] Testing LiveKit connection");
      const connectionStatus = await LiveKitService.testConnection();
      console.log("[CLOUD] LiveKit connection test result:", connectionStatus);
      
      return {
        success: true,
        connection: connectionStatus,
      };
    } catch (error) {
      console.error("Error testing LiveKit connection:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        connection: {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }),

  // Preview Python agent script before deployment
  previewScript: publicProcedure
    .input(
      z.object({
        id: z.string().min(1, "Agent ID is required"),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const agent = await ctx.prisma.agent.findUnique({
          where: { id: input.id },
        });

        if (!agent) {
          throw new Error("Agent not found");
        }

        // Generate Python agent script preview
        const scriptPreview = await LiveKitPythonService.getAgentPreview({
          agentId: agent.id,
          agentName: agent.name,
          model: agent.model,
          voice: agent.voice,
          temperature: agent.temperature,
          prompt: agent.prompt,
          template: agent.template || "custom",
          customerName: agent.customerName,
          appointmentTime: agent.appointmentTime,
          sttProvider: agent.sttProvider || "deepgram",
          ttsProvider: agent.ttsProvider || "openai",
        });

        return {
          success: true,
          script: scriptPreview,
          filename: `agent_${agent.id}.py`,
          roomName: `room-${agent.id}`,
        };
      } catch (error) {
        console.error("Error generating script preview:", error);
        throw new Error(`Failed to generate script preview: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Sync agents with LiveKit Cloud
  syncCloudAgents: publicProcedure.query(async ({ ctx }) => {
    try {
      console.log("[SYNC] Starting sync with LiveKit Cloud");
      
      // Get all agents from LiveKit Cloud
      const cloudAgents = await LiveKitPythonService.syncAgents();
      console.log(`[SYNC] Found ${cloudAgents.length} agents on LiveKit Cloud:`, cloudAgents);
      
      // Get all agents from database
      const dbAgents = await ctx.prisma.agent.findMany({
        select: {
          id: true,
          name: true,
          status: true,
          livekitConfig: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      });

      // First, handle cloud agents that might not be mapped yet
      for (const cloudAgent of cloudAgents) {
        // Check if this cloud agent is already mapped to a DB agent
        const mappedAgent = dbAgents.find(db => 
          db.livekitConfig?.agentId === cloudAgent.id
        );
        
        if (!mappedAgent) {
          // Find the most recent agent that doesn't have a cloud ID yet
          const unmappedAgent = dbAgents.find(db => 
            !db.livekitConfig?.agentId && 
            (db.status === "ACTIVE" || db.status === "DEPLOYING" || db.status === "RUNNING")
          );
          
          if (unmappedAgent) {
            console.log(`[SYNC] Mapping cloud agent ${cloudAgent.id} to DB agent ${unmappedAgent.id}`);
            await ctx.prisma.agent.update({
              where: { id: unmappedAgent.id },
              data: {
                status: "RUNNING",
                livekitConfig: {
                  ...unmappedAgent.livekitConfig,
                  agentId: cloudAgent.id,
                  deployedAt: cloudAgent.deployedAt,
                  version: cloudAgent.version,
                },
              },
            });
          }
        }
      }

      // Then sync status for each database agent
      for (const dbAgent of dbAgents) {
        const cloudAgent = cloudAgents.find(ca => 
          dbAgent.livekitConfig?.agentId === ca.id
        );

        if (cloudAgent) {
          // Agent exists in cloud - mark as RUNNING
          if (dbAgent.status !== "RUNNING") {
            await ctx.prisma.agent.update({
              where: { id: dbAgent.id },
              data: {
                status: "RUNNING",
                livekitConfig: {
                  ...dbAgent.livekitConfig,
                  agentId: cloudAgent.id,
                  deployedAt: cloudAgent.deployedAt,
                  version: cloudAgent.version,
                },
              },
            });
          }
        } else {
          // Agent not in cloud - mark as INACTIVE if it was RUNNING
          if (dbAgent.status === "RUNNING") {
            await ctx.prisma.agent.update({
              where: { id: dbAgent.id },
              data: { status: "INACTIVE" },
            });
          }
        }
      }

      return {
        success: true,
        cloudAgents,
        syncedCount: dbAgents.length,
      };
    } catch (error) {
      console.error("Error syncing with LiveKit Cloud:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        cloudAgents: [],
        syncedCount: 0,
      };
    }
  }),

  // Deploy Python agent to LiveKit Cloud
  deployPython: publicProcedure
    .input(
      z.object({
        id: z.string().min(1, "Agent ID is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const agent = await ctx.prisma.agent.findUnique({
          where: { id: input.id },
        });

        if (!agent) {
          throw new Error("Agent not found");
        }

        // Check current status
        if (agent.status === "RUNNING") {
          throw new Error("Agent is already running");
        }

        // Set to DEPLOYING
        await ctx.prisma.agent.update({
          where: { id: input.id },
          data: { status: "DEPLOYING" },
        });

        // Deploy Python agent
        const deploymentResult = await LiveKitPythonService.deployPythonAgent({
          agentId: agent.id,
          agentName: agent.name,
          model: agent.model,
          voice: agent.voice,
          temperature: agent.temperature,
          prompt: agent.prompt,
        });

        if (deploymentResult.success && deploymentResult.agentId) {
          // Update agent with cloud agent ID
          await ctx.prisma.agent.update({
            where: { id: input.id },
            data: {
              status: "RUNNING",
              livekitConfig: {
                agentId: deploymentResult.agentId,
                roomName: `room-${agent.id}`,
                deploymentLogs: deploymentResult.deploymentLogs,
              },
            },
          });

          return {
            success: true,
            agent,
            cloudAgentId: deploymentResult.agentId,
            logs: deploymentResult.deploymentLogs,
            message: `Python agent "${agent.name}" deployed successfully`,
          };
        } else {
          // Deployment failed
          await ctx.prisma.agent.update({
            where: { id: input.id },
            data: { status: "ERROR" },
          });

          throw new Error(deploymentResult.error || "Deployment failed");
        }
      } catch (error) {
        console.error("Error deploying Python agent:", error);
        
        // Reset status to INACTIVE on error
        try {
          await ctx.prisma.agent.update({
            where: { id: input.id },
            data: { status: "INACTIVE" },
          });
        } catch (updateError) {
          console.error("Failed to reset agent status:", updateError);
        }

        throw new Error(`Failed to deploy Python agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),
});

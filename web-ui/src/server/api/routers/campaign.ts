import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { parse } from "csv-parse/sync";
import { AccessToken, SipClient, ParticipantInfo, Room, RoomServiceClient } from "livekit-server-sdk";
import { env } from "@/env";
import { type PrismaClient } from "@prisma/client";
import { type Context } from "@/server/api/trpc";
import { type Prisma } from "@prisma/client";

const CampaignStatus = z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"]);
const LeadStatus = z.enum([
  "PENDING",
  "PROCESSED",
  "FAILED",
  "NO_ANSWER",
  "VOICEMAIL",
  "HUNG_UP",
  "COMPLETED",
  "WAITING_AGENT"
]);
const ConversationStatus = z.enum([
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
  "NO_ANSWER",
  "VOICEMAIL",
  "HUNG_UP",
  "WAITING_AGENT"
]);

const sipClient = new SipClient(
  env.LIVEKIT_API_ENDPOINT,
  env.LIVEKIT_API_KEY,
  env.LIVEKIT_API_SECRET
);

const roomService = new RoomServiceClient(
  env.LIVEKIT_API_ENDPOINT,
  env.LIVEKIT_API_KEY,
  env.LIVEKIT_API_SECRET
);

// Helper function to make real Twilio calls
async function makeTwilioCall(to: string, from: string, roomName: string) {
  const twilio = require('twilio');
  const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  
  console.log(`Making real Twilio call: ${from} -> ${to} (room: ${roomName})`);
  
  try {
    // Create a simple Twilio call with basic TwiML (bypass SIP for now)
    const call = await client.calls.create({
      to: to,
      from: from,
      twiml: `<Response><Say>Hello! This is a test call from your AI agent. The call is working correctly.</Say><Pause length="2"/><Say>Thank you for testing the system. Goodbye!</Say></Response>`,
    });
    
    console.log(`Real Twilio call created: ${call.sid}`);
    return {
      sid: call.sid,
      status: call.status,
      to,
      from,
      roomName,
    };
  } catch (error) {
    console.error('Error making Twilio call:', error);
    throw error;
  }
}

interface ApiContext {
  prisma: PrismaClient;
}

// Helper function to monitor room participants
async function monitorRoomParticipants(roomName: string, agentIdentity: string, phoneNumber: string): Promise<string> {
  return new Promise<string>((resolve) => {
    let agentConnected = false;
    let participantConnected = false;
    let checkInterval: NodeJS.Timeout;
    let timeout: NodeJS.Timeout;
    let lastParticipantCheck = Date.now();
    let lastStatus = "";

    const checkParticipants = async () => {
      try {
        const participants = await roomService.listParticipants(roomName);
        
        const agent = participants.find(p => p.identity === agentIdentity);
        const caller = participants.find(p => p.identity === phoneNumber);

        const wasAgentConnected = agentConnected;
        const wasParticipantConnected = participantConnected;
        
        agentConnected = !!agent;
        participantConnected = !!caller;

        // If no participants found, check if room exists
        if (participants.length === 0) {
          try {
            const rooms = await roomService.listRooms([roomName]);
            if (rooms.length === 0) {
              clearInterval(checkInterval);
              clearTimeout(timeout);
              resolve("hung_up");
              return;
            }
          } catch (error) {
            // Room doesn't exist or error occurred
            clearInterval(checkInterval);
            clearTimeout(timeout);
            resolve("hung_up");
            return;
          }
        }

        // Check for participant disconnection
        if (participantConnected) {
          lastParticipantCheck = Date.now();
        } else if (Date.now() - lastParticipantCheck > 5000) { // Reduced to 5 seconds
          clearInterval(checkInterval);
          clearTimeout(timeout);
          resolve("hung_up");
          return;
        }

        // Determine current status
        let currentStatus = "";
        if (agentConnected && participantConnected) {
          currentStatus = "in_progress";
        } else if (!participantConnected && agentConnected) {
          const duration = Date.now() - startTime;
          currentStatus = duration < 10000 ? "hung_up" : "completed";
        } else if (participantConnected && !agentConnected) {
          currentStatus = "agent_failed";
        }

        // If status changed, resolve immediately
        if (currentStatus && currentStatus !== lastStatus) {
          lastStatus = currentStatus;
          if (currentStatus !== "in_progress") {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            resolve(currentStatus);
            return;
          }
        }

      } catch (error) {
        console.error("Error checking participants:", error);
        // If we can't check participants, assume call ended
        clearInterval(checkInterval);
        clearTimeout(timeout);
        resolve("hung_up");
      }
    };

    // Set timeout for overall call
    timeout = setTimeout(() => {
      clearInterval(checkInterval);
      if (!agentConnected) {
        resolve("agent_failed");
      } else if (!participantConnected) {
        resolve("no_answer");
      }
    }, 45000);

    // Start monitoring participants more frequently
    const startTime = Date.now();
    checkInterval = setInterval(checkParticipants, 500); // Check every 500ms for real-time updates
  });
}

// Helper function to handle call status updates
async function handleCallStatus(
  ctx: any,
  lead: any,
  conversation: any,
  status: string,
  errorReason?: string
) {
  let leadStatus: string;
  let conversationStatus: string;

  switch (status) {
    case "no_answer":
      leadStatus = "NO_ANSWER";
      conversationStatus = "NO_ANSWER";
      errorReason = "Call was not answered";
      break;
    case "voicemail":
      leadStatus = "VOICEMAIL";
      conversationStatus = "VOICEMAIL";
      errorReason = "Call went to voicemail";
      break;
    case "hung_up":
      leadStatus = "HUNG_UP";
      conversationStatus = "HUNG_UP";
      errorReason = "Recipient hung up the call";
      break;
    case "waiting_agent":
      leadStatus = "WAITING_AGENT";
      conversationStatus = "WAITING_AGENT";
      errorReason = "Waiting for AI agent to connect";
      break;
    case "agent_failed":
      leadStatus = "FAILED";
      conversationStatus = "FAILED";
      errorReason = "AI agent failed to connect";
      break;
    case "completed":
      leadStatus = "COMPLETED";
      conversationStatus = "COMPLETED";
      break;
    case "failed":
    default:
      leadStatus = "FAILED";
      conversationStatus = "FAILED";
  }

  // Update lead status
  await ctx.prisma.lead.update({
    where: { id: lead.id },
    data: {
      status: leadStatus,
      errorReason: errorReason,
    },
  });

  // Update conversation status
  await ctx.prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      status: conversationStatus,
      callEndTime: status !== "waiting_agent" ? new Date() : null,
    },
  });
}

export const campaignRouter = createTRPCRouter({
  // Create a new campaign
  create: publicProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        leadListIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.campaign.create({
        data: {
          name: input.name,
          description: input.description,
          status: "DRAFT",
          assignedLeadLists: input.leadListIds ? {
            connect: input.leadListIds.map(id => ({ id }))
          } : undefined,
        },
        include: {
          assignedLeadLists: {
            include: {
              _count: {
                select: {
                  leads: true,
                },
              },
            },
          },
          _count: {
            select: {
              leads: true,
            },
          },
        },
      });
    }),

  // Get all campaigns
  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        assignedLeadLists: {
          include: {
            _count: {
              select: {
                leads: true,
              },
            },
          },
        },
        _count: {
          select: { leads: true },
        },
      },
    });
  }),

  // Update campaign status
  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.string(),
        status: CampaignStatus,
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.campaign.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  // Upload leads for a campaign
  uploadLeads: publicProcedure
    .input(
      z.object({
        campaignId: z.string(),
        content: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Log the raw content for debugging
        console.log("Raw CSV content length:", input.content.length);
        console.log("First 500 chars:", input.content.substring(0, 500));
        
        // Parse CSV content
        const records = parse(input.content, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true,
        });

        console.log("Parsed records count:", records.length);
        if (records.length > 0) {
          console.log("First record:", records[0]);
        }

        // Validate and insert records
        const insertPromises = records.map((record: any) => {
          return ctx.prisma.lead.create({
            data: {
              phoneNumber: record.phoneNumber || "",
              name: record.name || null,
              email: record.email || null,
              campaignId: input.campaignId,
            },
          });
        });

        await Promise.all(insertPromises);
        return { success: true, count: records.length };
      } catch (error) {
        console.error("Error processing CSV:", error);
        if (error instanceof Error) {
          console.error("Error details:", {
            message: error.message,
            name: error.name,
            stack: error.stack,
          });
        }
        throw new Error("Failed to process CSV file");
      }
    }),

  // Get campaign details with leads
  getDetails: publicProcedure
    .input(
      z.object({
        id: z.string(),
        status: LeadStatus.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const whereClause = {
        id: input.id,
      };

      const leadWhereClause = input.status
        ? {
            status: input.status,
          }
        : {};

      return ctx.prisma.campaign.findUnique({
        where: whereClause,
        include: {
          leads: {
            where: leadWhereClause,
            orderBy: { createdAt: "desc" },
          },
        },
      });
    }),

  // Update lead status
  updateLeadStatus: publicProcedure
    .input(
      z.object({
        id: z.string(),
        status: LeadStatus,
        errorReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.lead.update({
        where: { id: input.id },
        data: {
          status: input.status,
          errorReason: input.errorReason,
        },
      });
    }),

  // Update campaign script
  updateScript: publicProcedure
    .input(
      z.object({
        id: z.string(),
        script: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.campaign.update({
        where: { id: input.id },
        data: { script: input.script },
      });
    }),

  // Start campaign execution
  startCampaign: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const campaign = await ctx.prisma.campaign.findUnique({
        where: { id: input.id },
        include: {
          leads: {
            where: { status: "PENDING" },
          },
        },
      });

      if (!campaign) {
        throw new Error("Campaign not found");
      }

      if (!campaign.script) {
        throw new Error("Campaign script is required");
      }

      // Update campaign status to ACTIVE
      await ctx.prisma.campaign.update({
        where: { id: input.id },
        data: { status: "ACTIVE" },
      });

      // Start processing leads
      for (const lead of campaign.leads) {
        let conversation: any = null;
        try {
          // Create a conversation record
          conversation = await ctx.prisma.conversation.create({
            data: {
              leadId: lead.id,
              campaignId: campaign.id,
              status: "IN_PROGRESS",
              callStartTime: new Date(),
            },
          });

          const roomName = `campaign-${campaign.id}-${lead.id}`;
          const agentIdentity = `agent-${conversation.id}`;
          const agentMetadata = {
            campaignId: campaign.id,
            leadId: lead.id,
            script: campaign.script,
          };

          // Create LiveKit token for the AI agent
          const at = new AccessToken(
            env.LIVEKIT_API_KEY,
            env.LIVEKIT_API_SECRET,
            {
              identity: agentIdentity,
              name: "AI Agent",
            }
          );

          // Make the outbound call using SipClient with timeout and status monitoring
          try {
            // Set initial status to waiting for agent
            await handleCallStatus(ctx, lead, conversation, "waiting_agent");

            // Create the room with metadata first
            await roomService.createRoom({
              name: roomName,
              metadata: JSON.stringify(agentMetadata),
              emptyTimeout: 300,  // 5 minutes timeout for empty rooms
            });

            const sipParticipant = await sipClient.createSipParticipant(
              env.LIVEKIT_SIP_TRUNK_ID,
              lead.phoneNumber,
              roomName,
              {
                participantIdentity: lead.phoneNumber,
                participantName: "Phone Caller",
                playRingtone: true,
              }
            );

            console.log("SIP Participant created:", sipParticipant);

            // Monitor call status and agent connection
            const callStatus = await monitorRoomParticipants(roomName, agentIdentity, lead.phoneNumber);
            await handleCallStatus(ctx, lead, conversation, callStatus);

          } catch (callError) {
            console.error(`Call error for lead ${lead.id}:`, callError);
            await handleCallStatus(
              ctx,
              lead,
              conversation,
              "failed",
              callError instanceof Error ? callError.message : "Unknown call error"
            );
          }

        } catch (error) {
          console.error(`Error processing lead ${lead.id}:`, error);
          if (conversation) {
            await handleCallStatus(
              ctx,
              lead,
              conversation,
              "failed",
              error instanceof Error ? error.message : "Unknown error"
            );
          }
        }
      }

      return { success: true };
    }),

  // Save conversation results
  saveConversation: publicProcedure
    .input(
      z.object({
        campaignId: z.string(),
        leadId: z.string(),
        status: ConversationStatus,
        results: z.record(z.any()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const conversation = await ctx.prisma.conversation.findFirst({
        where: {
          leadId: input.leadId,
          campaignId: input.campaignId,
        },
        orderBy: {
          callStartTime: 'desc',
        },
      });

      if (!conversation) {
        throw new Error("Conversation not found");
      }

      const updatedConversation = await ctx.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: input.status,
          results: input.results,
          callEndTime: new Date(),
        },
      });

      return updatedConversation;
    }),

  // Get campaign statistics
  getStats: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const campaign = await ctx.prisma.campaign.findUnique({
        where: { id: input.id },
        include: {
          leads: true,
          conversations: {
            where: {
              status: "COMPLETED",
            },
          },
        },
      });

      if (!campaign) {
        throw new Error("Campaign not found");
      }

      const totalLeads = campaign.leads.length;
      const processedLeads = campaign.leads.filter(
        (lead) => lead.status === "PROCESSED"
      ).length;
      const failedLeads = campaign.leads.filter(
        (lead) => lead.status === "FAILED"
      ).length;
      const completedCalls = campaign.conversations.length;

      const outcomes = campaign.conversations.reduce((acc, conv) => {
        const results = conv.results as { outcome: string } | null;
        if (results?.outcome) {
          acc[results.outcome] = (acc[results.outcome] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      return {
        totalLeads,
        processedLeads,
        failedLeads,
        completedCalls,
        outcomes,
      };
    }),

  // Get overall statistics for dashboard
  getOverallStats: publicProcedure.query(async ({ ctx }) => {
    // First, auto-complete stale calls (older than 10 minutes with IN_PROGRESS status)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    const staleCalls = await ctx.prisma.conversation.findMany({
      where: {
        status: "IN_PROGRESS",
        callStartTime: {
          lt: tenMinutesAgo
        }
      }
    });

    // Update stale calls to COMPLETED
    if (staleCalls.length > 0) {
      console.log(`Auto-completing ${staleCalls.length} stale calls`);
      
      for (const call of staleCalls) {
        const duration = call.callStartTime 
          ? Math.floor((Date.now() - call.callStartTime.getTime()) / 1000)
          : 300; // Default 5 minutes if no start time

        await ctx.prisma.conversation.update({
          where: { id: call.id },
          data: {
            status: "COMPLETED",
            callEndTime: new Date(),
            duration: duration,
            results: {
              outcome: "auto_completed",
              summary: "Call automatically marked as completed due to inactivity",
              auto_completed: true,
              completion_reason: "stale_call_cleanup"
            }
          }
        });

        // Also update lead status
        await ctx.prisma.lead.update({
          where: { id: call.leadId },
          data: {
            status: "COMPLETED"
          }
        });
      }
    }

    // Get all conversations including test calls
    const conversations = await ctx.prisma.conversation.findMany({
      include: {
        campaign: true,
        lead: true,
      },
      orderBy: {
        callStartTime: 'desc',
      },
      take: 50,
    });

    // Calculate statistics
    const totalCalls = conversations.length;
    const completedCalls = conversations.filter(c => c.status === "COMPLETED").length;
    const failedCalls = conversations.filter(c => ["FAILED", "NO_ANSWER", "HUNG_UP"].includes(c.status)).length;
    const successRate = totalCalls > 0 ? completedCalls / totalCalls : 0;

    // Calculate status distribution
    const statusDistribution = conversations.reduce((acc, conv) => {
      acc[conv.status] = (acc[conv.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate outcomes (simplified for now)
    const outcomes = {
      "Completed": completedCalls,
      "Failed": failedCalls,
      "In Progress": conversations.filter(c => c.status === "IN_PROGRESS").length,
    };

    // Format recent calls
    const recentCalls = conversations.map(conv => ({
      id: conv.id,
      callStartTime: conv.callStartTime!,
      campaignName: conv.campaign.name,
      phoneNumber: conv.lead.phoneNumber,
      status: conv.status,
      duration: conv.duration,
    }));

    return {
      totalCalls,
      completedCalls,
      failedCalls,
      successRate,
      statusDistribution,
      outcomes,
      recentCalls,
    };
  }),

  // Make a real call using Twilio and LiveKit
  makeCall: publicProcedure
    .input(
      z.object({
        phoneNumber: z.string(),
        script: z.string(),
        useRealCall: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Create a test campaign
      const campaign = await ctx.prisma.campaign.create({
        data: {
          name: `Test Call ${new Date().toISOString()}`,
          status: "COMPLETED",
          script: input.script,
        }
      });

      // Create a lead for test call
      const lead = await ctx.prisma.lead.create({
        data: {
          phoneNumber: input.phoneNumber,
          status: "PENDING",
          campaignId: campaign.id,
        }
      });

      // Create conversation record
      const conversation = await ctx.prisma.conversation.create({
        data: {
          leadId: lead.id,
          campaignId: campaign.id,
          status: "IN_PROGRESS",
          callStartTime: new Date(),
        }
      });

      const roomName = `test-${conversation.id}`;
      const agentIdentity = `agent-${conversation.id}`;
      const agentMetadata = {
        campaignId: campaign.id,
        leadId: lead.id,
        script: campaign.script,
      };

      // Create LiveKit token for the AI agent
      const at = new AccessToken(
        env.LIVEKIT_API_KEY,
        env.LIVEKIT_API_SECRET,
        {
          identity: agentIdentity,
          name: "AI Agent",
        }
      );

      try {
        // Set initial status to waiting for agent
        await handleCallStatus(ctx, lead, conversation, "waiting_agent");

        // Create the room with metadata
        await roomService.createRoom({
          name: roomName,
          metadata: JSON.stringify(agentMetadata),
          emptyTimeout: 300,
        });

        // Make the call using SipClient or Twilio based on configuration
        let sipParticipant;
        
        if (input.useRealCall && env.TWILIO_ACCOUNT_SID && env.TWILIO_PHONE_NUMBER) {
          // Use Twilio for real calls
          console.log(`Making real call to ${input.phoneNumber} using Twilio`);
          
          // Make the actual Twilio call directly (bypass SIP trunk for now)
          const twilioCall = await makeTwilioCall(input.phoneNumber, env.TWILIO_PHONE_NUMBER, roomName);
          console.log("Twilio call initiated:", twilioCall);
          
          // Update lead status to indicate call was made
          await ctx.prisma.lead.update({
            where: { id: lead.id },
            data: { 
              status: "PROCESSED",
              errorReason: null
            }
          });
          
        } else {
          // Use LiveKit SIP directly (for testing)
          console.log(`Making test call to ${input.phoneNumber} using LiveKit SIP`);
          sipParticipant = await sipClient.createSipParticipant(
            env.LIVEKIT_SIP_TRUNK_ID,
            input.phoneNumber,
            roomName,
            {
              participantIdentity: input.phoneNumber,
              participantName: "Phone Caller",
              playRingtone: true,
            }
          );
        }

        console.log("SIP Participant created:", sipParticipant);

        // Monitor call status and agent connection
        const callStatus = await monitorRoomParticipants(roomName, agentIdentity, input.phoneNumber);
        await handleCallStatus(ctx, lead, conversation, callStatus);

        return { success: true, conversationId: conversation.id };
      } catch (error) {
        // Update conversation status on failure
        await handleCallStatus(
          ctx,
          lead,
          conversation,
          "failed",
          error instanceof Error ? error.message : "Unknown error"
        );
        throw error;
      }
    }),

  // Mark call as completed manually
  markCallCompleted: publicProcedure
    .input(
      z.object({
        callId: z.string(),
        outcome: z.string().optional(),
        summary: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const conversation = await ctx.prisma.conversation.findUnique({
          where: { id: input.callId },
          include: { lead: true }
        });

        if (!conversation) {
          throw new Error("Call not found");
        }

        if (conversation.status === "COMPLETED") {
          return { success: true, message: "Call was already completed" };
        }

        const duration = conversation.callStartTime 
          ? Math.floor((Date.now() - conversation.callStartTime.getTime()) / 1000)
          : 0;

        await ctx.prisma.conversation.update({
          where: { id: input.callId },
          data: {
            status: "COMPLETED",
            callEndTime: new Date(),
            duration: duration,
            results: {
              outcome: input.outcome || "manually_completed",
              summary: input.summary || "Call manually marked as completed",
              manual_completion: true,
              completion_time: new Date().toISOString()
            }
          }
        });

        // Update lead status
        await ctx.prisma.lead.update({
          where: { id: conversation.leadId },
          data: {
            status: "COMPLETED"
          }
        });

        return { 
          success: true, 
          message: "Call marked as completed successfully",
          duration: duration
        };
      } catch (error) {
        console.error("Error marking call as completed:", error);
        throw new Error("Failed to mark call as completed");
      }
    }),

  // Handle call hang-up detection from LiveKit
  handleCallHangup: publicProcedure
    .input(
      z.object({
        callId: z.string(),
        hangupReason: z.string().optional(),
        participantIdentity: z.string().optional(),
        callDuration: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const conversation = await ctx.prisma.conversation.findUnique({
          where: { id: input.callId },
          include: { lead: true }
        });

        if (!conversation) {
          throw new Error("Call not found");
        }

        if (conversation.status === "COMPLETED" || conversation.status === "HUNG_UP") {
          return { success: true, message: "Call was already completed" };
        }

        const duration = input.callDuration || (conversation.callStartTime 
          ? Math.floor((Date.now() - conversation.callStartTime.getTime()) / 1000)
          : 0);

        // Determine who hung up based on participant identity
        const isCustomerHangup = input.participantIdentity && 
          !input.participantIdentity.includes('agent') && 
          !input.participantIdentity.includes('listener');

        await ctx.prisma.conversation.update({
          where: { id: input.callId },
          data: {
            status: "HUNG_UP",
            callEndTime: new Date(),
            duration: duration,
            results: {
              outcome: "hung_up",
              summary: isCustomerHangup 
                ? "Customer hung up the call" 
                : "Call was disconnected",
              hangup_reason: input.hangupReason || "participant_disconnected",
              hung_up_by: isCustomerHangup ? "customer" : "unknown",
              participant_identity: input.participantIdentity,
              call_duration: duration,
              hangup_time: new Date().toISOString()
            }
          }
        });

        // Update lead status
        await ctx.prisma.lead.update({
          where: { id: conversation.leadId },
          data: {
            status: "HUNG_UP",
            errorReason: isCustomerHangup ? "Customer hung up" : "Call disconnected"
          }
        });

        return { 
          success: true, 
          message: "Call marked as hung up",
          duration: duration,
          hungUpBy: isCustomerHangup ? "customer" : "unknown"
        };
      } catch (error) {
        console.error("Error handling call hangup:", error);
        throw new Error("Failed to handle call hangup");
      }
    }),

  // Auto-complete stale calls
  autoCompleteStaleCall: publicProcedure.mutation(async ({ ctx }) => {
    try {
      // Mark calls older than 5 minutes as completed (reduced from 10 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const staleCalls = await ctx.prisma.conversation.findMany({
        where: {
          status: "IN_PROGRESS",
          callStartTime: {
            lt: fiveMinutesAgo
          }
        },
        include: { lead: true }
      });

      let completedCount = 0;

      for (const call of staleCalls) {
        const duration = call.callStartTime 
          ? Math.floor((Date.now() - call.callStartTime.getTime()) / 1000)
          : 300;

        // Try to clean up the LiveKit room
        try {
          const roomName = `campaign-${call.campaignId}-${call.leadId}`;
          await roomService.deleteRoom(roomName);
        } catch (error) {
          console.error(`Error cleaning up room for call ${call.id}:`, error);
        }

        await ctx.prisma.conversation.update({
          where: { id: call.id },
          data: {
            status: "COMPLETED",
            callEndTime: new Date(),
            duration: duration,
            results: {
              outcome: "auto_completed",
              summary: "Call automatically marked as completed due to inactivity",
              auto_completed: true,
              completion_reason: "stale_call_cleanup",
              original_duration: duration
            }
          }
        });

        await ctx.prisma.lead.update({
          where: { id: call.leadId },
          data: {
            status: "COMPLETED"
          }
        });

        completedCount++;
      }

      return { 
        success: true, 
        message: `Auto-completed ${completedCount} stale calls`,
        completedCount
      };
    } catch (error) {
      console.error("Error auto-completing stale calls:", error);
      throw new Error("Failed to auto-complete stale calls");
    }
  }),

  // Create test call with live transcript for testing
  createTestCallWithTranscript: publicProcedure
    .input(
      z.object({
        phoneNumber: z.string().default("+1234567890"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Create test campaign
        const campaign = await ctx.prisma.campaign.create({
          data: {
            name: `Test Call with Transcript ${new Date().toISOString()}`,
            status: "ACTIVE",
            script: "Test script for live transcript functionality"
          }
        });

        // Create test lead
        const lead = await ctx.prisma.lead.create({
          data: {
            phoneNumber: input.phoneNumber,
            name: "Test Lead",
            status: "PENDING",
            campaignId: campaign.id,
          }
        });

        // Create conversation with sample transcript
        const sampleTranscript = [
          {
            timestamp: new Date(Date.now() - 45000).toISOString(),
            speaker: "Agent",
            text: "Hello, this is calling from the loan department. Am I speaking with " + input.phoneNumber + "?",
            type: "agent_message"
          },
          {
            timestamp: new Date(Date.now() - 35000).toISOString(),
            speaker: "Customer", 
            text: "Yes, this is me. What is this about?",
            type: "customer_message"
          },
          {
            timestamp: new Date(Date.now() - 25000).toISOString(),
            speaker: "Agent",
            text: "I'm calling to see if you might be interested in learning about loan options we have available. Are you currently looking for any type of loan or financial assistance?",
            type: "agent_message"
          },
          {
            timestamp: new Date(Date.now() - 15000).toISOString(),
            speaker: "Customer",
            text: "Actually, I have been thinking about a home improvement loan. What kind of rates do you offer?",
            type: "customer_message"
          },
          {
            timestamp: new Date(Date.now() - 5000).toISOString(),
            speaker: "Agent",
            text: "That's great! We have very competitive rates for home improvement loans. Let me connect you with one of our specialists who can give you specific details.",
            type: "agent_message"
          }
        ];

        const conversation = await ctx.prisma.conversation.create({
          data: {
            leadId: lead.id,
            campaignId: campaign.id,
            status: "IN_PROGRESS",
            callStartTime: new Date(Date.now() - 60000), // Started 1 minute ago
            results: {
              transcript: sampleTranscript,
              conversation_state: "qualification",
              interest_status: "INTERESTED",
              call_status: "ANSWERED",
              last_updated: new Date().toISOString()
            }
          }
        });

        return {
          success: true,
          conversationId: conversation.id,
          campaignId: campaign.id,
          leadId: lead.id,
          phoneNumber: input.phoneNumber,
          message: "Test call with transcript created successfully"
        };
      } catch (error) {
        console.error("Error creating test call:", error);
        throw new Error("Failed to create test call with transcript");
      }
    }),

  // Get agent status
  getAgentStatus: publicProcedure.query(async ({ ctx }) => {
    try {
      // Check if we can connect to the LiveKit server
      const roomServiceClient = new RoomServiceClient(
        env.LIVEKIT_API_ENDPOINT || '',
        env.LIVEKIT_API_KEY || '',
        env.LIVEKIT_API_SECRET || ''
      );
      
      // Try to list rooms to check connectivity
      // This verifies that the LiveKit server is accessible
      let livekitConnected = false;
      let livekitMessage = "Checking LiveKit server...";
      
      try {
        await roomServiceClient.listRooms();
        livekitConnected = true;
        livekitMessage = "LiveKit server connected";
      } catch (error) {
        livekitConnected = false;
        livekitMessage = "LiveKit server not accessible";
      }
      
      // For Python agent status, we'll check if there have been recent room activities
      // or if the agent has processed calls recently
      const recentCalls = await ctx.prisma.conversation.findFirst({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      const pythonAgentActive = recentCalls !== null;
      const pythonMessage = pythonAgentActive 
        ? "Python agent processed calls recently" 
        : "Python agent idle or not running";
      
      // Try to read the agent ID from the status file
      let agentId = null;
      try {
        const fs = await import('fs').then(m => m.promises);
        const statusFile = '/tmp/livekit_agent_status.json';
        const statusData = await fs.readFile(statusFile, 'utf-8');
        const status = JSON.parse(statusData);
        agentId = status.worker_id || null;
      } catch (e) {
        // If file doesn't exist or can't be read, use a default
        agentId = livekitConnected ? "AW_PENDING" : null;
      }
      
      // Overall status
      const isConnected = livekitConnected;
      const statusMessage = livekitConnected 
        ? (pythonAgentActive ? "AI Agent is connected and active" : "AI Agent is connected (idle)")
        : "AI Agent connection issues";
      
      return {
        connected: isConnected,
        status: isConnected ? (pythonAgentActive ? "active" : "online") : "offline",
        message: statusMessage,
        agentId: agentId,
        details: {
          livekit: { connected: livekitConnected, message: livekitMessage },
          pythonAgent: { active: pythonAgentActive, message: pythonMessage }
        },
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error checking agent status:", error);
      return {
        connected: false,
        status: "error",
        message: "Failed to check agent status",
        lastCheck: new Date().toISOString()
      };
    }
  }),

  // Start AI agent
  startAgent: publicProcedure.mutation(async ({ ctx }) => {
    try {
      // In a real implementation, this would start the Python agent process
      // For now, we'll simulate starting the agent by creating a status file
      const fs = await import('fs').then(m => m.promises);
      const statusFile = '/tmp/livekit_agent_status.json';
      
      const agentStatus = {
        worker_id: `AW_${Date.now()}`,
        status: 'starting',
        started_at: new Date().toISOString(),
        message: 'AI Agent is starting up...'
      };
      
      await fs.writeFile(statusFile, JSON.stringify(agentStatus, null, 2));
      
      // In a real implementation, you would:
      // 1. Start the Python agent process
      // 2. Monitor its health
      // 3. Update the status file with real status
      
      return {
        success: true,
        message: "AI Agent start command sent",
        agentId: agentStatus.worker_id
      };
    } catch (error) {
      console.error("Error starting agent:", error);
      throw new Error("Failed to start AI agent");
    }
  }),

  // Stop AI agent
  stopAgent: publicProcedure.mutation(async ({ ctx }) => {
    try {
      // In a real implementation, this would stop the Python agent process
      const fs = await import('fs').then(m => m.promises);
      const statusFile = '/tmp/livekit_agent_status.json';
      
      const agentStatus = {
        worker_id: null,
        status: 'stopped',
        stopped_at: new Date().toISOString(),
        message: 'AI Agent has been stopped'
      };
      
      await fs.writeFile(statusFile, JSON.stringify(agentStatus, null, 2));
      
      // In a real implementation, you would:
      // 1. Send a stop signal to the Python agent process
      // 2. Wait for graceful shutdown
      // 3. Kill the process if necessary
      
      return {
        success: true,
        message: "AI Agent stop command sent"
      };
    } catch (error) {
      console.error("Error stopping agent:", error);
      throw new Error("Failed to stop AI agent");
    }
  }),

  // Restart AI agent
  restartAgent: publicProcedure.mutation(async ({ ctx }) => {
    try {
      // First stop the agent
      const fs = await import('fs').then(m => m.promises);
      const statusFile = '/tmp/livekit_agent_status.json';
      
      // Stop status
      const stopStatus = {
        worker_id: null,
        status: 'restarting',
        stopped_at: new Date().toISOString(),
        message: 'AI Agent is restarting...'
      };
      
      await fs.writeFile(statusFile, JSON.stringify(stopStatus, null, 2));
      
      // Wait a moment (in real implementation, wait for actual stop)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Start status
      const startStatus = {
        worker_id: `AW_${Date.now()}`,
        status: 'starting',
        started_at: new Date().toISOString(),
        message: 'AI Agent is starting up after restart...'
      };
      
      await fs.writeFile(statusFile, JSON.stringify(startStatus, null, 2));
      
      return {
        success: true,
        message: "AI Agent restart command sent",
        agentId: startStatus.worker_id
      };
    } catch (error) {
      console.error("Error restarting agent:", error);
      throw new Error("Failed to restart AI agent");
    }
  }),
}); 
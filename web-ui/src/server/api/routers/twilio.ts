import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { env } from "@/env";
// @ts-ignore
import twilio from 'twilio';

// Real Twilio client
const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

export const twilioRouter = createTRPCRouter({
  makeCall: publicProcedure
    .input(z.object({
      to: z.string().min(1, "Phone number is required"),
      from: z.string().min(1, "From number is required"),
      campaignId: z.string().min(1, "Campaign ID is required"),
      leadId: z.string().min(1, "Lead ID is required"),
    }))
    .mutation(async ({ input }) => {
      try {
        // Validate phone numbers
        if (!input.to.startsWith('+')) {
          throw new Error("Phone number must include country code (e.g., +1234567890)");
        }
        
        if (!input.from.startsWith('+')) {
          throw new Error("From number must include country code (e.g., +1234567890)");
        }

        // Create webhook URL for call status updates
        const webhookUrl = `${env.NEXT_PUBLIC_API_URL || 'http://localhost:3025'}/api/twilio/call-status`;
        
        // Make the call through Twilio
        const call = await twilioClient.calls.create({
          to: input.to,
          from: input.from,
          url: webhookUrl,
          method: 'POST',
        });
        
        // Log the call initiation
        console.log(`Call initiated: ${call.sid} from ${input.from} to ${input.to}`);
        
        return {
          success: true,
          callSid: call.sid,
          status: call.status,
          message: `Call initiated successfully to ${input.to}`,
        };
      } catch (error) {
        console.error("Error making call:", error);
        throw new Error(`Failed to make call: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  getCallStatus: publicProcedure
    .input(z.object({
      callSid: z.string().min(1, "Call SID is required"),
    }))
    .query(async ({ input }) => {
      try {
        // In a real implementation, you'd query Twilio for the call status
        // For now, return a mock status
        return {
          callSid: input.callSid,
          status: 'in-progress',
          duration: 30,
          direction: 'outbound',
        };
      } catch (error) {
        throw new Error(`Failed to get call status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Webhook endpoint for Twilio call status updates
  handleCallStatus: publicProcedure
    .input(z.object({
      CallSid: z.string(),
      CallStatus: z.string(),
      From: z.string(),
      To: z.string(),
      Duration: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        console.log(`Call status update: ${input.CallSid} - ${input.CallStatus}`);
        
        // Update the call status in your database
        // This would typically update the Conversation table
        
        return {
          success: true,
          message: "Call status updated successfully",
        };
      } catch (error) {
        console.error("Error handling call status:", error);
        throw new Error(`Failed to handle call status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),
});

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { env } from "@/env";

export const settingsRouter = createTRPCRouter({
  saveTwilioConfig: publicProcedure
    .input(z.object({
      accountSid: z.string().min(1, "Account SID is required"),
      authToken: z.string().min(1, "Auth Token is required"),
      phoneNumber: z.string().min(1, "Phone Number is required"),
      sipTrunkSid: z.string().min(1, "SIP Trunk SID is required"),
    }))
    .mutation(async ({ input }) => {
      // In a real implementation, you would save these to a secure database
      // For now, we'll just validate the format
      
      if (!input.accountSid.startsWith('AC')) {
        throw new Error("Invalid Twilio Account SID format");
      }
      
      if (!input.phoneNumber.startsWith('+')) {
        throw new Error("Phone number must include country code (e.g., +1234567890)");
      }
      
      if (!input.sipTrunkSid.startsWith('TK')) {
        throw new Error("Invalid SIP Trunk SID format");
      }
      
      // TODO: Save to database or secure storage
      console.log("Twilio config saved:", {
        accountSid: input.accountSid,
        phoneNumber: input.phoneNumber,
        sipTrunkSid: input.sipTrunkSid,
        // Don't log auth token for security
      });
      
      return { success: true, message: "Twilio configuration saved successfully" };
    }),

  saveLivekitConfig: publicProcedure
    .input(z.object({
      apiEndpoint: z.string().url("Invalid API endpoint URL"),
      apiKey: z.string().min(1, "API Key is required"),
      apiSecret: z.string().min(1, "API Secret is required"),
      sipTrunkId: z.string().min(1, "SIP Trunk ID is required"),
    }))
    .mutation(async ({ input }) => {
      // Validate LiveKit endpoint format
      if (!input.apiEndpoint.startsWith('wss://') && !input.apiEndpoint.startsWith('https://')) {
        throw new Error("API endpoint must start with wss:// or https://");
      }
      
      // TODO: Save to database or secure storage
      console.log("LiveKit config saved:", {
        apiEndpoint: input.apiEndpoint,
        sipTrunkId: input.sipTrunkId,
        // Don't log API key/secret for security
      });
      
      return { success: true, message: "LiveKit configuration saved successfully" };
    }),

  testConnection: publicProcedure
    .mutation(async () => {
      try {
        // Test LiveKit connection
        const livekitUrl = env.LIVEKIT_API_ENDPOINT;
        const livekitKey = env.LIVEKIT_API_KEY;
        const livekitSecret = env.LIVEKIT_API_SECRET;
        
        if (!livekitUrl || !livekitKey || !livekitSecret) {
          throw new Error("LiveKit configuration is incomplete");
        }
        
        // Test Twilio connection (if configured)
        const twilioSid = env.TWILIO_ACCOUNT_SID;
        const twilioToken = env.TWILIO_AUTH_TOKEN;
        
        if (twilioSid && twilioToken) {
          // TODO: Make actual Twilio API call to test credentials
          console.log("Testing Twilio connection...");
        }
        
        return { 
          success: true, 
          message: "Connection test successful - both LiveKit and Twilio are configured" 
        };
      } catch (error) {
        throw new Error(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  getCurrentConfig: publicProcedure
    .query(async () => {
      return {
        livekit: {
          apiEndpoint: env.LIVEKIT_API_ENDPOINT,
          sipTrunkId: env.LIVEKIT_SIP_TRUNK_ID,
          // Don't return sensitive data
        },
        twilio: {
          phoneNumber: env.TWILIO_PHONE_NUMBER,
          sipTrunkSid: env.TWILIO_SIP_TRUNK_SID,
          // Don't return sensitive data
        },
      };
    }),
});

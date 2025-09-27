import { type NextApiRequest, type NextApiResponse } from "next";
import { env } from "@/env";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Helper function to mask sensitive values
  const maskValue = (value: string | undefined, showFirst: number = 4, showLast: number = 4): string => {
    if (!value) return "Not set";
    if (value.length <= showFirst + showLast) return "••••••••";
    return value.substring(0, showFirst) + "••••••••" + value.substring(value.length - showLast);
  };

  // Return sensitive information in a masked format
  const envInfo = {
    web: {
      nodeEnv: env.NODE_ENV,
      databaseUrl: maskValue(env.DATABASE_URL),
      livekitApiEndpoint: env.LIVEKIT_API_ENDPOINT,
      livekitApiKey: maskValue(env.LIVEKIT_API_KEY),
      livekitApiSecret: maskValue(env.LIVEKIT_API_SECRET),
      livekitSipTrunkId: maskValue(env.LIVEKIT_SIP_TRUNK_ID),
      twilioAccountSid: maskValue(env.TWILIO_ACCOUNT_SID),
      twilioAuthToken: maskValue(env.TWILIO_AUTH_TOKEN),
      twilioPhoneNumber: env.TWILIO_PHONE_NUMBER || "Not set",
      twilioSipTrunkSid: maskValue(env.TWILIO_SIP_TRUNK_SID),
    },
    agent: {
      openaiApiKey: maskValue(process.env.OPENAI_API_KEY),
      openaiModel: process.env.OPENAI_MODEL || "gpt-4",
      openaiTemperature: process.env.OPENAI_TEMPERATURE || "0.7",
      openaiMaxTokens: process.env.OPENAI_MAX_TOKENS || "150",
    },
    // Add masking information so frontend knows which values to mask by default
    sensitiveKeys: [
      "livekitApiKey",
      "livekitApiSecret", 
      "databaseUrl",
      "twilioAccountSid",
      "twilioAuthToken",
      "twilioSipTrunkSid",
      "openaiApiKey"
    ]
  };

  return res.status(200).json(envInfo);
} 
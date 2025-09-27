import { type NextApiRequest, type NextApiResponse } from "next";
import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Get the absolute path to the ai-agent folder
    const agentPath = path.resolve(process.cwd(), '../ai-agent');
    
    // Read the .env file content
    const envPath = path.join(agentPath, '.env');
    let envContent;
    
    try {
      envContent = await fs.readFile(envPath, 'utf-8');
    } catch (error) {
      // If .env doesn't exist, try reading environment variables from the process
      envContent = '';
    }

    // Helper function to mask sensitive values
    const maskValue = (value: string | undefined, showFirst: number = 4, showLast: number = 4): string => {
      if (!value) return "Not set";
      if (value.length <= showFirst + showLast) return "••••••••";
      return value.substring(0, showFirst) + "••••••••" + value.substring(value.length - showLast);
    };

    // Parse environment variables
    const envVars: Record<string, string> = {};
    
    // First try to parse from .env file
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match && match[1] && match[2]) {
        const key = match[1].trim();
        const value = match[2].trim();
        envVars[key] = value;
      }
    });

    // If not found in .env, try to get from process.env
    const requiredVars = [
      'OPENAI_API_KEY',
      'OPENAI_MODEL',
      'OPENAI_TEMPERATURE',
      'OPENAI_MAX_TOKENS',
      'LIVEKIT_API_ENDPOINT',
      'LIVEKIT_API_KEY',
      'LIVEKIT_API_SECRET'
    ];

    requiredVars.forEach(key => {
      if (!envVars[key] && process.env[key]) {
        envVars[key] = process.env[key] || '';
      }
    });

    // Mask sensitive values
    const maskedEnvVars: Record<string, string> = {};
    Object.entries(envVars).forEach(([key, value]) => {
      if (['OPENAI_API_KEY', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET'].includes(key)) {
        maskedEnvVars[key] = maskValue(value);
      } else {
        maskedEnvVars[key] = value || "Not set";
      }
    });

    // Return the environment info
    return res.status(200).json({
      agentEnv: maskedEnvVars,
      sensitiveKeys: ['OPENAI_API_KEY', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET']
    });
  } catch (error) {
    console.error('Error reading agent environment:', error);
    return res.status(500).json({ 
      message: "Failed to read agent environment",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 
// @ts-ignore - Module exists but TypeScript can't resolve it
import { defineAgent } from '@livekit/agents';

// Get agent configuration from environment or use defaults
function getAgentConfig() {
  return {
    name: process.env.AGENT_NAME || 'Dashboard Agent',
    model: process.env.AGENT_MODEL || 'gpt-4',
    voice: process.env.AGENT_VOICE || 'nova',
    temperature: parseFloat(process.env.AGENT_TEMPERATURE || '0.7'),
    prompt: process.env.AGENT_PROMPT || 'You are a helpful AI assistant. Be concise and friendly.',
  };
}

// Main agent definition
export default defineAgent(async (ctx: any) => {
  const config = getAgentConfig();
  
  console.log(`[Agent] Starting ${config.name} with model ${config.model}`);
  console.log(`[Agent] Connected to room: ${ctx.room.name}`);
  
  // Handle participant joining
  ctx.room.on('participantConnected', (participant: any) => {
    console.log(`[Agent] Participant joined: ${participant.identity}`);
  });

  // Handle participant leaving
  ctx.room.on('participantDisconnected', (participant: any) => {
    console.log(`[Agent] Participant left: ${participant.identity}`);
  });

  // Handle incoming data messages
  ctx.room.on('dataReceived', (payload: any, participant: any) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(payload.data));
      if (data.type === 'message') {
        console.log(`[Agent] Received message from ${participant.identity}: ${data.text}`);
      }
    } catch (error) {
      console.error('[Agent] Error processing message:', error);
    }
  });
  
  console.log(`[Agent] ${config.name} is now active and ready for conversations`);
});

// Export for LiveKit Cloud deployment
module.exports = exports.default;
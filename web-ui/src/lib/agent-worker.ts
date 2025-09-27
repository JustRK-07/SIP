import { Room, RoomEvent, RemoteTrack, RemoteTrackPublication, RemoteParticipant } from 'livekit-client';
import { AccessToken } from 'livekit-server-sdk';

/**
 * AI Agent Worker - Connects to LiveKit rooms and handles AI conversations
 * This runs on your server and connects to the LiveKit room when SIP calls come in
 */
export class LiveKitAIAgent {
  private room: Room | null = null;
  private agentConfig: any;

  constructor(agentConfig: any) {
    this.agentConfig = agentConfig;
  }

  /**
   * Connect to LiveKit room and start handling SIP calls
   */
  async connectToRoom(roomName: string): Promise<void> {
    try {
      // Generate access token for the agent
      const at = new AccessToken(
        process.env.LIVEKIT_API_KEY!,
        process.env.LIVEKIT_API_SECRET!,
        {
          identity: `agent-${this.agentConfig.agentId}`,
          name: this.agentConfig.agentName,
        }
      );
      
      at.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
      });

      const token = at.toJwt();
      
      // Connect to the room
      this.room = new Room();
      
      // Set up event handlers
      this.setupEventHandlers();
      
      // Connect to LiveKit
      const serverUrl = process.env.LIVEKIT_API_ENDPOINT!;
      await this.room.connect(serverUrl, token);
      
      console.log(`[AI-Agent] Connected to room: ${roomName}`);
      
    } catch (error) {
      console.error(`[AI-Agent] Failed to connect to room:`, error);
      throw error;
    }
  }

  /**
   * Set up event handlers for the LiveKit room
   */
  private setupEventHandlers(): void {
    if (!this.room) return;

    // When someone joins the room (SIP caller)
    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log(`[AI-Agent] Participant joined: ${participant.identity}`);
      this.handleParticipantJoined(participant);
    });

    // When audio track is received from caller
    this.room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      if (track.kind === 'audio') {
        console.log(`[AI-Agent] Audio track received from: ${participant.identity}`);
        this.handleAudioTrack(track, participant);
      }
    });

    // When participant leaves
    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log(`[AI-Agent] Participant left: ${participant.identity}`);
    });
  }

  /**
   * Handle when a participant (SIP caller) joins
   */
  private async handleParticipantJoined(participant: RemoteParticipant): Promise<void> {
    // Send welcome message
    const welcomeMessage = `Hello! I'm ${this.agentConfig.agentName}. How can I help you today?`;
    await this.speakToParticipant(welcomeMessage);
  }

  /**
   * Handle incoming audio from SIP caller
   */
  private handleAudioTrack(audioTrack: RemoteTrack, participant: RemoteParticipant): void {
    // In a real implementation, you would:
    // 1. Convert audio to text (Speech-to-Text)
    // 2. Process with AI (OpenAI, etc.)
    // 3. Convert AI response to speech (Text-to-Speech)
    // 4. Send audio back to caller
    
    console.log(`[AI-Agent] Processing audio from ${participant.identity}`);
    
    // This would need actual audio processing implementation
    // For now, just log that we received audio
    setTimeout(() => {
      this.speakToParticipant("I heard you speaking. This is where AI processing would happen.");
    }, 1000);
  }

  /**
   * Send AI-generated speech back to the caller
   */
  private async speakToParticipant(message: string): Promise<void> {
    try {
      // In a real implementation, you would:
      // 1. Use Text-to-Speech service (OpenAI, ElevenLabs, etc.)
      // 2. Create audio track
      // 3. Publish audio track to the room
      
      console.log(`[AI-Agent] Speaking: "${message}"`);
      
      // This would need actual TTS and audio publishing implementation
      // For demo purposes, just log what the agent would say
      
    } catch (error) {
      console.error(`[AI-Agent] Failed to speak:`, error);
    }
  }

  /**
   * Process text with AI and generate response
   */
  private async processWithAI(inputText: string): Promise<string> {
    try {
      // This would call your AI service (OpenAI, etc.)
      // Using the agent's configured model, temperature, and prompt
      
      const aiResponse = `AI Response to: "${inputText}" using model ${this.agentConfig.model}`;
      return aiResponse;
      
    } catch (error) {
      console.error(`[AI-Agent] AI processing failed:`, error);
      return "I'm sorry, I couldn't process that right now.";
    }
  }

  /**
   * Disconnect from the room
   */
  async disconnect(): Promise<void> {
    if (this.room) {
      await this.room.disconnect();
      this.room = null;
      console.log(`[AI-Agent] Disconnected from room`);
    }
  }
}

/**
 * Agent Manager - Manages multiple AI agents
 */
export class AIAgentManager {
  private agents: Map<string, LiveKitAIAgent> = new Map();

  /**
   * Start an AI agent for a specific room
   */
  async startAgent(agentConfig: any, roomName: string): Promise<void> {
    try {
      const agent = new LiveKitAIAgent(agentConfig);
      await agent.connectToRoom(roomName);
      
      this.agents.set(agentConfig.agentId, agent);
      
      console.log(`[Agent-Manager] Started agent ${agentConfig.agentId} for room ${roomName}`);
      
    } catch (error) {
      console.error(`[Agent-Manager] Failed to start agent:`, error);
      throw error;
    }
  }

  /**
   * Stop an AI agent
   */
  async stopAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      await agent.disconnect();
      this.agents.delete(agentId);
      console.log(`[Agent-Manager] Stopped agent ${agentId}`);
    }
  }

  /**
   * Get list of running agents
   */
  getRunningAgents(): string[] {
    return Array.from(this.agents.keys());
  }
}
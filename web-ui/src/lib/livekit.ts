import { RoomServiceClient, Room } from "livekit-server-sdk";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

// Helper function to send deployment logs
async function logDeployment(agentId: string, message: string, level: string = "info") {
  try {
    console.log(`[${level.toUpperCase()}] ${message}`);
    
    // Also send to the logs API for real-time display
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3026'}/api/deployment-logs/${agentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, level, source: 'livekit' })
    }).catch(() => {
      // Ignore fetch errors - logging is not critical
    });
  } catch (error) {
    console.error(`Failed to log deployment message:`, error);
  }
}

// Initialize LiveKit client
const livekitClient = new RoomServiceClient(
  process.env.LIVEKIT_API_ENDPOINT!,
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

export interface LiveKitAgentConfig {
  agentId: string;
  agentName: string;
  model: string;
  voice: string;
  temperature: number;
  prompt: string;
  sipTrunkId?: string;
}

export class LiveKitService {
  
  /**
   * Deploy an agent to LiveKit Cloud using their managed agent service
   */
  static async deployCloudAgent(config: LiveKitAgentConfig): Promise<{
    success: boolean;
    agentId?: string;
    deploymentId?: string;
    error?: string;
  }> {
    try {
      const agentPath = path.join(process.cwd(), 'livekit-agents');
      
      await logDeployment(config.agentId, `🚀 Starting deployment to LiveKit Cloud...`);
      await logDeployment(config.agentId, `📋 Agent: ${config.agentName}`);
      await logDeployment(config.agentId, `🤖 Model: ${config.model}, Voice: ${config.voice}`);

      // Prepare agent environment variables
      const envVars = {
        AGENT_NAME: config.agentName,
        AGENT_MODEL: config.model,
        AGENT_VOICE: config.voice,
        AGENT_TEMPERATURE: config.temperature.toString(),
        AGENT_PROMPT: config.prompt,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
        LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
      };

      // Generate unique agent ID for this deployment
      const agentInstanceId = `agent_${config.agentId}_${Date.now()}`;
      
      // Update livekit.toml with agent configuration
      const fs = await import('fs');
      const tomlPath = path.join(agentPath, 'livekit.toml');
      const tomlContent = `[project]
subdomain = "firstproject-ly6tfhj5"

[agent]
runtime = "node"
entry_point = "dist/agent.js"
`;
      fs.writeFileSync(tomlPath, tomlContent);
      console.log(`[LiveKit Cloud] Updated livekit.toml for agent: ${config.agentId}`);

      // Build the agent with real-time logging
      await logDeployment(config.agentId, `🔨 Building agent code...`);
      
      // Stream build output in real-time
      const buildCommand = 'npm run build';
      
      const buildResult = await new Promise<{stdout: string, stderr: string}>((resolve, reject) => {
        const child = spawn('npm', ['run', 'build'], {
          cwd: agentPath,
          env: { ...process.env, ...envVars },
          stdio: 'pipe'
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout?.on('data', async (data) => {
          const output = data.toString();
          stdout += output;
          const lines = output.split('\n').filter(line => line.trim());
          for (const line of lines) {
            await logDeployment(config.agentId, `📦 ${line}`);
          }
        });
        
        child.stderr?.on('data', async (data) => {
          const output = data.toString();
          stderr += output;
          const lines = output.split('\n').filter(line => line.trim());
          for (const line of lines) {
            await logDeployment(config.agentId, `⚠️ ${line}`, 'warn');
          }
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            resolve({ stdout, stderr });
          } else {
            reject(new Error(`Build failed with exit code ${code}`));
          }
        });
      });
      
      await logDeployment(config.agentId, `✅ Build completed successfully`);

      // Check if LiveKit CLI is available - REQUIRED for cloud deployment
      console.log(`[LiveKit Cloud] Checking for LiveKit CLI...`);
      try {
        // First try local lk in agent path
        const localLk = path.join(agentPath, 'lk');
        const fs = await import('fs');
        if (fs.existsSync(localLk)) {
          console.log(`[LiveKit Cloud] ✓ Using local LiveKit CLI at ${localLk}`);
        } else {
          await execAsync('which lk', { cwd: agentPath });
          console.log(`[LiveKit Cloud] ✓ LiveKit CLI found in PATH`);
        }
      } catch (cliError) {
        console.error(`[LiveKit Cloud] ❌ LiveKit CLI not found`);
        console.error(`[LiveKit Cloud] Install instructions:`);
        console.error(`[LiveKit Cloud] 1. Download from: https://github.com/livekit/livekit-cli/releases`);
        console.error(`[LiveKit Cloud] 2. For macOS ARM64: curl -sSL https://github.com/livekit/livekit-cli/releases/latest/download/livekit-cli-darwin-arm64.tar.gz | tar -xz`);
        console.error(`[LiveKit Cloud] 3. Move to PATH: sudo mv lk /usr/local/bin/`);
        
        return {
          success: false,
          error: "LiveKit CLI is required for cloud deployment. Please install the LiveKit CLI and try again. Visit https://github.com/livekit/livekit-cli/releases for installation instructions.",
        };
      }

      // Deploy to LiveKit Cloud using CLI with real-time logging
      await logDeployment(config.agentId, `🚀 Deploying new agent to LiveKit Cloud infrastructure...`);
      
      // Use the actual LiveKit CLI from homebrew
      const lkCommand = '/opt/homebrew/bin/livekit-cli';
      
      const deployResult = await new Promise<{stdout: string, stderr: string}>((resolve, reject) => {
        const child = spawn(lkCommand, [
          'agent', 'create',  // Create new agent
          '--project', 'firstproject',  // Use configured project
          '--silent',
          '.'  // Working directory
        ], {
          cwd: agentPath,
          env: { ...process.env, ...envVars },
          stdio: 'pipe'
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout?.on('data', async (data) => {
          const output = data.toString();
          stdout += output;
          const lines = output.split('\n').filter(line => line.trim());
          for (const line of lines) {
            await logDeployment(config.agentId, `☁️ ${line}`);
          }
        });
        
        child.stderr?.on('data', async (data) => {
          const output = data.toString();
          stderr += output;
          const lines = output.split('\n').filter(line => line.trim());
          for (const line of lines) {
            await logDeployment(config.agentId, `⚠️ ${line}`, 'warn');
          }
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            resolve({ stdout, stderr });
          } else {
            reject(new Error(`Deployment failed with exit code ${code}`));
          }
        });
        
        // 30 second timeout
        setTimeout(() => {
          child.kill();
          reject(new Error('Deployment timed out after 30 seconds'));
        }, 30000);
      });
      
      const { stdout, stderr } = deployResult;
      await logDeployment(config.agentId, `✅ Agent deployment completed`);

      // Parse the cloud agent ID from output
      const agentIdMatch = stdout.match(/Created agent with ID \[([^\]]+)\]/) || 
                           stdout.match(/CA_\w+/);
      const cloudAgentId = agentIdMatch ? agentIdMatch[agentIdMatch.length - 1] : config.agentId;

      return {
        success: true,
        agentId: cloudAgentId,
        deploymentId: cloudAgentId,
      };

    } catch (error) {
      console.error(`[LiveKit Cloud] Failed to deploy agent ${config.agentId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Cloud deployment error",
      };
    }
  }

  /**
   * Get cloud agent status using CLI
   */
  static async getCloudAgentStatus(agentId: string): Promise<{
    success: boolean;
    status?: 'running' | 'stopped' | 'error';
    logs?: string[];
    error?: string;
  }> {
    try {
      const agentPath = path.join(process.cwd(), 'livekit-agents');
      
      // List all agents to check if any exist
      const { stdout } = await execAsync('/opt/homebrew/bin/livekit-cli agent list --project firstproject', {
        cwd: agentPath
      });

      // Check if there are any deployed agents
      const hasDeployedAgent = stdout.includes('CA_');
      
      return {
        success: true,
        status: hasDeployedAgent ? 'running' : 'stopped',
        logs: stdout.split('\n').filter(line => line.trim()),
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Status check failed",
      };
    }
  }

  /**
   * Stop cloud agent
   */
  static async stopCloudAgent(agentId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const agentPath = path.join(process.cwd(), 'livekit-agents');
      
      // Delete using the agent ID from database/livekit.toml
      // This uses the stdin approach to avoid TTY issues
      const deleteResult = await execAsync(`echo "${agentId}" | /opt/homebrew/bin/livekit-cli agent delete --project firstproject`, {
        cwd: agentPath,
        shell: '/bin/bash'
      });
      
      if (deleteResult.stdout.includes('Using agent')) {
        console.log(`[LiveKit Cloud] Agent ${agentId} deleted from cloud`);
      } else {
        console.log(`[LiveKit Cloud] No cloud agent found to delete`);
      }
      
      return { success: true };

    } catch (error) {
      // It's okay if delete fails - might mean no agent exists
      console.log(`[LiveKit Cloud] Stop agent failed (might not exist): ${error}`);
      return { success: true }; // Return success anyway as agent is not running
    }
  }

  /**
   * Deploy an agent to LiveKit cloud (room-based approach)
   */
  static async deployAgent(config: LiveKitAgentConfig): Promise<{
    success: boolean;
    roomName?: string;
    sipUri?: string;
    error?: string;
  }> {
    try {
      const roomName = `agent-${config.agentId}`;
      
      console.log(`[LiveKit] Deploying agent ${config.agentId} to room ${roomName}`);

      // Create or get the room
      const room = await livekitClient.createRoom({
        name: roomName,
        // Set empty room timeout to 5 minutes
        emptyTimeout: 300,
        // Maximum participants (1 for SIP calls)
        maxParticipants: 2,
        metadata: JSON.stringify({
          agentId: config.agentId,
          agentName: config.agentName,
          model: config.model,
          voice: config.voice,
          temperature: config.temperature,
          deployedAt: new Date().toISOString(),
        }),
      });

      console.log(`[LiveKit] Room created successfully: ${room.name}`);

      // Configure SIP for the room if SIP trunk is available
      const sipUri = process.env.LIVEKIT_SIP_TRUNK_ID 
        ? `sip:${roomName}@${process.env.LIVEKIT_API_ENDPOINT?.replace('wss://', '').replace('ws://', '')}`
        : undefined;

      return {
        success: true,
        roomName: room.name,
        sipUri,
      };

    } catch (error) {
      console.error(`[LiveKit] Failed to deploy agent ${config.agentId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown deployment error",
      };
    }
  }

  /**
   * Check if an agent is deployed and active
   */
  static async getAgentStatus(agentId: string): Promise<{
    isDeployed: boolean;
    isActive: boolean;
    roomName?: string;
    participants?: number;
    metadata?: any;
  }> {
    try {
      // First, check if it's a LiveKit Cloud agent
      try {
        const cloudStatus = await this.getCloudAgentStatus(agentId);
        if (cloudStatus.success && cloudStatus.status === 'running') {
          return {
            isDeployed: true,
            isActive: true,
            roomName: `cloud-agent-${agentId}`,
            participants: 0, // Cloud agents don't have room participants
            metadata: { type: 'cloud-agent', status: cloudStatus.status },
          };
        }
      } catch (cloudError) {
        console.log(`[LiveKit] Not a cloud agent or cloud check failed: ${cloudError}`);
      }

      // Fall back to room-based agent check
      const roomName = `agent-${agentId}`;
      
      // List rooms to check if our agent room exists
      const rooms = await livekitClient.listRooms([roomName]);
      
      if (rooms.length === 0) {
        return {
          isDeployed: false,
          isActive: false,
        };
      }

      const room = rooms[0];
      const metadata = room.metadata ? JSON.parse(room.metadata) : null;

      // A room exists but an agent is only truly "deployed" if there are participants
      // An empty room means no agent code is running
      const isActuallyDeployed = room.numParticipants > 0;
      
      return {
        isDeployed: isActuallyDeployed, // Only consider deployed if agent is in the room
        isActive: room.numParticipants > 0,
        roomName: room.name,
        participants: room.numParticipants,
        metadata,
      };

    } catch (error) {
      console.error(`[LiveKit] Failed to get agent status for ${agentId}:`, error);
      return {
        isDeployed: false,
        isActive: false,
      };
    }
  }

  /**
   * List all deployed agents
   */
  static async listDeployedAgents(): Promise<Array<{
    agentId: string;
    roomName: string;
    isActive: boolean;
    participants: number;
    deployedAt?: string;
  }>> {
    try {
      // Get all rooms with agent- prefix
      const rooms = await livekitClient.listRooms();
      
      return rooms
        .filter(room => room.name.startsWith('agent-'))
        .map(room => {
          const agentId = room.name.replace('agent-', '');
          const metadata = room.metadata ? JSON.parse(room.metadata) : {};
          
          return {
            agentId,
            roomName: room.name,
            isActive: room.numParticipants > 0,
            participants: room.numParticipants,
            deployedAt: metadata.deployedAt,
          };
        });

    } catch (error) {
      console.error(`[LiveKit] Failed to list deployed agents:`, error);
      return [];
    }
  }

  /**
   * Stop/delete an agent deployment
   */
  static async stopAgent(agentId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const roomName = `agent-${agentId}`;
      
      // Check if room exists first
      try {
        const rooms = await livekitClient.listRooms([roomName]);
        if (rooms.length === 0) {
          console.log(`[LiveKit] Room ${roomName} does not exist, considering agent already stopped`);
          return { success: true };
        }
      } catch (listError) {
        console.log(`[LiveKit] Could not check room existence, attempting deletion anyway`);
      }
      
      // Delete the room to stop the agent
      await livekitClient.deleteRoom(roomName);
      
      console.log(`[LiveKit] Agent ${agentId} stopped and room ${roomName} deleted`);
      
      return { success: true };

    } catch (error) {
      console.error(`[LiveKit] Failed to stop agent ${agentId}:`, error);
      
      // If the error is "room does not exist", consider it a success
      if (error instanceof Error && error.message.includes("does not exist")) {
        console.log(`[LiveKit] Room for agent ${agentId} does not exist, considering already stopped`);
        return { success: true };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown stop error",
      };
    }
  }

  /**
   * Test LiveKit connection
   */
  static async testConnection(): Promise<{
    connected: boolean;
    endpoint?: string;
    error?: string;
  }> {
    try {
      // Try to list rooms to test connection
      await livekitClient.listRooms();
      
      return {
        connected: true,
        endpoint: process.env.LIVEKIT_API_ENDPOINT,
      };

    } catch (error) {
      console.error(`[LiveKit] Connection test failed:`, error);
      return {
        connected: false,
        error: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }
}
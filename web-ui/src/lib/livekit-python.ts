import { exec, spawn } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";

const execAsync = promisify(exec);

export interface AgentConfig {
  agentId: string;
  agentName: string;
  model: string;
  voice: string;
  temperature: number;
  prompt: string;
  template?: string;
  customerName?: string;
  appointmentTime?: string;
  sttProvider?: string;
  ttsProvider?: string;
}

export interface CloudAgent {
  id: string;
  name: string;
  regions: string[];
  version: string;
  deployedAt: string;
}

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

export class LiveKitPythonService {
  
  /**
   * Generate Python agent script from template
   */
  static async generateAgentScript(config: AgentConfig): Promise<string> {
    // Choose template based on config
    const templateName = config.template === 'outbound_caller' ? 'outbound_caller_template.py' : 'agent_template.py';
    const templatePath = path.join(process.cwd(), 'livekit-agents', templateName);
    const template = await fs.readFile(templatePath, 'utf-8');
    
    // Generate STT and TTS model configurations
    const sttModel = this.generateSTTModel(config.sttProvider || 'deepgram');
    const ttsModel = this.generateTTSModel(config.ttsProvider || 'openai', config.voice);
    
    // Replace placeholders in template
    let script = template
      .replace(/{agent_name}/g, config.agentName)
      .replace(/{agent_id}/g, config.agentId)
      .replace(/{agent_description}/g, config.description || '')
      .replace(/{room_name}/g, `room-${config.agentId}`)
      .replace(/{model}/g, config.model)
      .replace(/{voice}/g, config.voice)
      .replace(/{temperature}/g, config.temperature.toString())
      .replace(/{system_prompt}/g, config.prompt.replace(/"/g, '\\"'))
      .replace(/{stt_model}/g, sttModel)
      .replace(/{tts_model}/g, ttsModel);

    // Replace outbound caller specific placeholders
    if (config.template === 'outbound_caller') {
      script = script
        .replace(/{customer_name}/g, config.customerName || 'Customer')
        .replace(/{appointment_time}/g, config.appointmentTime || 'your scheduled time');
    }
    
    return script;
  }

  /**
   * Generate STT model configuration
   */
  private static generateSTTModel(provider: string): string {
    switch (provider) {
      case 'deepgram':
        return 'deepgram.STT()';
      case 'openai':
        return 'openai.STT(model="whisper-1")';
      default:
        return 'deepgram.STT()';
    }
  }

  /**
   * Generate TTS model configuration
   */
  private static generateTTSModel(provider: string, voice: string): string {
    switch (provider) {
      case 'openai':
        return `openai.TTS(model="tts-1", voice="${voice}")`;
      case 'cartesia':
        return `cartesia.TTS(voice="${voice}")`;
      default:
        return `openai.TTS(model="tts-1", voice="${voice}")`;
    }
  }
  
  /**
   * Save agent script to file
   */
  static async saveAgentScript(agentId: string, script: string): Promise<string> {
    const agentDir = path.join(process.cwd(), 'livekit-agents', 'deployed');
    await fs.mkdir(agentDir, { recursive: true });
    
    const scriptPath = path.join(agentDir, `agent_${agentId}.py`);
    await fs.writeFile(scriptPath, script, 'utf-8');
    
    return scriptPath;
  }
  
  /**
   * Sync agents between local DB and LiveKit Cloud
   */
  static async syncAgents(): Promise<CloudAgent[]> {
    try {
      const { stdout } = await execAsync('/opt/homebrew/bin/livekit-cli agent list --project firstproject');
      
      // Parse the table output to extract agent information
      const lines = stdout.split('\n');
      const agents: CloudAgent[] = [];
      
      // Skip header lines and parse data rows
      for (const line of lines) {
        const match = line.match(/│\s*(CA_\w+)\s*│\s*([^│]+)\s*│\s*([^│]+)\s*│\s*([^│]+)\s*│/);
        if (match) {
          agents.push({
            id: match[1].trim(),
            name: match[1].trim(), // Use ID as name for now
            regions: match[2].trim().split(',').map(r => r.trim()),
            version: match[3].trim(),
            deployedAt: match[4].trim(),
          });
        }
      }
      
      console.log(`[LiveKit Sync] Found ${agents.length} agents on LiveKit Cloud`);
      return agents;
      
    } catch (error) {
      console.error('[LiveKit Sync] Failed to sync agents:', error);
      return [];
    }
  }
  
  /**
   * Deploy Python agent to LiveKit Cloud
   */
  static async deployPythonAgent(config: AgentConfig): Promise<{
    success: boolean;
    agentId?: string;
    deploymentLogs?: string[];
    error?: string;
  }> {
    const logs: string[] = [];
    
    try {
      await logDeployment(config.agentId, `🚀 Starting Python agent deployment...`);
      logs.push(`🚀 Starting Python agent deployment...`);
      
      // Generate Python script
      await logDeployment(config.agentId, `📝 Generating Python agent script...`);
      logs.push(`📝 Generating Python agent script...`);
      const script = await this.generateAgentScript(config);
      const scriptPath = await this.saveAgentScript(config.agentId, script);
      
      await logDeployment(config.agentId, `✅ Agent script saved: ${scriptPath}`);
      logs.push(`✅ Agent script saved: ${scriptPath}`);
      
      // Create agent directory structure
      const agentDir = path.join(process.cwd(), 'livekit-agents', 'agents', config.agentId);
      await fs.mkdir(agentDir, { recursive: true });
      
      // Copy agent script and requirements
      await fs.copyFile(scriptPath, path.join(agentDir, 'agent.py'));
      await fs.copyFile(
        path.join(process.cwd(), 'livekit-agents', 'requirements.txt'),
        path.join(agentDir, 'requirements.txt')
      );
      
      // Create livekit.toml for this agent
      const tomlContent = `[project]
subdomain = "firstproject-ly6tfhj5"

[agent]
runtime = "python"
entry_point = "agent.py"
`;
      await fs.writeFile(path.join(agentDir, 'livekit.toml'), tomlContent);
      
      // Create Dockerfile for Python agent
      const dockerfileContent = `FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy agent code
COPY agent.py .

# Run the agent
CMD ["python", "agent.py"]`;
      await fs.writeFile(path.join(agentDir, 'Dockerfile'), dockerfileContent);
      
      // Check for existing agents (deployment will auto-replace if at limit)
      await logDeployment(config.agentId, `🔍 Checking for existing agents...`);
      logs.push(`🔍 Checking for existing agents...`);
      
      try {
        const { stdout: listOutput } = await execAsync('/opt/homebrew/bin/livekit-cli agent list --project firstproject');
        const agentIdMatch = listOutput.match(/CA_\w+/);
        
        if (agentIdMatch) {
          const existingId = agentIdMatch[0];
          await logDeployment(config.agentId, `ℹ️ Found existing agent ${existingId} - will be replaced during deployment`);
          logs.push(`ℹ️ Found existing agent ${existingId} - will be replaced during deployment`);
        }
      } catch (cleanupError) {
        console.log('Could not check existing agents:', cleanupError);
      }
      
      await logDeployment(config.agentId, `📦 Deploying to LiveKit Cloud...`);
      logs.push(`📦 Deploying to LiveKit Cloud...`);
      
      // Deploy using LiveKit CLI
      const deployResult = await new Promise<{ stdout: string, stderr: string }>((resolve, reject) => {
        const child = spawn('/opt/homebrew/bin/livekit-cli', [
          'agent', 'create',
          '--project', 'firstproject',
          '--silent'
        ], {
          cwd: agentDir,
          env: {
            ...process.env,
            AGENT_NAME: config.agentName,
            AGENT_MODEL: config.model,
            AGENT_VOICE: config.voice,
            AGENT_TEMPERATURE: config.temperature.toString(),
            AGENT_PROMPT: config.prompt,
            OPENAI_API_KEY: process.env.OPENAI_API_KEY,
            LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
            LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
          },
          stdio: 'pipe'
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout?.on('data', async (data) => {
          const output = data.toString();
          stdout += output;
          const lines = output.split('\n').filter(line => line.trim());
          for (const line of lines) {
            await logDeployment(config.agentId, `📄 ${line}`);
            logs.push(`📄 ${line}`);
          }
        });
        
        child.stderr?.on('data', async (data) => {
          const output = data.toString();
          stderr += output;
          const lines = output.split('\n').filter(line => line.trim());
          for (const line of lines) {
            if (!line.includes('DEPRECATION NOTICE') && !line.includes('TTY')) {
              await logDeployment(config.agentId, `⚠️ ${line}`, 'warn');
              logs.push(`⚠️ ${line}`);
            }
          }
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            resolve({ stdout, stderr });
          } else {
            reject(new Error(`Deployment failed with exit code ${code}`));
          }
        });
        
        // 60 second timeout for deployment
        setTimeout(() => {
          child.kill();
          reject(new Error('Deployment timed out after 60 seconds'));
        }, 60000);
      });
      
      // Parse the output to get the cloud agent ID
      const agentIdMatch = deployResult.stdout.match(/Created agent with ID \[([^\]]+)\]/) ||
                           deployResult.stdout.match(/CA_\w+/);
      const cloudAgentId = agentIdMatch ? agentIdMatch[agentIdMatch.length - 1] : config.agentId;
      
      await logDeployment(config.agentId, `✅ Agent deployed successfully with ID: ${cloudAgentId}`);
      logs.push(`✅ Agent deployed successfully with ID: ${cloudAgentId}`);
      
      return {
        success: true,
        agentId: cloudAgentId,
        deploymentLogs: logs,
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await logDeployment(config.agentId, `❌ Deployment failed: ${errorMsg}`, 'error');
      logs.push(`❌ Deployment failed: ${errorMsg}`);
      
      return {
        success: false,
        error: errorMsg,
        deploymentLogs: logs,
      };
    }
  }
  
  /**
   * Delete agent from LiveKit Cloud
   */
  static async deleteCloudAgent(cloudAgentId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await execAsync(`/opt/homebrew/bin/livekit-cli agent delete --id ${cloudAgentId} --project firstproject`);
      console.log(`[LiveKit] Agent ${cloudAgentId} deleted from cloud`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }
  
  /**
   * Get agent preview (Python script content)
   */
  static async getAgentPreview(config: AgentConfig): Promise<string> {
    const script = await this.generateAgentScript(config);
    return script;
  }
}
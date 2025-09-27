import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { spawn, exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

// Helper function to check if process exists
const processExists = (pid: number): boolean => {
  try {
    return process.kill(pid, 0);
  } catch (error: any) {
    return error.code === 'EPERM'; // Process exists but no permission to kill
  }
};

const execAsync = promisify(exec);

interface AgentProcess {
  pid: number;
  port: number;
  status: "starting" | "running" | "stopping" | "stopped";
  startTime: Date;
  lastHealthCheck?: Date;
  healthStatus?: "healthy" | "unhealthy" | "unknown";
}

// In-memory process tracking (in production, use Redis or database)
const agentProcesses = new Map<string, AgentProcess>();
const AI_AGENT_PATH = path.join(process.cwd(), "../ai-agent");
const LOG_DIR = path.join(process.cwd(), "../logs");

export const agentHealthRouter = createTRPCRouter({
  // Get real-time agent health status
  getAgentHealth: publicProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ ctx, input }) => {
      // First check if agent exists in database
      const agent = await ctx.prisma.agent.findUnique({
        where: { id: input.agentId }
      });

      if (!agent) {
        return {
          agentId: input.agentId,
          status: "stopped",
          isRunning: false,
          pid: null,
          port: null,
          uptime: 0,
          healthStatus: "unknown",
          lastHealthCheck: null,
        };
      }

      // For cloud deployments, use agent status as health indicator
      if (agent.deploymentMode === "livekit" || agent.deploymentMode === "cloud") {
        const healthStatus = agent.status === "ACTIVE" ? "healthy" : 
                           agent.status === "ERROR" ? "unhealthy" : "unknown";
        
        return {
          agentId: input.agentId,
          status: agent.status === "ACTIVE" ? "running" : "stopped",
          isRunning: agent.status === "ACTIVE",
          pid: null, // No PID for cloud deployments
          port: null, // No local port for cloud deployments
          uptime: agent.status === "ACTIVE" && agent.updatedAt 
            ? Date.now() - agent.updatedAt.getTime() 
            : 0,
          healthStatus,
          lastHealthCheck: new Date(),
          deploymentMode: "cloud",
        };
      }

      // For local deployments, check actual process
      const process = agentProcesses.get(input.agentId);
      
      if (!process) {
        return {
          agentId: input.agentId,
          status: "stopped",
          isRunning: false,
          pid: null,
          port: null,
          uptime: 0,
          healthStatus: "unknown",
          lastHealthCheck: null,
          deploymentMode: "local",
        };
      }

      // Check if process is actually running
      let isActuallyRunning = false;
      if (processExists(process.pid)) {
        isActuallyRunning = true;
      } else {
        // Process doesn't exist
        agentProcesses.delete(input.agentId);
        isActuallyRunning = false;
      }

      // Perform health check if process is running
      let healthStatus = process.healthStatus || "unknown";
      if (isActuallyRunning) {
        try {
          const response = await fetch(`http://localhost:${process.port}/health`);
          healthStatus = response.ok ? "healthy" : "unhealthy";
          agentProcesses.set(input.agentId, {
            ...process,
            healthStatus,
            lastHealthCheck: new Date(),
          });
        } catch (error) {
          healthStatus = "unhealthy";
        }
      }

      const uptime = isActuallyRunning 
        ? Date.now() - process.startTime.getTime() 
        : 0;

      return {
        agentId: input.agentId,
        status: isActuallyRunning ? process.status : "stopped",
        isRunning: isActuallyRunning,
        pid: isActuallyRunning ? process.pid : null,
        port: isActuallyRunning ? process.port : null,
        uptime,
        healthStatus,
        lastHealthCheck: process.lastHealthCheck,
        startTime: process.startTime,
        deploymentMode: "local",
      };
    }),

  // Start agent process locally
  startLocalAgent: publicProcedure
    .input(z.object({
      agentId: z.string(),
      port: z.number().default(8082),
      livekitUrl: z.string().optional(),
      livekitApiKey: z.string().optional(),
      livekitApiSecret: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if agent exists in database
        const agent = await ctx.prisma.agent.findUnique({
          where: { id: input.agentId },
        });

        if (!agent) {
          throw new Error("Agent not found");
        }

        // Check if process is already running
        const existingProcess = agentProcesses.get(input.agentId);
        if (existingProcess) {
          if (processExists(existingProcess.pid)) {
            throw new Error("Agent process is already running");
          } else {
            // Process doesn't exist, remove from tracking
            agentProcesses.delete(input.agentId);
          }
        }

        // Set up environment variables
        const env = {
          ...process.env,
          LIVEKIT_URL: input.livekitUrl || process.env.LIVEKIT_URL,
          LIVEKIT_API_KEY: input.livekitApiKey || process.env.LIVEKIT_API_KEY,
          LIVEKIT_API_SECRET: input.livekitApiSecret || process.env.LIVEKIT_API_SECRET,
          OPENAI_API_KEY: process.env.OPENAI_API_KEY,
          AGENT_ID: input.agentId,
          AGENT_PORT: input.port.toString(),
          AGENT_PROMPT: agent.prompt,
          AGENT_MODEL: agent.model,
          AGENT_VOICE: agent.voice,
          AGENT_TEMPERATURE: agent.temperature.toString(),
        };

        // Check if Python script exists
        const pythonScriptPath = path.join(AI_AGENT_PATH, "main.py");
        if (!fs.existsSync(pythonScriptPath)) {
          throw new Error(`Python script not found at ${pythonScriptPath}`);
        }

        // Start the Python agent process
        const childProcess = spawn("python", ["main.py"], {
          cwd: AI_AGENT_PATH,
          env,
          detached: false,
          stdio: ["ignore", "pipe", "pipe"],
        });

        // Track the process
        const agentProcess: AgentProcess = {
          pid: childProcess.pid!,
          port: input.port,
          status: "starting",
          startTime: new Date(),
        };

        agentProcesses.set(input.agentId, agentProcess);

        // Update agent status in database
        await ctx.prisma.agent.update({
          where: { id: input.agentId },
          data: { 
            status: "DEPLOYING"
          },
        });

        // Create log file for capturing output
        const logFilePath = path.join(LOG_DIR, `agent-${input.agentId}.log`);
        
        // Ensure log directory exists
        if (!fs.existsSync(LOG_DIR)) {
          fs.mkdirSync(LOG_DIR, { recursive: true });
        }

        // Write initial deployment log
        const deploymentStartLog = `[${new Date().toISOString()}] Starting deployment for agent ${input.agentId}\n`;
        fs.appendFileSync(logFilePath, deploymentStartLog);

        // Capture stdout and stderr to log file
        childProcess.stdout?.on('data', (data) => {
          const logEntry = `[${new Date().toISOString()}] STDOUT: ${data.toString()}\n`;
          fs.appendFileSync(logFilePath, logEntry);
        });

        childProcess.stderr?.on('data', (data) => {
          const logEntry = `[${new Date().toISOString()}] STDERR: ${data.toString()}\n`;
          fs.appendFileSync(logFilePath, logEntry);
        });

        // Set up process event handlers
        childProcess.on("error", async (error) => {
          const errorLog = `[${new Date().toISOString()}] Process error: ${error.message}\n`;
          fs.appendFileSync(logFilePath, errorLog);
          console.error(`Agent ${input.agentId} process error:`, error);
          agentProcesses.delete(input.agentId);
          await ctx.prisma.agent.update({
            where: { id: input.agentId },
            data: { status: "ERROR" },
          });
        });

        childProcess.on("exit", async (code) => {
          const exitLog = `[${new Date().toISOString()}] Process exited with code ${code}\n`;
          fs.appendFileSync(logFilePath, exitLog);
          console.log(`Agent ${input.agentId} process exited with code ${code}`);
          agentProcesses.delete(input.agentId);
          await ctx.prisma.agent.update({
            where: { id: input.agentId },
            data: { status: "INACTIVE" },
          });
        });

        // Wait a moment for the process to start, then check health
        setTimeout(async () => {
          try {
            const response = await fetch(`http://localhost:${input.port}/health`);
            if (response.ok) {
              agentProcesses.set(input.agentId, {
                ...agentProcess,
                status: "running",
                healthStatus: "healthy",
              });
              await ctx.prisma.agent.update({
                where: { id: input.agentId },
                data: { status: "ACTIVE" },
              });
            }
          } catch (error) {
            console.warn(`Health check failed for agent ${input.agentId}:`, error);
          }
        }, 3000);

        return {
          success: true,
          message: `Agent "${agent.name}" is starting locally on port ${input.port}`,
          process: {
            pid: childProcess.pid,
            port: input.port,
            status: "starting",
          },
        };
      } catch (error) {
        console.error("Error starting local agent:", error);
        throw new Error(`Failed to start agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Stop agent process
  stopLocalAgent: publicProcedure
    .input(z.object({ agentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const agentProcess = agentProcesses.get(input.agentId);
        
        if (!agentProcess) {
          throw new Error("Agent process not found");
        }

        // Update status to stopping
        agentProcesses.set(input.agentId, {
          ...agentProcess,
          status: "stopping",
        });

        // Kill the process
        try {
          process.kill(agentProcess.pid, "SIGTERM");
          
          // If process doesn't stop gracefully, force kill after 5 seconds
          setTimeout(() => {
            try {
              process.kill(agentProcess.pid, "SIGKILL");
            } catch {
              // Process already stopped
            }
          }, 5000);
        } catch (error) {
          // Process might already be stopped
          console.warn(`Failed to kill process ${agentProcess.pid}:`, error);
        }

        // Remove from tracking
        agentProcesses.delete(input.agentId);

        // Update database
        await ctx.prisma.agent.update({
          where: { id: input.agentId },
          data: { status: "INACTIVE" },
        });

        return {
          success: true,
          message: "Agent process stopped successfully",
        };
      } catch (error) {
        console.error("Error stopping agent:", error);
        throw new Error(`Failed to stop agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Get all agent processes status
  getAllAgentHealth: publicProcedure.query(async ({ ctx }) => {
    const agents = await ctx.prisma.agent.findMany({
      select: { id: true, name: true, status: true },
    });

    const healthStatuses = await Promise.all(
      agents.map(async (agent) => {
        const process = agentProcesses.get(agent.id);
        
        if (!process) {
          return {
            agentId: agent.id,
            agentName: agent.name,
            status: "stopped",
            isRunning: false,
            healthStatus: "unknown",
          };
        }

        // Check if process is actually running
        let isActuallyRunning = false;
        if (processExists(process.pid)) {
          isActuallyRunning = true;
        } else {
          agentProcesses.delete(agent.id);
          isActuallyRunning = false;
        }

        // Quick health check
        let healthStatus = "unknown";
        if (isActuallyRunning) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            const response = await fetch(`http://localhost:${process.port}/health`, {
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            healthStatus = response.ok ? "healthy" : "unhealthy";
          } catch {
            healthStatus = "unhealthy";
          }
        }

        return {
          agentId: agent.id,
          agentName: agent.name,
          status: isActuallyRunning ? process.status : "stopped",
          isRunning: isActuallyRunning,
          healthStatus,
          pid: isActuallyRunning ? process.pid : null,
          port: isActuallyRunning ? process.port : null,
          uptime: isActuallyRunning ? Date.now() - process.startTime.getTime() : 0,
        };
      })
    );

    return {
      agents: healthStatuses,
      totalRunning: healthStatuses.filter(s => s.isRunning).length,
      totalHealthy: healthStatuses.filter(s => s.healthStatus === "healthy").length,
      lastCheck: new Date().toISOString(),
    };
  }),

  // Get system resource usage
  getSystemResources: publicProcedure.query(async () => {
    try {
      // Get system info
      const { stdout: memInfo } = await execAsync("free -m");
      const { stdout: cpuInfo } = await execAsync("top -bn1 | grep 'Cpu(s)'");
      const { stdout: diskInfo } = await execAsync("df -h /");

      // Parse memory info
      const memLines = memInfo.split('\n');
      const memLine = memLines[1]?.split(/\s+/) || [];
      const totalMem = parseInt(memLine[1] || "0");
      const usedMem = parseInt(memLine[2] || "0");
      const memoryUsage = totalMem > 0 ? (usedMem / totalMem) * 100 : 0;

      // Parse CPU info (simplified)
      const cpuMatch = cpuInfo.match(/(\d+\.?\d*)%?\s*us/);
      const cpuUsage = cpuMatch ? parseFloat(cpuMatch[1]) : 0;

      // Parse disk info
      const diskLines = diskInfo.split('\n');
      const diskLine = diskLines[1]?.split(/\s+/) || [];
      const diskUsageStr = diskLine[4] || "0%";
      const diskUsage = parseFloat(diskUsageStr.replace('%', ''));

      return {
        memory: {
          total: totalMem,
          used: usedMem,
          percentage: Math.round(memoryUsage),
        },
        cpu: {
          percentage: Math.round(cpuUsage),
        },
        disk: {
          percentage: Math.round(diskUsage),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.warn("Failed to get system resources:", error);
      return {
        memory: { total: 0, used: 0, percentage: 0 },
        cpu: { percentage: 0 },
        disk: { percentage: 0 },
        timestamp: new Date().toISOString(),
      };
    }
  }),

  // Get deployment logs
  getDeploymentLogs: publicProcedure
    .input(z.object({
      agentId: z.string(),
      logType: z.enum(["deployment", "agent", "health"]).default("deployment"),
      lines: z.number().default(100),
    }))
    .query(async ({ ctx, input }) => {
      console.log(`[getDeploymentLogs] Called with agentId: ${input.agentId}, logType: ${input.logType}`);
      
      try {
        const agentProcess = agentProcesses.get(input.agentId);
        const logs: string[] = [];
        const timing: Record<string, any> = {};

        console.log(`[getDeploymentLogs] Agent process found: ${!!agentProcess}`);

        // Get deployment timing info
        if (agentProcess) {
          timing.deploymentStarted = agentProcess.startTime.toISOString();
          timing.deploymentDuration = Date.now() - agentProcess.startTime.getTime();
          timing.status = agentProcess.status;
          timing.pid = agentProcess.pid;
          timing.port = agentProcess.port;
          console.log(`[getDeploymentLogs] Process timing:`, timing);
        }

        if (input.logType === "deployment") {
          // Get agent from database to determine real status
          const agent = await ctx.prisma.agent.findUnique({ where: { id: input.agentId } });
          
          if (!agent) {
            logs.push(`❌ Agent not found: ${input.agentId}`);
          } else {
            const currentTime = new Date().toISOString();
            const deploymentDuration = agentProcess 
              ? Math.floor((Date.now() - agentProcess.startTime.getTime()) / 1000)
              : 0;

            if (agentProcess) {
              // LOCAL DEPLOYMENT - Real process logs
              logs.push(`🖥️  [${currentTime}] LOCAL DEPLOYMENT ACTIVE`);
              logs.push(`🚀 Process started: ${agentProcess.startTime.toISOString()}`);
              logs.push(`🔧 PID: ${agentProcess.pid} | Port: ${agentProcess.port}`);
              logs.push(`⏱️  Runtime: ${deploymentDuration}s`);
              logs.push(`📊 Process Status: ${agentProcess.status.toUpperCase()}`);
              
              // Try to get actual Python process logs
              try {
                const { stdout } = await execAsync(`ps -p ${agentProcess.pid} -o pid,ppid,cmd,%cpu,%mem,etime`);
                logs.push(`📈 Process Info:`);
                logs.push(stdout);
              } catch (error) {
                logs.push(`⚠️  Could not read process info: Process may have stopped`);
              }

              // Check actual log files from the bash script
              const bashLogPath = path.join(LOG_DIR, `agent-${input.agentId}.log`);
              if (fs.existsSync(bashLogPath)) {
                try {
                  const logContent = fs.readFileSync(bashLogPath, 'utf-8');
                  const recentLines = logContent.split('\n').slice(-10).filter(line => line.trim());
                  if (recentLines.length > 0) {
                    logs.push(`📝 Recent Python Script Output:`);
                    recentLines.forEach(line => logs.push(`   ${line}`));
                  }
                } catch (error) {
                  logs.push(`❌ Could not read log file: ${error}`);
                }
              }

              if (agentProcess.healthStatus) {
                logs.push(`💚 Health Status: ${agentProcess.healthStatus.toUpperCase()}`);
                logs.push(`🌐 Health Endpoint: http://localhost:${agentProcess.port}/health`);
              }
            } else {
              // LIVEKIT CLOUD DEPLOYMENT - Real configuration status
              logs.push(`☁️ [${currentTime}] LIVEKIT CLOUD DEPLOYMENT`);
              logs.push(`🤖 Agent: ${agent.name}`);
              logs.push(`🧠 Model: ${agent.model} | 🗣️ Voice: ${agent.voice}`);
              logs.push(`🌡️ Temperature: ${agent.temperature} | ⏱️ Max Tokens: ${agent.maxTokens || 1000}`);
              logs.push(`🚀 Deployment Mode: LiveKit Cloud`);
              
              // Show actual LiveKit configuration
              const livekitConfig = agent.livekitConfig as any;
              if (livekitConfig) {
                logs.push(`🔧 Room Template: ${livekitConfig.roomTemplate || `agent-${agent.id}`}`);
                logs.push(`🌐 Webhook URL: ${livekitConfig.webhookUrl || 'Not configured'}`);
                logs.push(`🎯 Server URL: ${livekitConfig.serverUrl || 'Default LiveKit server'}`);
              }
              
              // Real deployment status
              switch (agent.status) {
                case "DEPLOYING":
                  logs.push(`🔄 [${currentTime}] Configuring LiveKit cloud deployment...`);
                  logs.push(`⚙️ Setting up agent configuration and webhooks`);
                  logs.push(`🌐 Preparing LiveKit cloud integration`);
                  break;
                  
                case "ACTIVE":
                  logs.push(`✅ [${currentTime}] LiveKit deployment successful`);
                  logs.push(`🎉 Agent is configured and ready for calls`);
                  logs.push(`📞 SIP integration ready via LiveKit cloud`);
                  logs.push(`🌐 Available on LiveKit infrastructure`);
                  logs.push(`📊 Last configured: ${agent.updatedAt?.toISOString() || currentTime}`);
                  break;
                  
                case "ERROR":
                  logs.push(`❌ [${currentTime}] LiveKit deployment configuration failed`);
                  logs.push(`🛠️ Check LiveKit API credentials`);
                  logs.push(`🔍 Verify LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET`);
                  logs.push(`📞 Ensure SIP integration is configured`);
                  break;
                  
                case "INACTIVE":
                  logs.push(`⭕ [${currentTime}] Agent not deployed to LiveKit`);
                  logs.push(`💤 Click deploy to configure LiveKit cloud deployment`);
                  break;
                  
                default:
                  logs.push(`❓ [${currentTime}] Unknown status: ${agent.status}`);
              }
            }
            
            // Add current timestamp for real-time feel
            logs.push(`🕐 Last updated: ${currentTime}`);
          }
        } 
        
        else if (input.logType === "agent") {
          // Get Python agent logs
          if (agentProcess) {
            logs.push(`📱 Python Agent Process Logs (PID: ${agentProcess.pid})`);
            logs.push(`🔍 Log location: ${AI_AGENT_PATH}/logs/`);
            
            // Try to read Python script output
            try {
              const { stdout } = await execAsync(`ps -p ${agentProcess.pid} -o pid,ppid,cmd,%cpu,%mem,lstart`);
              logs.push("📊 Process Info:");
              logs.push(stdout);
            } catch (error) {
              logs.push(`❌ Could not get process info: ${error}`);
            }
          } else {
            logs.push("❌ No local agent process found");
            logs.push("💡 Agent might be deployed to LiveKit cloud");
          }
        }
        
        else if (input.logType === "health") {
          // Get health check logs
          if (agentProcess) {
            logs.push(`🏥 Health Check Results for Agent ${input.agentId}`);
            logs.push(`🌐 Health Endpoint: http://localhost:${agentProcess.port}/health`);
            
            try {
              const response = await fetch(`http://localhost:${agentProcess.port}/health`);
              logs.push(`✅ Status: ${response.status} ${response.statusText}`);
              logs.push(`⏰ Response Time: ${Date.now()}ms`);
              
              if (response.ok) {
                const data = await response.text();
                logs.push(`📄 Response: ${data}`);
              }
            } catch (error) {
              logs.push(`❌ Health Check Failed: ${error}`);
            }
            
            if (agentProcess.lastHealthCheck) {
              logs.push(`🕐 Last Check: ${agentProcess.lastHealthCheck.toISOString()}`);
            }
          } else {
            logs.push("❌ No local agent process to health check");
          }
        }

        // Add basic system info only if no real logs
        if (logs.length === 0) {
          const timestamp = new Date().toISOString();
          logs.push(`📋 Log Type: ${input.logType.toUpperCase()}`);
          logs.push(`🆔 Agent ID: ${input.agentId}`);
          logs.push(`⏰ ${timestamp}`);
          logs.push(`ℹ️  No deployment activity to show`);
        }

        console.log(`[getDeploymentLogs] Returning ${logs.length} log lines`);

        const timestamp = new Date().toISOString();
        
        return {
          logs,
          timing,
          logType: input.logType,
          agentId: input.agentId,
          timestamp,
          totalLines: logs.length,
        };
      } catch (error) {
        console.error("Error getting deployment logs:", error);
        return {
          logs: [
            `❌ Error retrieving logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
            `🕐 Timestamp: ${new Date().toISOString()}`,
          ],
          timing: {},
          logType: input.logType,
          agentId: input.agentId,
          timestamp: new Date().toISOString(),
          totalLines: 0,
        };
      }
    }),
});
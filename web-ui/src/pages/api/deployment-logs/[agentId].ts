import { NextApiRequest, NextApiResponse } from "next";

interface DeploymentLog {
  timestamp: string;
  level: string;
  message: string;
  source: string;
}

// In-memory log storage (in production, use Redis or database)
const deploymentLogs: Record<string, DeploymentLog[]> = {};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { agentId } = req.query as { agentId: string };
  
  if (!agentId) {
    return res.status(400).json({ error: "Agent ID is required" });
  }

  if (req.method === "GET") {
    // Get logs for agent
    const logs = deploymentLogs[agentId] || [];
    return res.status(200).json({
      agentId,
      logs: logs.map(log => log.message),
      totalLines: logs.length,
      timestamp: new Date().toISOString()
    });
  }

  if (req.method === "POST") {
    // Add log entry
    const { message, level = "info", source = "deployment" } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!deploymentLogs[agentId]) {
      deploymentLogs[agentId] = [];
    }

    const logEntry: DeploymentLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      source
    };

    deploymentLogs[agentId].push(logEntry);
    
    // Keep only last 100 logs per agent
    if (deploymentLogs[agentId].length > 100) {
      deploymentLogs[agentId] = deploymentLogs[agentId].slice(-100);
    }

    return res.status(200).json({ success: true });
  }

  if (req.method === "DELETE") {
    // Clear logs for agent
    delete deploymentLogs[agentId];
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

// Export function to add logs programmatically
export function addDeploymentLog(agentId: string, message: string, level: string = "info", source: string = "deployment") {
  if (!deploymentLogs[agentId]) {
    deploymentLogs[agentId] = [];
  }

  const logEntry: DeploymentLog = {
    timestamp: new Date().toISOString(),
    level,
    message,
    source
  };

  deploymentLogs[agentId].push(logEntry);
  
  // Keep only last 100 logs per agent
  if (deploymentLogs[agentId].length > 100) {
    deploymentLogs[agentId] = deploymentLogs[agentId].slice(-100);
  }
}
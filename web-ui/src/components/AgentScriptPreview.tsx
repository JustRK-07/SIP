import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
// import { api } from "@/utils/api"; // Removed tRPC dependency
import { Loader2, FileCode, Download, Copy, Check, Rocket, Sun, Moon, Edit3, Save } from "lucide-react";

interface AgentScriptPreviewProps {
  agent: {
    id: string;
    name: string;
    model: string;
    voice: string;
    temperature: number;
    prompt: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onDeploy?: () => void;
}

export function AgentScriptPreview({ agent, isOpen, onClose, onDeploy }: AgentScriptPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedScript, setEditedScript] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  
  // Mock preview data - TODO: implement REST API call
  const [preview, setPreview] = useState<{ script: string; filename: string; roomName?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (isOpen && agent.id) {
      setIsLoading(true);
      // Generate GOBI Local Agent Script
      const gobiIntegratedScript = `#!/usr/bin/env python3
"""
GOBI Local Agent - ${agent.name}
Runs locally and integrates with GOBI backend for status updates
"""

import logging
import sys
import argparse
import threading
import time
import signal
from datetime import datetime
from typing import Optional
import requests

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class GOBILocalAgent:
    """Local agent with GOBI backend integration - runs on your machine"""

    def __init__(
        self,
        gobi_url: str = "http://localhost:3000",
        agent_id: str = "${agent.id}"
    ):
        self.gobi_url = gobi_url.rstrip('/')
        self.session = requests.Session()
        self.access_token: Optional[str] = None
        self.agent_id = agent_id
        self.agent_name = "${agent.name}"
        self.is_running = False
        self.heartbeat_interval = 30
        self.heartbeat_thread: Optional[threading.Thread] = None
        self.start_time = None
        self.total_calls = 0
        self.successful_calls = 0

        # Register signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully"""
        logger.info("\\n🛑 Shutdown signal received, stopping agent...")
        self.stop()
        sys.exit(0)

    def login(self, username: str, password: str) -> bool:
        """Login to GOBI backend"""
        try:
            logger.info(f"🔐 Logging in as {username}...")
            response = self.session.post(
                f"{self.gobi_url}/api/auth/login",
                json={"username": username, "password": password}
            )

            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("accessToken")
                self.session.headers.update({
                    "Authorization": f"Bearer {self.access_token}"
                })
                logger.info("✅ Login successful")
                return True
            else:
                logger.error(f"❌ Login failed: {response.text}")
                return False

        except Exception as e:
            logger.error(f"❌ Login error: {str(e)}")
            return False

    def deploy_agent(self) -> bool:
        """Deploy agent in GOBI backend (mark as ACTIVE)"""
        try:
            logger.info(f"🚀 Deploying agent {self.agent_id}...")
            response = self.session.post(
                f"{self.gobi_url}/api/agents/{self.agent_id}/deploy",
                json={"recordCalls": True, "transcribeRealtime": True}
            )

            if response.status_code == 200:
                data = response.json()
                agent = data.get('agent', {})
                logger.info(f"✅ Agent deployed: {agent.get('name', self.agent_name)}")
                logger.info(f"   Status: {agent.get('status')}")
                return True
            else:
                logger.error(f"❌ Deployment failed: {response.text}")
                return False

        except Exception as e:
            logger.error(f"❌ Deployment error: {str(e)}")
            return False

    def send_heartbeat(self) -> bool:
        """Send heartbeat to GOBI backend to indicate agent is running"""
        if not self.agent_id:
            return False

        try:
            uptime = (datetime.now() - self.start_time).total_seconds() if self.start_time else 0

            metrics = {
                "uptime_seconds": uptime,
                "total_calls": self.total_calls,
                "successful_calls": self.successful_calls,
                "success_rate": (self.successful_calls / self.total_calls * 100) if self.total_calls > 0 else 0,
                "timestamp": datetime.now().isoformat()
            }

            response = self.session.post(
                f"{self.gobi_url}/api/agents/{self.agent_id}/heartbeat",
                json={"status": "RUNNING", "metrics": metrics}
            )

            if response.status_code == 200:
                current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                logger.info(f"💓 [{current_time}] Heartbeat sent - Uptime: {int(uptime)}s, Calls: {self.total_calls}")
                return True
            else:
                logger.warning(f"⚠️  Heartbeat failed: {response.status_code}")
                return False

        except Exception as e:
            logger.warning(f"⚠️  Heartbeat error: {str(e)}")
            return False

    def heartbeat_loop(self):
        """Background thread for sending heartbeats"""
        while self.is_running:
            self.send_heartbeat()
            time.sleep(self.heartbeat_interval)

    def start(self) -> bool:
        """Start agent and heartbeat"""
        if self.is_running:
            logger.warning("⚠️  Agent already running")
            return False

        self.is_running = True
        self.start_time = datetime.now()

        # Start heartbeat thread
        self.heartbeat_thread = threading.Thread(target=self.heartbeat_loop, daemon=True)
        self.heartbeat_thread.start()

        logger.info(f"\\n✅ Agent '{self.agent_name}' (ID: {self.agent_id}) is now RUNNING")
        logger.info(f"   Heartbeat interval: {self.heartbeat_interval}s")
        logger.info(f"   Backend: {self.gobi_url}")
        logger.info("\\n📞 Agent is ready and will appear as ACTIVE in your GOBI UI")
        logger.info("   Press Ctrl+C to stop\\n")

        return True

    def stop(self):
        """Stop agent and cleanup"""
        if not self.is_running:
            return

        logger.info("\\n🛑 Stopping agent...")

        # Stop heartbeat
        self.is_running = False
        if self.heartbeat_thread:
            self.heartbeat_thread.join(timeout=2)

        # Send final heartbeat with STOPPED status
        if self.agent_id:
            try:
                self.session.post(
                    f"{self.gobi_url}/api/agents/{self.agent_id}/heartbeat",
                    json={"status": "STOPPED"}
                )
            except:
                pass

        # Calculate final stats
        if self.start_time:
            uptime = (datetime.now() - self.start_time).total_seconds()
            logger.info(f"\\n📊 Session Statistics:")
            logger.info(f"   Total uptime: {int(uptime)} seconds")
            logger.info(f"   Total calls: {self.total_calls}")
            logger.info(f"   Successful calls: {self.successful_calls}")
            if self.total_calls > 0:
                logger.info(f"   Success rate: {self.successful_calls / self.total_calls * 100:.1f}%")

        logger.info("✅ Agent stopped")

    def run_forever(self):
        """Keep agent running until interrupted"""
        try:
            while self.is_running:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("\\n")
            self.stop()


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='GOBI Local Agent - ${agent.name}',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Agent Configuration:
  Name:        ${agent.name}
  ID:          ${agent.id}
  Model:       ${agent.model}
  Voice:       ${agent.voice}
  Temperature: ${agent.temperature}

Example usage:
  python gobi_agent_${agent.id}.py --username admin --password admin123
  python gobi_agent_${agent.id}.py --username admin --password admin123 --heartbeat 60
        """
    )
    parser.add_argument('--gobi-url', default='http://localhost:3000',
                       help='GOBI backend URL (default: http://localhost:3000)')
    parser.add_argument('--username', required=True,
                       help='GOBI username for authentication')
    parser.add_argument('--password', required=True,
                       help='GOBI password for authentication')
    parser.add_argument('--heartbeat', type=int, default=30,
                       help='Heartbeat interval in seconds (default: 30)')

    args = parser.parse_args()

    logger.info("="*70)
    logger.info("🚀 GOBI Local Agent")
    logger.info("="*70)
    logger.info(f"Agent Name:  ${agent.name}")
    logger.info(f"Agent ID:    ${agent.id}")
    logger.info(f"Model:       ${agent.model}")
    logger.info(f"Voice:       ${agent.voice}")
    logger.info(f"Temperature: ${agent.temperature}")
    logger.info(f"Backend URL: {args.gobi_url}")
    logger.info("="*70 + "\\n")

    # Initialize GOBI agent
    agent = GOBILocalAgent(
        gobi_url=args.gobi_url,
        agent_id="${agent.id}"
    )
    agent.heartbeat_interval = args.heartbeat

    # Login to GOBI
    if not agent.login(args.username, args.password):
        logger.error("❌ Failed to login to GOBI. Exiting.")
        sys.exit(1)

    # Deploy agent (mark as ACTIVE in GOBI)
    if not agent.deploy_agent():
        logger.error("❌ Failed to deploy agent. Exiting.")
        sys.exit(1)

    # Start agent and heartbeat
    if agent.start():
        agent.run_forever()


if __name__ == "__main__":
    main()
`;

      setPreview({
        script: gobiIntegratedScript,
        filename: `gobi_agent_${agent.id}.py`,
        roomName: undefined
      });
      setIsLoading(false);
    }
  }, [isOpen, agent.id, agent.name, agent.model, agent.voice, agent.temperature, agent.prompt]);

  // Initialize edited script when preview loads
  useEffect(() => {
    if (preview?.script) {
      setEditedScript(preview.script);
      setHasChanges(false);
    }
  }, [preview?.script]);

  const handleCopyScript = async () => {
    const scriptToCopy = isEditing ? editedScript : (preview?.script || '');
    if (scriptToCopy) {
      await navigator.clipboard.writeText(scriptToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadScript = () => {
    const scriptToDownload = isEditing ? editedScript : (preview?.script || '');
    if (scriptToDownload && preview?.filename) {
      const blob = new Blob([scriptToDownload], { type: 'text/x-python' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = preview.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleDeploy = () => {
    onClose();
    onDeploy?.();
  };

  const handleScriptChange = (value: string) => {
    setEditedScript(value);
    setHasChanges(value !== preview?.script);
  };

  const handleSaveChanges = () => {
    // TODO: Save edited script back to agent
    setIsEditing(false);
    setHasChanges(false);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Split script into lines for better rendering
  const currentScript = isEditing ? editedScript : (preview?.script || '');
  const scriptLines = currentScript.split('\n');

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl w-full max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="flex-none px-6 py-3 border-b bg-white">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="h-5 w-5 text-blue-600" />
              <span>Python Agent Script Preview</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(!isEditing)}
                className="h-7 px-2"
              >
                {isEditing ? (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </>
                ) : (
                  <>
                    <Edit3 className="h-4 w-4 mr-1" />
                    Edit
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleTheme}
                className="h-7 w-7 p-0"
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <span className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">{preview?.filename}</span>
              {preview?.roomName && (
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">{preview?.roomName}</span>
              )}
            </div>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-4 text-xs mt-1">
            <span><strong>Agent:</strong> {agent.name}</span>
            <span className="text-gray-400">|</span>
            <span><strong>Model:</strong> {agent.model}</span>
            <span className="text-gray-400">|</span>
            <span><strong>Voice:</strong> {agent.voice}</span>
            <span className="text-gray-400">|</span>
            <span><strong>Temperature:</strong> {agent.temperature}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto min-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-red-500 text-center">
                <p className="font-semibold">Failed to generate script preview</p>
                <p className="text-sm mt-1">{error.message}</p>
              </div>
            </div>
          ) : currentScript ? (
            isEditing ? (
              // Editable mode
              <div className={`h-full flex ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                {/* Line numbers column */}
                <div className={`w-14 flex-shrink-0 overflow-y-auto ${
                  isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'
                }`}>
                  <div className="py-3 px-2">
                    {scriptLines.map((_, index) => (
                      <div key={index} className="text-xs font-mono text-right leading-5">
                        {index + 1}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Editable textarea */}
                <div className="flex-1 relative">
                  <textarea
                    value={editedScript}
                    onChange={(e) => handleScriptChange(e.target.value)}
                    className={`absolute inset-0 w-full h-full py-3 px-4 font-mono text-xs leading-5 resize-none focus:outline-none ${
                      isDarkMode 
                        ? 'bg-gray-900 text-gray-100 caret-white' 
                        : 'bg-white text-gray-900 caret-black'
                    }`}
                    style={{ lineHeight: '1.25rem' }}
                    spellCheck={false}
                  />
                </div>
              </div>
            ) : (
              // Read-only mode with theme support
              <div className={`flex ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                {/* Line numbers column */}
                <div className={`w-14 flex-shrink-0 ${
                  isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'
                }`}>
                  <div className="py-3 px-2">
                    {scriptLines.map((_, index) => (
                      <div key={index} className="text-xs font-mono text-right leading-5">
                        {index + 1}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Code content */}
                <div className="flex-1">
                  <div className="py-3 px-4">
                    {scriptLines.map((line, index) => (
                      <div
                        key={index}
                        className={`text-xs font-mono leading-5 ${
                          isDarkMode
                            ? 'text-gray-100 hover:bg-gray-800/30'
                            : 'text-gray-900 hover:bg-gray-100'
                        }`}
                        style={{ whiteSpace: 'pre' }}
                      >
                        {line || '\u00A0'}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          ) : null}
        </div>

        <div className="flex-none flex justify-between items-center px-6 py-3 border-t bg-gray-50">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyScript}
              disabled={!currentScript}
              className="flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy Script
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadScript}
              disabled={!currentScript}
              className="flex items-center gap-2"
            >
              <Download className="h-3 w-3" />
              Download
            </Button>
            {hasChanges && (
              <span className="text-xs text-amber-600 ml-2">
                • Unsaved changes
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {isEditing && hasChanges && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditedScript(preview?.script || '');
                  setHasChanges(false);
                }}
                className="text-gray-600"
              >
                Discard Changes
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleDeploy}
              size="sm"
              disabled={!currentScript}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Rocket className="h-3 w-3" />
              {hasChanges ? 'Deploy with Changes' : 'Deploy to LiveKit Cloud'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
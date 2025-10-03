#!/usr/bin/env python3
"""
GOBI Local Agent - Appointment Setter
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
        agent_id: str = "cmgb7nqgt000asb749d6d8bdy"
    ):
        self.gobi_url = gobi_url.rstrip('/')
        self.session = requests.Session()
        self.access_token: Optional[str] = None
        self.agent_id = agent_id
        self.agent_name = "Appointment Setter"
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
        logger.info("\n🛑 Shutdown signal received, stopping agent...")
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

        logger.info(f"\n✅ Agent '{self.agent_name}' (ID: {self.agent_id}) is now RUNNING")
        logger.info(f"   Heartbeat interval: {self.heartbeat_interval}s")
        logger.info(f"   Backend: {self.gobi_url}")
        logger.info("\n📞 Agent is ready and will appear as ACTIVE in your GOBI UI")
        logger.info("   Press Ctrl+C to stop\n")

        return True

    def stop(self):
        """Stop agent and cleanup"""
        if not self.is_running:
            return

        logger.info("\n🛑 Stopping agent...")

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
            logger.info(f"\n📊 Session Statistics:")
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
            logger.info("\n")
            self.stop()


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='GOBI Local Agent - Appointment Setter',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Agent Configuration:
  Name:        Appointment Setter
  ID:          cmgb7nqgt000asb749d6d8bdy
  Model:       gpt-4
  Voice:       nova
  Temperature: 0.7

Example usage:
  python test_agent.py --username admin --password admin123
  python test_agent.py --username admin --password admin123 --heartbeat 60
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
    logger.info(f"Agent Name:  Appointment Setter")
    logger.info(f"Agent ID:    cmgb7nqgt000asb749d6d8bdy")
    logger.info(f"Model:       gpt-4")
    logger.info(f"Voice:       nova")
    logger.info(f"Temperature: 0.7")
    logger.info(f"Backend URL: {args.gobi_url}")
    logger.info("="*70 + "\n")

    # Initialize GOBI agent
    agent = GOBILocalAgent(
        gobi_url=args.gobi_url,
        agent_id="cmgb7nqgt000asb749d6d8bdy"
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

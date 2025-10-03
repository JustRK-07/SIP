#!/usr/bin/env python3
"""
GOBI AI Agent Runtime
Connects to GOBI backend, deploys agent, and sends heartbeats to indicate running status
"""

import requests
import threading
import time
import json
import sys
import signal
from datetime import datetime
from typing import Optional, Dict

class GOBIAgent:
    def __init__(self, base_url: str = "http://localhost:3000"):
        """Initialize GOBI Agent Runtime

        Args:
            base_url: Base URL of GOBI backend API
        """
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.access_token: Optional[str] = None
        self.agent_id: Optional[str] = None
        self.agent_name: Optional[str] = None
        self.is_authenticated = False
        self.is_running = False
        self.heartbeat_interval = 30  # seconds
        self.heartbeat_thread: Optional[threading.Thread] = None

        # Metrics
        self.start_time = None
        self.total_calls = 0
        self.successful_calls = 0

        # Register signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully"""
        print("\n\n🛑 Shutdown signal received, stopping agent...")
        self.stop()
        sys.exit(0)

    def login(self, username: str, password: str) -> bool:
        """Login to GOBI backend and get JWT token

        Args:
            username: Username or email
            password: Password

        Returns:
            True if login successful, False otherwise
        """
        try:
            print(f"🔐 Logging in as {username}...")
            response = self.session.post(
                f"{self.base_url}/api/auth/login",
                json={"username": username, "password": password},
                headers={"Content-Type": "application/json"}
            )

            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("accessToken")
                self.session.headers.update({
                    "Authorization": f"Bearer {self.access_token}"
                })
                self.is_authenticated = True
                print(f"✅ Login successful")
                return True
            else:
                print(f"❌ Login failed: {response.text}")
                return False

        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            return False

    def get_agent(self, agent_id: str) -> Optional[Dict]:
        """Get agent details by ID

        Args:
            agent_id: Agent ID

        Returns:
            Agent data or None if not found
        """
        if not self.is_authenticated:
            print("❌ Must login first")
            return None

        try:
            response = self.session.get(
                f"{self.base_url}/api/agents/{agent_id}"
            )

            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                print(f"❌ Agent not found: {agent_id}")
                return None
            else:
                print(f"❌ Failed to get agent: {response.text}")
                return None

        except Exception as e:
            print(f"❌ Error getting agent: {str(e)}")
            return None

    def list_agents(self) -> Optional[list]:
        """List all available agents

        Returns:
            List of agents or None if error
        """
        if not self.is_authenticated:
            print("❌ Must login first")
            return None

        try:
            response = self.session.get(
                f"{self.base_url}/api/agents"
            )

            if response.status_code == 200:
                data = response.json()
                return data.get('agents', [])
            else:
                print(f"❌ Failed to list agents: {response.text}")
                return None

        except Exception as e:
            print(f"❌ Error listing agents: {str(e)}")
            return None

    def deploy_agent(self, agent_id: str) -> bool:
        """Deploy agent (mark as ACTIVE)

        Args:
            agent_id: Agent ID to deploy

        Returns:
            True if deployment successful, False otherwise
        """
        if not self.is_authenticated:
            print("❌ Must login first")
            return False

        try:
            print(f"🚀 Deploying agent {agent_id}...")
            response = self.session.post(
                f"{self.base_url}/api/agents/{agent_id}/deploy",
                json={
                    "recordCalls": True,
                    "transcribeRealtime": True
                }
            )

            if response.status_code == 200:
                data = response.json()
                agent = data.get('agent', {})
                self.agent_id = agent_id
                self.agent_name = agent.get('name', 'Unknown')
                print(f"✅ Agent deployed successfully: {self.agent_name}")
                print(f"   Status: {agent.get('status')}")
                return True
            else:
                print(f"❌ Deployment failed: {response.text}")
                return False

        except Exception as e:
            print(f"❌ Deployment error: {str(e)}")
            return False

    def send_heartbeat(self) -> bool:
        """Send heartbeat to backend to indicate agent is running

        Returns:
            True if heartbeat sent successfully, False otherwise
        """
        if not self.is_authenticated or not self.agent_id:
            return False

        try:
            # Calculate uptime
            uptime_seconds = (datetime.now() - self.start_time).total_seconds() if self.start_time else 0

            # Prepare metrics
            metrics = {
                "uptime_seconds": uptime_seconds,
                "total_calls": self.total_calls,
                "successful_calls": self.successful_calls,
                "success_rate": (self.successful_calls / self.total_calls * 100) if self.total_calls > 0 else 0,
                "timestamp": datetime.now().isoformat()
            }

            response = self.session.post(
                f"{self.base_url}/api/agents/{self.agent_id}/heartbeat",
                json={
                    "status": "RUNNING",
                    "metrics": metrics
                }
            )

            if response.status_code == 200:
                current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                print(f"💓 [{current_time}] Heartbeat sent - Uptime: {int(uptime_seconds)}s, Calls: {self.total_calls}")
                return True
            else:
                print(f"⚠️  Heartbeat failed: {response.status_code}")
                return False

        except Exception as e:
            print(f"⚠️  Heartbeat error: {str(e)}")
            return False

    def heartbeat_loop(self):
        """Continuously send heartbeats while agent is running"""
        while self.is_running:
            self.send_heartbeat()
            time.sleep(self.heartbeat_interval)

    def start(self) -> bool:
        """Start agent runtime and heartbeat

        Returns:
            True if started successfully, False otherwise
        """
        if not self.agent_id:
            print("❌ No agent deployed")
            return False

        if self.is_running:
            print("⚠️  Agent already running")
            return False

        # Start the agent
        self.is_running = True
        self.start_time = datetime.now()

        # Start heartbeat thread
        self.heartbeat_thread = threading.Thread(target=self.heartbeat_loop, daemon=True)
        self.heartbeat_thread.start()

        print(f"\n✅ Agent '{self.agent_name}' (ID: {self.agent_id}) is now RUNNING")
        print(f"   Heartbeat interval: {self.heartbeat_interval}s")
        print(f"   Backend: {self.base_url}")
        print("\n📞 Waiting for incoming calls...")
        print("   Press Ctrl+C to stop\n")

        return True

    def stop(self):
        """Stop agent and cleanup"""
        if not self.is_running:
            return

        print("\n🛑 Stopping agent...")

        # Stop heartbeat
        self.is_running = False
        if self.heartbeat_thread:
            self.heartbeat_thread.join(timeout=2)

        # Send final heartbeat with STOPPED status
        if self.agent_id:
            try:
                self.session.post(
                    f"{self.base_url}/api/agents/{self.agent_id}/heartbeat",
                    json={"status": "STOPPED"}
                )
            except:
                pass

        # Calculate final stats
        if self.start_time:
            uptime = (datetime.now() - self.start_time).total_seconds()
            print(f"\n📊 Session Statistics:")
            print(f"   Total uptime: {int(uptime)} seconds")
            print(f"   Total calls: {self.total_calls}")
            print(f"   Successful calls: {self.successful_calls}")
            if self.total_calls > 0:
                print(f"   Success rate: {self.successful_calls / self.total_calls * 100:.1f}%")

        print("✅ Agent stopped")

    def run_forever(self):
        """Keep agent running until interrupted"""
        try:
            while self.is_running:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n")
            self.stop()


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='GOBI AI Agent Runtime')
    parser.add_argument('--url', default='http://localhost:3000', help='GOBI backend URL')
    parser.add_argument('--username', required=True, help='Username or email')
    parser.add_argument('--password', required=True, help='Password')
    parser.add_argument('--agent-id', help='Agent ID to deploy (optional, will list if not provided)')
    parser.add_argument('--heartbeat', type=int, default=30, help='Heartbeat interval in seconds')

    args = parser.parse_args()

    # Create agent instance
    agent = GOBIAgent(base_url=args.url)
    agent.heartbeat_interval = args.heartbeat

    # Login
    if not agent.login(args.username, args.password):
        print("❌ Failed to login. Exiting.")
        sys.exit(1)

    # If no agent ID provided, list available agents
    if not args.agent_id:
        print("\n📋 Available Agents:")
        agents = agent.list_agents()
        if agents:
            for i, ag in enumerate(agents, 1):
                status_emoji = "🟢" if ag.get('status') == 'ACTIVE' else "⚪"
                print(f"   {i}. {status_emoji} {ag.get('name')} (ID: {ag.get('id')})")
                print(f"      Model: {ag.get('model')}, Voice: {ag.get('voice')}")
                print(f"      Status: {ag.get('status')}\n")

            # Ask user to select
            try:
                choice = int(input("Select agent number: "))
                if 1 <= choice <= len(agents):
                    args.agent_id = agents[choice - 1]['id']
                else:
                    print("❌ Invalid selection")
                    sys.exit(1)
            except (ValueError, KeyboardInterrupt):
                print("\n❌ Cancelled")
                sys.exit(1)
        else:
            print("❌ No agents found")
            sys.exit(1)

    # Deploy and start agent
    if agent.deploy_agent(args.agent_id):
        if agent.start():
            agent.run_forever()
    else:
        print("❌ Failed to deploy agent")
        sys.exit(1)


if __name__ == "__main__":
    main()

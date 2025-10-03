#!/usr/bin/env python3
"""
GOBI LiveKit Agent - Integrates LiveKit voice assistant with GOBI backend
"""

import asyncio
import logging
import os
import sys
import argparse
import threading
import time
from datetime import datetime
from typing import Optional
import requests

# LiveKit imports
try:
    from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
    from livekit.agents.voice_assistant import VoiceAssistant
    from livekit.plugins import openai, deepgram, silero
    LIVEKIT_AVAILABLE = True
except ImportError:
    LIVEKIT_AVAILABLE = False
    print("⚠️  LiveKit packages not installed. Install with:")
    print("   pip install livekit livekit-agents livekit-plugins-openai livekit-plugins-deepgram livekit-plugins-silero")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class GOBILiveKitAgent:
    """LiveKit agent with GOBI backend integration"""

    def __init__(
        self,
        gobi_url: str = "http://localhost:3000",
        agent_id: Optional[str] = None,
        agent_config: Optional[dict] = None
    ):
        self.gobi_url = gobi_url.rstrip('/')
        self.session = requests.Session()
        self.access_token: Optional[str] = None
        self.agent_id = agent_id
        self.agent_config = agent_config or {}
        self.is_running = False
        self.heartbeat_interval = 30
        self.heartbeat_thread: Optional[threading.Thread] = None
        self.start_time = None
        self.total_calls = 0
        self.successful_calls = 0

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

    def get_agent_config(self, agent_id: str) -> Optional[dict]:
        """Get agent configuration from GOBI backend"""
        try:
            response = self.session.get(
                f"{self.gobi_url}/api/agents/{agent_id}"
            )

            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"❌ Failed to get agent config: {response.text}")
                return None

        except Exception as e:
            logger.error(f"❌ Error getting agent config: {str(e)}")
            return None

    def deploy_agent(self, agent_id: str) -> bool:
        """Deploy agent in GOBI backend"""
        try:
            logger.info(f"🚀 Deploying agent {agent_id}...")
            response = self.session.post(
                f"{self.gobi_url}/api/agents/{agent_id}/deploy",
                json={"recordCalls": True, "transcribeRealtime": True}
            )

            if response.status_code == 200:
                data = response.json()
                agent = data.get('agent', {})
                self.agent_id = agent_id
                self.agent_config = agent
                logger.info(f"✅ Agent deployed: {agent.get('name')}")
                return True
            else:
                logger.error(f"❌ Deployment failed: {response.text}")
                return False

        except Exception as e:
            logger.error(f"❌ Deployment error: {str(e)}")
            return False

    def send_heartbeat(self) -> bool:
        """Send heartbeat to GOBI backend"""
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
                logger.info(f"💓 Heartbeat sent - Uptime: {int(uptime)}s, Calls: {self.total_calls}")
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

    def start_heartbeat(self):
        """Start heartbeat thread"""
        self.is_running = True
        self.start_time = datetime.now()
        self.heartbeat_thread = threading.Thread(target=self.heartbeat_loop, daemon=True)
        self.heartbeat_thread.start()
        logger.info(f"✅ Heartbeat started (interval: {self.heartbeat_interval}s)")

    def stop_heartbeat(self):
        """Stop heartbeat thread"""
        self.is_running = False
        if self.heartbeat_thread:
            self.heartbeat_thread.join(timeout=2)

        # Send final STOPPED heartbeat
        try:
            self.session.post(
                f"{self.gobi_url}/api/agents/{self.agent_id}/heartbeat",
                json={"status": "STOPPED"}
            )
        except:
            pass

        logger.info("✅ Heartbeat stopped")


# Global agent instance for LiveKit callbacks
gobi_agent = None


async def entrypoint(ctx: JobContext):
    """LiveKit agent entrypoint - called for each room connection"""
    global gobi_agent

    if not gobi_agent or not gobi_agent.agent_config:
        logger.error("❌ GOBI agent not initialized")
        return

    config = gobi_agent.agent_config

    # Increment call counter
    gobi_agent.total_calls += 1

    logger.info(f"📞 New call received - Total calls: {gobi_agent.total_calls}")

    # Create initial chat context from agent prompt
    initial_ctx = llm.ChatContext().append(
        role="system",
        text=config.get('prompt', 'You are a helpful AI assistant.')
    )

    # Create voice assistant with agent configuration
    assistant = VoiceAssistant(
        chat_ctx=initial_ctx,
        llm=openai.LLM(
            model=config.get('model', 'gpt-4'),
            temperature=config.get('temperature', 0.7)
        ),
        stt=deepgram.STT(),
        tts=openai.TTS(voice=config.get('voice', 'nova')),
        will_synthesize_assistant_reply=silero.VAD.load(),
    )

    # Connect to room
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Start the assistant
    assistant.start(ctx.room)

    logger.info(f"✅ Voice assistant started in room: {ctx.room.name}")

    # Mark call as successful when it completes
    @ctx.room.on("disconnected")
    def on_disconnect():
        gobi_agent.successful_calls += 1
        logger.info(f"✅ Call completed - Success rate: {gobi_agent.successful_calls}/{gobi_agent.total_calls}")


def main():
    """Main entry point"""
    global gobi_agent

    parser = argparse.ArgumentParser(description='GOBI LiveKit Agent')
    parser.add_argument('--gobi-url', default='http://localhost:3000', help='GOBI backend URL')
    parser.add_argument('--username', required=True, help='GOBI username')
    parser.add_argument('--password', required=True, help='GOBI password')
    parser.add_argument('--agent-id', required=True, help='Agent ID to deploy')
    parser.add_argument('--heartbeat', type=int, default=30, help='Heartbeat interval (seconds)')

    args = parser.parse_args()

    # Check if LiveKit is available
    if not LIVEKIT_AVAILABLE:
        logger.error("❌ LiveKit packages not installed. Cannot start agent.")
        sys.exit(1)

    # Check required environment variables
    required_env = ['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'OPENAI_API_KEY', 'DEEPGRAM_API_KEY']
    missing_env = [e for e in required_env if not os.getenv(e)]

    if missing_env:
        logger.error(f"❌ Missing required environment variables: {', '.join(missing_env)}")
        logger.error("\nSet them in your environment or .env file:")
        logger.error("  export LIVEKIT_URL=wss://your-livekit-server.com")
        logger.error("  export LIVEKIT_API_KEY=your-api-key")
        logger.error("  export LIVEKIT_API_SECRET=your-api-secret")
        logger.error("  export OPENAI_API_KEY=sk-...")
        logger.error("  export DEEPGRAM_API_KEY=...")
        sys.exit(1)

    # Initialize GOBI agent
    gobi_agent = GOBILiveKitAgent(
        gobi_url=args.gobi_url,
        agent_id=args.agent_id
    )
    gobi_agent.heartbeat_interval = args.heartbeat

    # Login to GOBI
    if not gobi_agent.login(args.username, args.password):
        logger.error("❌ Failed to login to GOBI")
        sys.exit(1)

    # Get agent configuration
    config = gobi_agent.get_agent_config(args.agent_id)
    if not config:
        logger.error("❌ Failed to get agent configuration")
        sys.exit(1)

    gobi_agent.agent_config = config
    logger.info(f"✅ Loaded agent config: {config.get('name')}")
    logger.info(f"   Model: {config.get('model')}, Voice: {config.get('voice')}, Temp: {config.get('temperature')}")

    # Deploy agent
    if not gobi_agent.deploy_agent(args.agent_id):
        logger.error("❌ Failed to deploy agent")
        sys.exit(1)

    # Start heartbeat
    gobi_agent.start_heartbeat()

    logger.info("\n" + "="*60)
    logger.info(f"🚀 GOBI LiveKit Agent Running")
    logger.info(f"   Agent: {config.get('name')} (ID: {args.agent_id})")
    logger.info(f"   GOBI Backend: {args.gobi_url}")
    logger.info(f"   LiveKit Server: {os.getenv('LIVEKIT_URL')}")
    logger.info(f"   Heartbeat: Every {args.heartbeat}s")
    logger.info("="*60 + "\n")

    try:
        # Run LiveKit agent (this blocks)
        cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
    except KeyboardInterrupt:
        logger.info("\n🛑 Shutting down...")
    finally:
        gobi_agent.stop_heartbeat()
        logger.info("✅ Agent stopped")


if __name__ == "__main__":
    main()

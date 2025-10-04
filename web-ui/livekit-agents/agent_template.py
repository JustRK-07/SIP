#!/usr/bin/env python3
"""
LiveKit Cloud Agent Template
Generated for: {agent_name}
Room: {room_name}
Model: {model}
Voice: {voice}
"""

import asyncio
import logging
import os
from typing import Annotated
from pathlib import Path

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent / '.env'
    load_dotenv(dotenv_path=env_path)
    print(f"✅ Loaded environment from: {env_path}")
except ImportError:
    print("⚠️  python-dotenv not installed, using system environment variables only")
except Exception as e:
    print(f"⚠️  Could not load .env file: {e}")

from livekit import rtc
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    llm,
    stt,
    tts,
)
from livekit.agents.voice import Agent
from livekit.plugins import openai, silero

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("voice-assistant")

# Import heartbeat client
try:
    from heartbeat_client import init_heartbeat, start_heartbeat, stop_heartbeat
    HEARTBEAT_AVAILABLE = True
except ImportError:
    HEARTBEAT_AVAILABLE = False
    logger.warning("Heartbeat client not available. Local agent will not register with web UI.")


async def prewarm_process(proc):
    """
    Prewarm function called when worker connects to LiveKit Cloud
    Used to load models and verify dependencies before accepting jobs
    """
    logger.info("🔥 Prewarming worker process...")
    logger.info("   Loading AI models and dependencies...")

    # Prewarm VAD model (loads Silero model into memory)
    try:
        vad = silero.VAD.load()
        logger.info("   ✅ VAD model loaded")
    except Exception as e:
        logger.warning(f"   ⚠️  VAD prewarm failed: {e}")

    logger.info("🎯 Worker is ready to accept jobs!")


async def entrypoint(ctx: JobContext):
    """
    LiveKit agent entrypoint - called for each room connection
    This is invoked by LiveKit when a job is dispatched to this worker
    """
    # Log job acceptance
    logger.info(f"📋 Job received from LiveKit Cloud")
    logger.info(f"   Room: {ctx.room.name if ctx.room else 'N/A'}")
    logger.info(f"   Job ID: {ctx.job.id}")
    logger.info(f"   Agent: {agent_name}")

    # Initialize heartbeat client for local agent registration
    if HEARTBEAT_AVAILABLE:
        try:
            init_heartbeat(
                agent_id="{agent_id}",
                agent_name="{agent_name}",
                web_ui_url=os.getenv("WEB_UI_URL", "http://localhost:3026"),
                description="{agent_description}",
                model="{model}",
                voice="{voice}",
                temperature={temperature},
                prompt="{system_prompt}",
                port=os.getenv("AGENT_PORT"),
                host=os.getenv("AGENT_HOST", "localhost")
            )
            await start_heartbeat()
            logger.info("Heartbeat client started - agent will be visible in web UI")
        except Exception as e:
            logger.error(f"Failed to start heartbeat client: {e}")

    initial_ctx = llm.ChatContext().append(
        role="system",
        text="{system_prompt}"
    )

    logger.info(f"🔌 Connecting to LiveKit room...")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Wait for participant to connect
    participant = await ctx.wait_for_participant()
    logger.info(f"Participant joined: {participant.identity}")

    # Configure the agent with specified settings
    agent = Agent(
        vad=silero.VAD.load(),
        stt=openai.STT(model="whisper-1"),
        llm=openai.LLM(
            model="{model}",
            temperature={temperature},
        ),
        tts=openai.TTS(
            model="tts-1",
            voice="{voice}",
        ),
        chat_ctx=initial_ctx,
    )

    # Start the agent for this participant
    agent.start(ctx.room, participant)

    logger.info(f"✅ Voice assistant active in room: {ctx.room.name}")
    logger.info(f"   Waiting for caller audio...")

    # Handle agent speaking events
    @agent.on("agent_speaking")
    def on_agent_speaking():
        logger.info("Agent started speaking")

    @agent.on("agent_stopped_speaking")
    def on_agent_stopped_speaking():
        logger.info("Agent stopped speaking")

    @agent.on("user_speaking")
    def on_user_speaking():
        logger.info("User started speaking")

    @agent.on("user_stopped_speaking")
    def on_user_stopped_speaking():
        logger.info("User stopped speaking")

    # Keep running until room closes
    try:
        await asyncio.sleep(float("inf"))
    except KeyboardInterrupt:
        logger.info("Agent shutting down...")
    finally:
        # Stop heartbeat client on shutdown
        if HEARTBEAT_AVAILABLE:
            try:
                await stop_heartbeat()
            except Exception as e:
                logger.error(f"Error stopping heartbeat client: {e}")


if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info(f"🚀 LiveKit Agent Worker Starting")
    logger.info(f"   Agent: {agent_name}")
    logger.info(f"   Model: {model}")
    logger.info(f"   Voice: {voice}")
    logger.info(f"   Temperature: {temperature}")
    logger.info("=" * 60)
    logger.info(f"📡 Registering worker with LiveKit Cloud...")
    logger.info(f"   URL: {os.getenv('LIVEKIT_WS_URL', 'wss://firstproject-ly6tfhj5.livekit.cloud')}")
    logger.info(f"   Waiting for dispatch from LiveKit...")
    logger.info("=" * 60 + "\\n")

    # Configure worker options with metadata
    worker_opts = WorkerOptions(
        entrypoint_fnc=entrypoint,
        prewarm_fnc=prewarm_process,
        # Worker metadata helps with debugging and monitoring
        worker_type="gobi-voice-agent",
        api_key=os.getenv("LIVEKIT_API_KEY"),
        api_secret=os.getenv("LIVEKIT_API_SECRET"),
        ws_url=os.getenv("LIVEKIT_WS_URL", "wss://firstproject-ly6tfhj5.livekit.cloud"),
    )

    logger.info("✅ Worker configured successfully")
    logger.info("🔗 Connecting to LiveKit Cloud...\\n")

    # Run LiveKit agent (this blocks and waits for jobs)
    # This call will:
    # 1. Connect to LiveKit Cloud using LIVEKIT_WS_URL, API_KEY, API_SECRET
    # 2. Call prewarm_process() to load models
    # 3. Register as available worker
    # 4. Wait for job dispatch based on dispatch rules
    # 5. Call entrypoint() for each job received
    cli.run_app(worker_opts)
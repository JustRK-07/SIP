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

logger = logging.getLogger("voice-assistant")

# Import heartbeat client
try:
    from heartbeat_client import init_heartbeat, start_heartbeat, stop_heartbeat
    HEARTBEAT_AVAILABLE = True
except ImportError:
    HEARTBEAT_AVAILABLE = False
    logger.warning("Heartbeat client not available. Local agent will not register with web UI.")


async def entrypoint(ctx: JobContext):
    """Main entrypoint for the agent"""
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

    logger.info(f"Agent {agent_name} connecting to room {ctx.room.name}")
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
    # Run the agent worker
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=None,
            api_key=os.getenv("LIVEKIT_API_KEY"),
            api_secret=os.getenv("LIVEKIT_API_SECRET"),
            ws_url=os.getenv("LIVEKIT_WS_URL", "wss://firstproject-ly6tfhj5.livekit.cloud"),
        ),
    )
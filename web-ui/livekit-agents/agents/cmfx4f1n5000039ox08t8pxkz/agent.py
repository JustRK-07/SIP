#!/usr/bin/env python3
"""
LiveKit Cloud Agent Template
Generated for: Appointment Setter
Room: room-cmfx4f1n5000039ox08t8pxkz
Model: gpt-3.5-turbo
Voice: shimmer
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


async def entrypoint(ctx: JobContext):
    """Main entrypoint for the agent"""
    initial_ctx = llm.ChatContext().append(
        role="system",
        text="You are an appointment setting agent. Be professional and efficient. Focus on scheduling meetings with qualified prospects. Handle objections gracefully and confirm details clearly."
    )

    logger.info(f"Agent Appointment Setter connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Wait for participant to connect
    participant = await ctx.wait_for_participant()
    logger.info(f"Participant joined: {participant.identity}")

    # Configure the assistant with specified settings
    agent = Agent(
        vad=silero.VAD.load(),
        stt=openai.STT(model="whisper-1"),
        llm=openai.LLM(
            model="gpt-3.5-turbo",
            temperature=0.8,
        ),
        tts=openai.TTS(
            model="tts-1",
            voice="shimmer",
        ),
        chat_ctx=initial_ctx,
    )

    # Start the assistant for this participant
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
    await asyncio.sleep(float("inf"))


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
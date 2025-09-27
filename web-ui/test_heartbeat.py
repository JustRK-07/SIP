#!/usr/bin/env python3
"""
Test script to demonstrate the heartbeat system
"""

import asyncio
import logging
import sys
import os

# Add the livekit-agents directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'livekit-agents'))

from heartbeat_client import HeartbeatClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test-heartbeat")

async def test_heartbeat():
    """Test the heartbeat client"""
    
    # Create a test agent
    client = HeartbeatClient(
        agent_id="test-agent-123",
        agent_name="Test Heartbeat Agent",
        web_ui_url="http://localhost:3026",
        heartbeat_interval=5  # Send heartbeat every 5 seconds
    )
    
    # Set agent configuration
    client.set_agent_config(
        description="This is a test agent for demonstrating the heartbeat system",
        model="gpt-4",
        voice="nova",
        temperature=0.7,
        prompt="You are a helpful test agent",
        port=8080,
        host="localhost"
    )
    
    try:
        # Start the heartbeat client
        await client.start()
        logger.info("Heartbeat client started. Check the web UI at http://localhost:3026/agents")
        logger.info("The agent should appear in the 'Deployed Agents' section")
        logger.info("Press Ctrl+C to stop...")
        
        # Keep running until interrupted
        while True:
            await asyncio.sleep(1)
            
    except KeyboardInterrupt:
        logger.info("Stopping heartbeat client...")
    finally:
        await client.stop()
        logger.info("Heartbeat client stopped")

if __name__ == "__main__":
    asyncio.run(test_heartbeat())


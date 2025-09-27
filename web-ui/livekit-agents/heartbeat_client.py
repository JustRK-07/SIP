#!/usr/bin/env python3
"""
Heartbeat client for local agents to register with the web UI
"""

import asyncio
import json
import logging
import os
import sys
from typing import Optional
import aiohttp
import signal

logger = logging.getLogger("heartbeat-client")

class HeartbeatClient:
    def __init__(self, 
                 agent_id: str,
                 agent_name: str,
                 web_ui_url: str = "http://localhost:3026",
                 heartbeat_interval: int = 10):
        self.agent_id = agent_id
        self.agent_name = agent_name
        self.web_ui_url = web_ui_url.rstrip('/')
        self.heartbeat_interval = heartbeat_interval
        self.session: Optional[aiohttp.ClientSession] = None
        self.heartbeat_task: Optional[asyncio.Task] = None
        self.running = False
        
        # Agent configuration (will be set by the agent)
        self.agent_config = {
            "description": "",
            "model": "gpt-3.5-turbo",
            "voice": "nova",
            "temperature": 0.7,
            "prompt": "",
            "processId": str(os.getpid()),
            "port": None,
            "host": "localhost"
        }
    
    def set_agent_config(self, **kwargs):
        """Set agent configuration for heartbeat"""
        self.agent_config.update(kwargs)
    
    async def start(self):
        """Start the heartbeat client"""
        if self.running:
            return
            
        self.running = True
        self.session = aiohttp.ClientSession()
        
        # Register signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        # Start heartbeat task
        self.heartbeat_task = asyncio.create_task(self._heartbeat_loop())
        
        logger.info(f"Heartbeat client started for agent {self.agent_name} ({self.agent_id})")
    
    async def stop(self):
        """Stop the heartbeat client"""
        if not self.running:
            return
            
        self.running = False
        
        # Cancel heartbeat task
        if self.heartbeat_task:
            self.heartbeat_task.cancel()
            try:
                await self.heartbeat_task
            except asyncio.CancelledError:
                pass
        
        # Send final unregister request
        await self._unregister()
        
        # Close session
        if self.session:
            await self.session.close()
        
        logger.info(f"Heartbeat client stopped for agent {self.agent_name}")
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        logger.info(f"Received signal {signum}, shutting down heartbeat client...")
        # Create a new event loop if one doesn't exist
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(self.stop())
            else:
                loop.run_until_complete(self.stop())
        except RuntimeError:
            # No event loop running, create a new one
            asyncio.run(self.stop())
    
    async def _heartbeat_loop(self):
        """Main heartbeat loop"""
        while self.running:
            try:
                await self._send_heartbeat()
                await asyncio.sleep(self.heartbeat_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in heartbeat loop: {e}")
                await asyncio.sleep(self.heartbeat_interval)
    
    async def _send_heartbeat(self):
        """Send heartbeat to web UI"""
        if not self.session:
            return
            
        try:
            payload = {
                "agentId": self.agent_id,
                "name": self.agent_name,
                **self.agent_config
            }
            
            url = f"{self.web_ui_url}/api/local-agents/heartbeat"
            
            async with self.session.post(
                url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=aiohttp.ClientTimeout(total=5)
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    if result.get("success"):
                        logger.debug(f"Heartbeat sent successfully for {self.agent_name}")
                    else:
                        logger.warning(f"Heartbeat failed: {result}")
                else:
                    logger.warning(f"Heartbeat failed with status {response.status}")
                    
        except asyncio.TimeoutError:
            logger.warning("Heartbeat request timed out")
        except Exception as e:
            logger.error(f"Error sending heartbeat: {e}")
    
    async def _unregister(self):
        """Unregister agent from web UI"""
        if not self.session:
            return
            
        try:
            url = f"{self.web_ui_url}/api/local-agents/remove"
            payload = {"agentId": self.agent_id}
            
            async with self.session.post(
                url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=aiohttp.ClientTimeout(total=5)
            ) as response:
                if response.status == 200:
                    logger.info(f"Successfully unregistered agent {self.agent_name}")
                else:
                    logger.warning(f"Failed to unregister agent: {response.status}")
                    
        except Exception as e:
            logger.error(f"Error unregistering agent: {e}")

# Global heartbeat client instance
_heartbeat_client: Optional[HeartbeatClient] = None

def init_heartbeat(agent_id: str, agent_name: str, web_ui_url: str = "http://localhost:3026", **config):
    """Initialize heartbeat client"""
    global _heartbeat_client
    _heartbeat_client = HeartbeatClient(agent_id, agent_name, web_ui_url)
    _heartbeat_client.set_agent_config(**config)
    return _heartbeat_client

async def start_heartbeat():
    """Start heartbeat client"""
    global _heartbeat_client
    if _heartbeat_client:
        await _heartbeat_client.start()

async def stop_heartbeat():
    """Stop heartbeat client"""
    global _heartbeat_client
    if _heartbeat_client:
        await _heartbeat_client.stop()

def get_heartbeat_client() -> Optional[HeartbeatClient]:
    """Get the current heartbeat client instance"""
    return _heartbeat_client

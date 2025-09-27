
from dotenv import load_dotenv
import aiohttp
import logging
import json
import os
from typing import Any, Dict
from datetime import datetime

from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions, function_tool, RunContext
from livekit.plugins import openai

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agent-cmfuzdlac0001sbmzb71u39j6")

# Agent Configuration
AGENT_ID = "cmfuzdlac0001sbmzb71u39j6"
AGENT_NAME = "sales agenttt"
AGENT_PROMPT = """agent ask users about their domain of work and pitches the laptop to the user"""
MODEL = "gpt-4"
VOICE = "nova"
TEMPERATURE = 0.7
MAX_TOKENS = 1000

# Get API URL from environment variable
API_URL = os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:3025")

class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions=AGENT_PROMPT
        )
        self.conversation_data = {}
        self.agent_id = AGENT_ID
        self.agent_name = AGENT_NAME
        self.ctx = None  # Will be set by entrypoint

    @function_tool()
    async def save_conversation_data(
        self,
        context: RunContext,
        key: str,
        value: str,
    ) -> str:
        """Save important data from the conversation."""
        self.conversation_data[key] = value
        logger.info(f"Agent {self.agent_name} - Saved conversation data - {key}: {value}")
        return f"Saved {key}: {value}"

    @function_tool()
    async def book_slot(
        self,
        context: RunContext,
        name: str,
        place: str,
        date: str,
    ) -> str:
        """Book a slot for the user's vacation visit."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{API_URL}/api/book-slot",
                    json={
                        "name": name,
                        "place": place,
                        "date": date,
                        "agentId": self.agent_id,
                    },
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        logger.info(f"Agent {self.agent_name} - Booking successful: {result}")
                        return f"Booking confirmed! Your slot for {place} on {date} has been booked successfully."
                    else:
                        logger.error(f"Agent {self.agent_name} - Booking failed: {response.status}")
                        return "Sorry, there was an issue with booking your slot. Please try again."
        except Exception as e:
            logger.error(f"Agent {self.agent_name} - Booking error: {e}")
            return "Sorry, there was an issue with booking your slot. Please try again."

    async def on_data_received(self, data: bytes, participant, kind):
        """Handle incoming data messages (chat)."""
        try:
            logger.info(f"Agent {self.agent_name} - Raw data received: {data}")
            message = json.loads(data.decode('utf-8'))
            logger.info(f"Agent {self.agent_name} - Parsed message: {message}")
            
            if message.get('type') == 'chat' and message.get('text'):
                user_message = message['text']
                logger.info(f"Agent {self.agent_name} - Received chat message: {user_message}")
                
                # Process the message and generate response
                response = await self.process_chat_message(user_message)
                logger.info(f"Agent {self.agent_name} - Generated response: {response}")
                
                # Send response back
                response_data = {
                    'type': 'chat',
                    'text': response,
                    'timestamp': datetime.now().isoformat()
                }
                
                # Send response to the participant
                await self.ctx.room.local_participant.publish_data(
                    json.dumps(response_data).encode('utf-8'),
                    kind=kind
                )
                
                logger.info(f"Agent {self.agent_name} - Sent chat response: {response}")
            else:
                logger.info(f"Agent {self.agent_name} - Message not a chat message: {message}")
        except Exception as e:
            logger.error(f"Agent {self.agent_name} - Error processing chat message: {e}", exc_info=True)

    async def process_chat_message(self, message: str) -> str:
        """Process chat message and generate response."""
        # Enhanced response logic for better chat experience
        message_lower = message.lower()
        
        if any(greeting in message_lower for greeting in ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"]):
            return f"Hello! I'm {self.agent_name}, your AI assistant. I'm currently running in chat mode. How can I help you today?"
        elif "help" in message_lower:
            return "I can help you with various tasks including: Answering questions, Providing information, Booking appointments, General assistance. What would you like to know?"
        elif any(word in message_lower for word in ["book", "appointment", "schedule", "reserve"]):
            return "I can help you book appointments! Please provide: Your name, The place you'd like to visit, Your preferred date and time. What would you like to book?"
        elif "status" in message_lower or "how are you" in message_lower:
            return f"I'm {self.agent_name} and I'm running perfectly! I'm connected to LiveKit and ready to assist you. What can I do for you?"
        elif "test" in message_lower:
            return "Test successful! I'm responding to your messages in real-time. The chat system is working properly."
        elif "time" in message_lower:
            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            return f"The current time is {current_time}. How else can I assist you?"
        else:
            return f"Thank you for your message: '{message}'. I'm {self.agent_name} and I'm here to help! I can assist with questions, bookings, or general information. What would you like to know?"


async def entrypoint(ctx: agents.JobContext):
    try:
        # Connect to the room
        await ctx.connect()
        logger.info(f"Agent {AGENT_NAME} connected to room: {ctx.room.name if ctx.room else 'Unknown'}")

        # Initialize the agent
        assistant = Assistant()
        assistant.ctx = ctx  # Set context for data handling

        # Set up data event listener for chat messages
        def handle_data_received(data, participant, kind):
            import asyncio
            logger.info(f"Agent {AGENT_NAME} - Data received event triggered")
            asyncio.create_task(assistant.on_data_received(data, participant, kind))
        
        ctx.room.on("dataReceived", handle_data_received)
        logger.info(f"Agent {AGENT_NAME} - Data event listener registered")

        # Initialize agent session (only if OpenAI API key is available)
        try:
            session = AgentSession(
                llm=openai.realtime.RealtimeModel(),
            )
            logger.info(f"Agent {AGENT_NAME} - OpenAI realtime model initialized")
            
            # Start the agent session with OpenAI
            await session.start(ctx.room, assistant)
            logger.info(f"Agent {AGENT_NAME} session started successfully with OpenAI")
        except Exception as e:
            logger.warning(f"Agent {AGENT_NAME} - OpenAI not available: {e}")
            logger.info(f"Agent {AGENT_NAME} running in chat-only mode (no OpenAI)")
            
            # Keep the agent running for chat-only mode
            import asyncio
            while True:
                await asyncio.sleep(1)

    except Exception as e:
        logger.error(f"Error in agent {AGENT_NAME}: {e}", exc_info=True)
        raise

if __name__ == "__main__":
    import random
    # Use a random port to avoid conflicts
    port = random.randint(8083, 8999)
    agents.cli.run_app(agents.WorkerOptions(
        entrypoint_fnc=entrypoint,
        port=port
    ))

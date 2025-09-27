# 🤖 Local Agent Heartbeat System

## Overview

The heartbeat system allows locally running AI agents to register themselves with the web UI and appear in the "Deployed Agents" section. This enables you to:

- **Monitor local agents** running on your machine
- **See real-time status** of locally deployed agents
- **Track agent details** like PID, host, model, voice, etc.
- **Automatic cleanup** of offline agents

## 🚀 How It Works

### 1. Agent Registration
When you run a locally created agent, it automatically:
- Sends heartbeat signals every 10 seconds to the web UI
- Registers itself with agent details (name, model, voice, etc.)
- Updates its status in the database

### 2. Web UI Integration
The web UI:
- Displays local agents alongside cloud-deployed agents
- Shows real-time status (RUNNING/OFFLINE)
- Automatically removes agents if no heartbeat for 10 seconds
- Fast cleanup every 5 seconds for immediate response

### 3. Automatic Cleanup
- Agents that stop sending heartbeats are automatically removed after 10 seconds
- Cleanup runs every 5 seconds for fast response
- Graceful shutdown unregisters the agent immediately

## 📁 Files Added/Modified

### New Files:
- `src/server/api/routers/localAgents.ts` - API endpoints for heartbeat
- `livekit-agents/heartbeat_client.py` - Python heartbeat client
- `test_heartbeat.py` - Test script to demonstrate the system

### Modified Files:
- `prisma/schema.prisma` - Added LocalAgent model
- `src/server/api/root.ts` - Added localAgents router
- `src/server/api/routers/agents.ts` - Added getDeployed endpoint
- `src/pages/agents.tsx` - Updated to show local agents
- `livekit-agents/agent_template.py` - Added heartbeat integration
- `src/lib/livekit-python.ts` - Added new template variables

## 🛠️ Usage

### 1. Create an Agent via Web UI
1. Go to the AI Agent section
2. Create a new agent with your desired configuration
3. Copy the generated Python script
4. Save it as a `.py` file on your local machine

### 2. Run the Agent Locally
```bash
# Install required dependencies
pip install livekit livekit-agents livekit-plugins-openai livekit-plugins-silero python-dotenv pydantic aiohttp

# Run the agent
python your_agent.py dev
```

### 3. Monitor in Web UI
1. Go to the Agents page
2. Check the "Deployed Agents" section
3. Your local agent should appear with:
   - ✅ Green status indicator
   - 🖥️ "Local" deployment mode badge
   - 📊 Agent details (model, voice, PID, host)
   - ⏱️ Real-time heartbeat status

## 🧪 Testing the System

### Test with the Demo Script
```bash
# Run the test heartbeat client
python test_heartbeat.py
```

This will:
- Create a test agent that sends heartbeats
- Show up in the web UI as a local agent
- Demonstrate the heartbeat functionality

### Test with a Real Agent
1. Create an agent via the web UI
2. Copy the generated script
3. Run it locally
4. Check the web UI to see it appear

## 🔧 Configuration

### Environment Variables
You can configure the heartbeat system with these environment variables:

```bash
# Web UI URL (default: http://localhost:3026)
export WEB_UI_URL="http://localhost:3026"

# Agent host (default: localhost)
export AGENT_HOST="localhost"

# Agent port (optional)
export AGENT_PORT="8080"
```

### Heartbeat Settings
The heartbeat client sends signals every 10 seconds by default. You can modify this in the agent template or heartbeat client.

## 📊 Database Schema

### LocalAgent Model
```prisma
model LocalAgent {
  id              String   @id @default(cuid())
  agentId         String   @unique
  name            String
  description     String?
  model           String
  voice           String
  temperature     Float
  prompt          String
  status          String   @default("RUNNING")
  lastHeartbeat   DateTime @default(now())
  processId       String?
  port            Int?
  host            String   @default("localhost")
  deploymentMode  String   @default("local")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([agentId])
  @@index([lastHeartbeat])
  @@index([status])
}
```

## 🔄 API Endpoints

### Heartbeat Registration
```
POST /api/trpc/localAgents.heartbeat
```

### Get All Local Agents
```
GET /api/trpc/localAgents.getAll
```

### Remove Local Agent
```
POST /api/trpc/localAgents.remove
```

### Cleanup Offline Agents
```
POST /api/trpc/localAgents.cleanup
```

## 🎯 Benefits

1. **Unified Monitoring**: See both cloud and local agents in one place
2. **Ultra-Fast Response**: Agents removed within 10 seconds of stopping
3. **Real-time Status**: Know immediately if a local agent stops working
4. **Easy Management**: No need to manually track running agents
5. **Automatic Cleanup**: Offline agents are automatically removed in 10 seconds
6. **Detailed Information**: See PID, host, model, and other agent details

## 🚨 Troubleshooting

### Agent Not Appearing in Web UI
1. Check if the web UI is running on the correct port (default: 3026)
2. Verify the heartbeat client is sending requests
3. Check browser console for any errors
4. Ensure the database migration was applied

### Heartbeat Errors
1. Check network connectivity to the web UI
2. Verify the web UI URL is correct
3. Check if the web UI API is responding
4. Look at the agent logs for error messages

### Database Issues
1. Run `pnpm db:push` to apply schema changes
2. Check if the LocalAgent table exists
3. Verify database permissions

## 🔮 Future Enhancements

- **Agent Health Metrics**: CPU, memory usage
- **Log Streaming**: Real-time logs from local agents
- **Remote Control**: Start/stop agents from web UI
- **Agent Groups**: Organize agents by project or team
- **Performance Monitoring**: Track agent performance metrics

## 📝 Notes

- The heartbeat system is designed to be lightweight and non-intrusive
- Agents automatically unregister when they shut down gracefully
- The system handles network interruptions gracefully
- Local agents are clearly distinguished from cloud agents in the UI


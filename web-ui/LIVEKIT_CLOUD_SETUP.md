# LiveKit Cloud Agent Setup Guide

## 🚀 LiveKit Cloud Benefits

✅ **Managed Infrastructure** - No server management  
✅ **Built-in Logging** - Session logs, metrics, debugging  
✅ **Auto-scaling** - Handles traffic spikes automatically  
✅ **Real-time Monitoring** - Agent status and performance  
✅ **Cost Efficiency** - Pay per usage vs. always-on servers  

## 📋 Prerequisites

1. **LiveKit Cloud Account** - https://cloud.livekit.io/
2. **LiveKit CLI** - Version 2.5 or higher
3. **OpenAI API Key** - For AI responses
4. **Node.js** - Version 18+ 

## 🛠️ Setup Steps

### 1. Install LiveKit CLI

```bash
# Install LiveKit CLI
curl -sSL https://get.livekit.io | bash

# Verify installation
lk version
```

### 2. Authenticate with LiveKit Cloud

```bash
# Navigate to your project
cd livekit-agents

# Authenticate with LiveKit Cloud
lk cloud auth

# Follow the browser authentication flow
```

### 3. Configure Environment Variables

Update your `.env` file with:

```bash
# OpenAI Configuration (required for cloud agents)
OPENAI_API_KEY="your-openai-api-key-here"

# LiveKit Configuration (already configured)
LIVEKIT_API_KEY="API7xEu4QebToWF"
LIVEKIT_API_SECRET="erfHGGH3FjiwTBKUufIToa0dezR8M4RzhpZEmFGf29HH"
```

### 4. Install Agent Dependencies

```bash
cd livekit-agents
npm install
```

### 5. Test Local Agent

```bash
# Build the agent
npm run build

# Test locally (optional)
npm run dev
```

### 6. Deploy to LiveKit Cloud

From your web interface at http://localhost:3025/agents:

1. **Create a new agent** or select existing
2. **Click "Launch"** - System will automatically try cloud deployment first
3. **Monitor deployment** - Click status badge to see real-time logs
4. **Verify in LiveKit Dashboard** - Check https://cloud.livekit.io/projects/p_mjloa7bmm8p/agents

## 🔍 Deployment Flow

### **Option 1: LiveKit Cloud Agents (Preferred)**
```
Your UI → Cloud Agent Deployment → LiveKit Cloud Infrastructure → Managed Agent
```

**Benefits:**
- ✅ Appears in LiveKit Cloud "Agents" section
- ✅ Built-in logging and monitoring  
- ✅ Auto-scaling and load balancing
- ✅ Session management and analytics

### **Option 2: Room-based Deployment (Fallback)**
```
Your UI → Room Creation → LiveKit Rooms → SIP Integration
```

**Benefits:**
- ✅ Works without CLI setup
- ✅ Direct room control
- ✅ SIP integration ready

## 📊 Monitoring & Management

### Check Agent Status
```bash
lk agent status <agent-id>
```

### View Agent Logs
```bash
lk agent logs <agent-id>
```

### Update Agent
```bash
lk agent deploy <agent-id>
```

### Delete Agent
```bash
lk agent delete <agent-id>
```

## 🔧 Configuration

The agent configuration is defined in:

- **`livekit-agents/livekit.toml`** - Project configuration
- **`livekit-agents/src/agent.ts`** - Agent logic and AI integration
- **Environment variables** - API keys and settings

## 🎯 Expected Results

After successful deployment:

1. **LiveKit Cloud UI** - Agent appears in "Agents" section
2. **Real-time Logs** - Available in cloud dashboard
3. **SIP Integration** - Automatic phone number routing
4. **AI Conversations** - OpenAI-powered responses
5. **Session Analytics** - Call duration, success rates, etc.

## 🚨 Troubleshooting

### Agent not appearing in cloud UI?
- Check `lk cloud auth` status
- Verify OpenAI API key in `.env`
- Check agent build: `npm run build` in `livekit-agents/`

### Deployment failing?
- System automatically falls back to room-based deployment
- Check logs for specific error messages
- Verify all environment variables are set

### SIP calls not working?
- Verify SIP trunk configuration
- Check LiveKit SIP settings
- Test room-based deployment first

## 🔄 Development Workflow

1. **Modify agent** in `livekit-agents/src/agent.ts`
2. **Test locally** with `npm run dev` 
3. **Deploy changes** via web UI "Launch" button
4. **Monitor** in LiveKit Cloud dashboard
5. **Iterate** based on logs and performance

This setup gives you the best of both worlds: managed cloud infrastructure with full control over your AI agent logic!
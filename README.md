# GOBI - AI Voice Agent Platform

Complete AI-powered voice agent platform with LiveKit SIP integration for automated inbound and outbound calling campaigns.

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                           │
│                   http://localhost:3026                           │
│  ┌─────────────┬──────────────┬───────────────┬────────────────┐ │
│  │  Agents     │  Campaigns   │  Lead Lists   │  Phone Numbers │ │
│  └─────────────┴──────────────┴───────────────┴────────────────┘ │
└────────────────────────────────┬─────────────────────────────────┘
                                 │ REST API
┌────────────────────────────────▼─────────────────────────────────┐
│               Backend API (Node.js + Express)                     │
│                   http://localhost:3000                           │
│  ┌──────────┬──────────┬─────────────┬──────────────────────────┐│
│  │  Auth    │  Agents  │  Campaigns  │  LiveKit Integration     ││
│  │  JWT     │  CRUD    │  Management │  SIP Trunks & Dispatch   ││
│  └──────────┴──────────┴─────────────┴──────────────────────────┘│
└────────────────────────────────┬─────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌───────────────┐      ┌──────────────────┐      ┌──────────────┐
│  PostgreSQL   │      │  LiveKit Cloud   │      │Python Agent  │
│   Database    │      │  SIP Gateway     │      │   Runtime    │
│               │      │                  │      │              │
│ • Tenants     │      │ • SIP Trunks     │      │ • Heartbeat  │
│ • Users       │      │ • Dispatch Rules │      │ • Status     │
│ • Agents      │      │ • Call Routing   │      │ • Metrics    │
│ • Campaigns   │      └──────────────────┘      └──────────────┘
│ • Leads       │
│ • PhoneNumbers│
└───────────────┘
```

## 📁 Project Structure

```
SIP/
├── gobi-main/                 # Backend API (Node.js)
│   ├── src/
│   │   ├── routes/           # API endpoints
│   │   ├── middleware/       # Auth & validation
│   │   └── services/         # Business logic
│   ├── prisma/
│   │   └── schema.prisma     # Database schema
│   ├── agent_runtime.py      # Python agent runtime
│   └── package.json
│
├── web-ui/                    # Frontend (React + Next.js)
│   ├── src/
│   │   ├── pages/            # Page components
│   │   ├── components/       # Reusable UI components
│   │   ├── services/         # API clients
│   │   └── utils/            # Helpers
│   └── package.json
│
└── README.md                  # This file
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18+
- **PostgreSQL** v14+
- **Python** 3.8+ (for agent runtime)
- **npm** v9+

### 1. Backend Setup

```bash
cd gobi-main

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Database setup
npx prisma migrate deploy
npx prisma generate

# Start backend
npm run dev
```

Backend runs at: **http://localhost:3000**

### 2. Frontend Setup

```bash
cd web-ui

# Install dependencies
npm install

# Setup environment
cp .env.local.example .env.local
# Edit .env.local with backend URL

# Start frontend
npm run dev
```

Frontend runs at: **http://localhost:3026**

### 3. Default Login

```
Email: demo@ytel.com
Password: password123
```

## 🤖 Agent System

### How It Works

1. **Create Agent** in UI
   - Configure model (gpt-4, gpt-3.5-turbo)
   - Set voice (nova, alloy, echo, etc.)
   - Define prompt and temperature

2. **Deploy Agent** via Python Runtime
   ```bash
   cd gobi-main
   python3 agent_runtime.py \
     --username demo@ytel.com \
     --password password123 \
     --agent-id <agent-id>
   ```

3. **Agent Reports Status**
   - Sends heartbeat every 30 seconds
   - Backend updates agent status to ACTIVE
   - Auto-timeout after 90s without heartbeat → INACTIVE

4. **Assign to Campaigns**
   - Only ACTIVE agents can be assigned
   - Multiple agents per campaign supported
   - Priority-based routing

### Agent Lifecycle

```
CREATE → DEPLOY → ACTIVE → [Heartbeats] → STOP → INACTIVE
                    ↓
              Auto-timeout (90s)
                    ↓
                 INACTIVE
```

## 📞 Campaign System

### Campaign Types

1. **INBOUND** - Receive incoming calls
   - Assign phone numbers
   - Route to AI agents
   - Handle inquiries automatically

2. **OUTBOUND** - Make automated calls
   - Assign lead lists
   - Progressive dialing
   - Track contact attempts

### Creating a Campaign

```javascript
POST /api/tenants/:tenantId/campaigns
{
  "name": "Sales Campaign",
  "campaignType": "OUTBOUND",
  "agentIds": ["<agent-id>"],        // Must be ACTIVE
  "leadListIds": ["<list-id>"],       // For outbound
  "numberIds": ["<phone-number-id>"]  // SIP numbers
}
```

Backend automatically:
- Creates LiveKit SIP trunk
- Sets up dispatch rules
- Links agents via CampaignAgent table

## 📋 Lead Management

### Import Leads (CSV)

```csv
phoneNumber,name,email
+14155551001,John Doe,john@example.com
+14155551002,Jane Smith,jane@example.com
```

Upload via UI or API:

```bash
POST /api/lead-lists/:id/upload
Content-Type: application/json

{
  "content": "phoneNumber,name,email\n+14155551001,John Doe,john@example.com"
}
```

## 🔑 Key API Endpoints

### Authentication
```
POST   /api/auth/login        # Get JWT token
POST   /api/auth/register     # Create account
GET    /api/auth/me           # Get user profile
```

### Agents
```
GET    /api/agents                    # List agents
POST   /api/agents                    # Create agent
POST   /api/agents/:id/deploy         # Deploy (mark ACTIVE)
POST   /api/agents/:id/heartbeat      # Send status update
DELETE /api/agents/:id                # Delete agent
```

### Campaigns
```
GET    /api/tenants/:id/campaigns     # List campaigns
POST   /api/tenants/:id/campaigns     # Create campaign
GET    /api/tenants/:id/campaigns/:id # Get details
DELETE /api/tenants/:id/campaigns/:id # Delete campaign
```

### Lead Lists
```
GET    /api/lead-lists                # List lead lists
POST   /api/lead-lists                # Create list
POST   /api/lead-lists/:id/upload     # Upload leads (CSV)
DELETE /api/lead-lists/:id            # Delete list
```

## 🗄️ Database Models

### Core Entities

- **Tenant** - Organization accounts
- **User** - System users with authentication
- **Agent** - AI voice agents with configuration
- **Campaign** - Call campaigns (inbound/outbound)
- **Lead** - Contact records with phone numbers
- **LeadList** - Collections of leads
- **PhoneNumber** - SIP phone numbers
- **CampaignAgent** - Many-to-many: Campaign ↔ Agent
- **LiveKitTrunk** - SIP trunk configurations
- **DispatchRule** - Call routing rules

## 🔧 Development

### Backend Commands
```bash
cd gobi-main

npm run dev              # Start dev server
npx prisma studio        # Database GUI
npx prisma migrate dev   # Create migration
node check_agents.js     # Check agent status
node check_db.js         # Verify database
```

### Frontend Commands
```bash
cd web-ui

npm run dev             # Start dev server (Turbopack)
npm run build           # Production build
npm run lint            # Code linting
```

### Test Scripts
```bash
# Backend testing
cd gobi-main
node test_campaign_agent_assignment.js
node test_campaign_leads.js

# Agent deployment
python3 agent_runtime.py --help
```

## 🐛 Troubleshooting

### Agent not showing as ACTIVE

**Problem**: Python agent runtime is running but UI shows INACTIVE

**Solution**:
1. Verify agent is sending heartbeats (check Python logs for "💓 Heartbeat sent")
2. Ensure correct agent ID: `--agent-id <id-from-database>`
3. Check backend logs for heartbeat reception
4. Wait up to 5 seconds for auto-refresh

### Campaign creation fails

**Problem**: Cannot create campaign with agent assignment

**Solution**:
1. Ensure agent is ACTIVE (run Python runtime first)
2. Verify agent ID is correct
3. Check backend logs for validation errors
4. Only ACTIVE agents can be assigned to campaigns

### Database connection errors

**Problem**: Backend fails to start with Prisma errors

**Solution**:
```bash
# Verify PostgreSQL is running
pg_isready

# Check DATABASE_URL in .env
cat gobi-main/.env | grep DATABASE_URL

# Regenerate Prisma client
cd gobi-main
npx prisma generate

# Test connection
npx prisma db pull
```

### Frontend can't connect to backend

**Problem**: API calls fail with network errors

**Solution**:
1. Verify backend is running: `curl http://localhost:3000/health`
2. Check `.env.local` has correct API URL
3. Ensure CORS is configured in backend
4. Clear browser cache and reload

## 📊 Features Overview

### ✅ Implemented
- User authentication (JWT)
- Agent CRUD operations
- Campaign management with agent assignment
- Lead list management with CSV upload
- Phone number provisioning
- Heartbeat monitoring with auto-timeout
- LiveKit SIP trunk integration
- Multi-tenancy support

### 🚧 Future Enhancements
- Real-time call analytics dashboard
- Agent performance metrics
- Call recording playback
- Advanced lead filtering
- Automated callback scheduling
- SMS integration
- Call transfer capabilities

## 📝 Environment Variables

### Backend (.env)
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/gobi_db"
JWT_SECRET="your-secret-key"
PORT=3000
LIVEKIT_API_KEY="your-livekit-key"
LIVEKIT_API_SECRET="your-livekit-secret"
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_GOBI_MAIN_API_URL=http://localhost:3000
```

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes
3. Test thoroughly
4. Commit: `git commit -m "Add my feature"`
5. Push: `git push origin feature/my-feature`
6. Create Pull Request

## 📄 License

Proprietary - All rights reserved

## 🆘 Support

For issues or questions:
1. Check this README
2. Review backend/frontend specific READMEs
3. Check application logs
4. Contact development team

## 🔗 Data Relationships & Flow

### How Agents, Campaigns, and Lead Lists Connect

```
┌─────────────┐         ┌──────────────────┐         ┌──────────────┐
│   Agent     │◄────────│  CampaignAgent   │────────►│  Campaign    │
│             │  M:N    │  (Junction)      │  M:N    │              │
│ • id        │         │ • campaignId     │         │ • id         │
│ • name      │         │ • agentId        │         │ • name       │
│ • status    │         │ • priority       │         │ • type       │
│ • model     │         │ • isActive       │         │              │
└─────────────┘         └──────────────────┘         └───────┬──────┘
                                                              │
                                                              │ M:N
                                                              │
                                                       ┌──────▼──────┐
                                                       │  LeadList   │
                                                       │             │
                                                       │ • id        │
                                                       │ • name      │
                                                       └───────┬─────┘
                                                               │
                                                               │ 1:M
                                                               │
                                                        ┌──────▼──────┐
                                                        │    Lead     │
                                                        │             │
                                                        │ • id        │
                                                        │ • phone     │
                                                        │ • name      │
                                                        │ • email     │
                                                        └─────────────┘
```

### Relationship Details

1. **Campaign ↔ Agent** (Many-to-Many via CampaignAgent)
   - One campaign can have multiple agents
   - One agent can serve multiple campaigns
   - Junction table stores priority and active status
   - Only ACTIVE agents can be assigned

2. **Campaign ↔ LeadList** (Many-to-Many via assignedLeadLists)
   - One campaign can target multiple lead lists
   - One lead list can be used by multiple campaigns
   - Outbound campaigns require at least one lead list

3. **LeadList ↔ Lead** (One-to-Many)
   - One lead list contains many leads
   - Each lead belongs to one list
   - Leads have phone numbers, names, custom fields

### Example Flow: Outbound Campaign

```
1. Create Lead List
   ├─ Import 1000 leads from CSV
   └─ Leads have: phoneNumber, name, email

2. Create Agent
   ├─ Configure: GPT-4, Nova voice, Sales prompt
   └─ Deploy Python runtime → Agent becomes ACTIVE

3. Create Campaign
   ├─ Type: OUTBOUND
   ├─ Assign Agent (from step 2)
   ├─ Assign Lead List (from step 1)
   └─ Backend creates:
      ├─ LiveKit SIP trunk
      ├─ Dispatch rule (routes to agent)
      └─ CampaignAgent record (links agent to campaign)

4. Campaign Execution
   ├─ System pulls leads from assigned list
   ├─ Dials phone numbers sequentially
   ├─ LiveKit routes calls to assigned agent
   └─ Agent handles conversations using GPT-4
```

## 🖥️ Running Agents Locally

### Method 1: Using Generated Python Script (Recommended)

1. **Get Agent Script from UI**
   ```bash
   # In the GOBI UI:
   # 1. Go to Agents page
   # 2. Click on an agent
   # 3. Click "Python Agent Script Preview"
   # 4. Click "Download" or "Copy Script"
   ```

2. **Save and Run Script**
   ```bash
   # Save as gobi_agent_<agent-id>.py
   chmod +x gobi_agent_<agent-id>.py
   
   python3 gobi_agent_<agent-id>.py \
     --username demo@ytel.com \
     --password password123
   ```

3. **Agent Starts and Reports**
   ```
   ====================================================================================
   🚀 GOBI Local Agent
   ====================================================================================
   Agent Name:  Appointment Setter
   Agent ID:    cmgb7nqgt000asb749d6d8bdy
   Model:       gpt-4
   Voice:       nova
   Temperature: 0.7
   Backend URL: http://localhost:3000
   ====================================================================================

   🔐 Logging in as demo@ytel.com...
   ✅ Login successful
   🚀 Deploying agent cmgb7nqgt000asb749d6d8bdy...
   ✅ Agent deployed: Appointment Setter
      Status: ACTIVE

   ✅ Agent 'Appointment Setter' (ID: cmgb7nqgt000asb749d6d8bdy) is now RUNNING
      Heartbeat interval: 30s
      Backend: http://localhost:3000

   📞 Agent is ready and will appear as ACTIVE in your GOBI UI
      Press Ctrl+C to stop

   💓 [2025-01-20 14:23:45] Heartbeat sent - Uptime: 30s, Calls: 0
   💓 [2025-01-20 14:24:15] Heartbeat sent - Uptime: 60s, Calls: 0
   ```

### Method 2: Using agent_runtime.py Directly

```bash
cd gobi-main

# Install Python dependencies (if not already installed)
pip3 install requests

# Run agent with specific ID
python3 agent_runtime.py \
  --username demo@ytel.com \
  --password password123 \
  --agent-id <agent-id-from-database> \
  --heartbeat 30

# Optional: Run with custom backend URL
python3 agent_runtime.py \
  --url http://your-backend.com:3000 \
  --username demo@ytel.com \
  --password password123 \
  --agent-id <agent-id>
```

### What Happens When Agent Runs

1. **Login to GOBI**
   - Authenticates with username/password
   - Receives JWT token
   - Token used for all subsequent API calls

2. **Deploy Agent**
   - Calls `/api/agents/:id/deploy`
   - Backend marks agent as ACTIVE in database
   - Agent appears as 🟢 ACTIVE in UI

3. **Heartbeat Loop**
   - Every 30 seconds, agent sends heartbeat
   - Endpoint: `POST /api/agents/:id/heartbeat`
   - Payload includes:
     ```json
     {
       "status": "RUNNING",
       "metrics": {
         "uptime_seconds": 120,
         "total_calls": 5,
         "successful_calls": 4,
         "success_rate": 80.0
       }
     }
     ```

4. **Backend Processing**
   - Updates `livekitConfig.lastHeartbeat` timestamp
   - Agent remains ACTIVE
   - Frontend auto-refreshes every 5s to show status

5. **Graceful Shutdown**
   - Press Ctrl+C to stop agent
   - Agent sends final heartbeat with status: "STOPPED"
   - Backend marks agent as INACTIVE
   - Displays session statistics:
     ```
     📊 Session Statistics:
        Total uptime: 3600 seconds
        Total calls: 42
        Successful calls: 40
        Success rate: 95.2%
     ```

### Automatic Timeout Detection

**Backend automatically monitors agent health:**

```javascript
// Backend checks every 5 seconds
// If agent hasn't sent heartbeat in 90 seconds:
if (timeSinceLastHeartbeat > 90000) {
  agent.status = 'INACTIVE'
  // Agent shows as 🔴 INACTIVE in UI
}
```

**This prevents "zombie" agents:**
- Agent process crashes → No heartbeats → Auto-marked INACTIVE after 90s
- Network disconnection → Heartbeats stop → Auto-marked INACTIVE
- Python script terminated without cleanup → Auto-marked INACTIVE

### Multiple Agents

**Run multiple agents simultaneously:**

```bash
# Terminal 1
python3 agent_runtime.py --username demo@ytel.com --password password123 --agent-id agent-1

# Terminal 2
python3 agent_runtime.py --username demo@ytel.com --password password123 --agent-id agent-2

# Terminal 3
python3 agent_runtime.py --username demo@ytel.com --password password123 --agent-id agent-3
```

Each agent:
- Runs independently
- Sends its own heartbeats
- Can be assigned to different campaigns
- Handles calls concurrently


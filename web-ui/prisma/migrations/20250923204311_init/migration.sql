-- CreateTable
CREATE TABLE "Slot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "date" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "File" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CsvData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phoneNumber" TEXT NOT NULL,
    "name" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "script" TEXT,
    "totalLeads" INTEGER NOT NULL DEFAULT 0,
    "callsMade" INTEGER NOT NULL DEFAULT 0,
    "callsAnswered" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" REAL NOT NULL DEFAULT 0.0,
    "averageDuration" REAL NOT NULL DEFAULT 0.0,
    "totalCost" REAL NOT NULL DEFAULT 0.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LeadList" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phoneNumber" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorReason" TEXT,
    "campaignId" TEXT,
    "listId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_listId_fkey" FOREIGN KEY ("listId") REFERENCES "LeadList" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "agentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "callStartTime" DATETIME,
    "callEndTime" DATETIME,
    "duration" INTEGER,
    "results" JSONB,
    "transcript" TEXT,
    "sentiment" TEXT,
    "leadScore" INTEGER,
    "outcome" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Conversation_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Conversation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Conversation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PhoneNumber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "friendlyName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "capabilities" TEXT NOT NULL,
    "twilioSid" TEXT NOT NULL,
    "twilioAccount" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "monthlyCost" REAL NOT NULL DEFAULT 0.0,
    "assignedAgentId" TEXT,
    "callDirection" TEXT NOT NULL DEFAULT 'BOTH',
    "webhookUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "prompt" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'gpt-4',
    "voice" TEXT NOT NULL DEFAULT 'nova',
    "temperature" REAL NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 1000,
    "status" TEXT NOT NULL DEFAULT 'INACTIVE',
    "deploymentMode" TEXT NOT NULL DEFAULT 'livekit',
    "template" TEXT NOT NULL DEFAULT 'custom',
    "phoneNumberId" TEXT,
    "livekitConfig" JSONB,
    "twilioConfig" JSONB,
    "performance" JSONB,
    "totalCalls" INTEGER NOT NULL DEFAULT 0,
    "successfulCalls" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" REAL NOT NULL DEFAULT 0.0,
    "averageDuration" REAL NOT NULL DEFAULT 0.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Agent_phoneNumberId_fkey" FOREIGN KEY ("phoneNumberId") REFERENCES "PhoneNumber" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignAgent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CampaignAgent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CampaignAgent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CallAnalytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "agentId" TEXT,
    "leadId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "callStartTime" DATETIME NOT NULL,
    "callEndTime" DATETIME,
    "duration" INTEGER,
    "status" TEXT NOT NULL,
    "outcome" TEXT,
    "transcript" TEXT,
    "sentiment" TEXT,
    "keywords" TEXT NOT NULL,
    "leadScore" INTEGER,
    "agentPerformance" JSONB,
    "cost" REAL NOT NULL DEFAULT 0.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CallAnalytics_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SystemMetrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "totalCalls" INTEGER NOT NULL DEFAULT 0,
    "answeredCalls" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" REAL NOT NULL DEFAULT 0.0,
    "averageDuration" REAL NOT NULL DEFAULT 0.0,
    "totalCost" REAL NOT NULL DEFAULT 0.0,
    "activeAgents" INTEGER NOT NULL DEFAULT 0,
    "activeCampaigns" INTEGER NOT NULL DEFAULT 0,
    "systemUptime" REAL NOT NULL DEFAULT 100.0,
    "errorRate" REAL NOT NULL DEFAULT 0.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "_LeadListCampaigns" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_LeadListCampaigns_A_fkey" FOREIGN KEY ("A") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_LeadListCampaigns_B_fkey" FOREIGN KEY ("B") REFERENCES "LeadList" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_name_key" ON "Campaign"("name");

-- CreateIndex
CREATE INDEX "LeadList_name_idx" ON "LeadList"("name");

-- CreateIndex
CREATE INDEX "Lead_campaignId_idx" ON "Lead"("campaignId");

-- CreateIndex
CREATE INDEX "Lead_listId_idx" ON "Lead"("listId");

-- CreateIndex
CREATE INDEX "Conversation_campaignId_idx" ON "Conversation"("campaignId");

-- CreateIndex
CREATE INDEX "Conversation_agentId_idx" ON "Conversation"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "PhoneNumber_number_key" ON "PhoneNumber"("number");

-- CreateIndex
CREATE UNIQUE INDEX "PhoneNumber_twilioSid_key" ON "PhoneNumber"("twilioSid");

-- CreateIndex
CREATE UNIQUE INDEX "PhoneNumber_assignedAgentId_key" ON "PhoneNumber"("assignedAgentId");

-- CreateIndex
CREATE INDEX "PhoneNumber_status_idx" ON "PhoneNumber"("status");

-- CreateIndex
CREATE INDEX "PhoneNumber_assignedAgentId_idx" ON "PhoneNumber"("assignedAgentId");

-- CreateIndex
CREATE INDEX "PhoneNumber_callDirection_idx" ON "PhoneNumber"("callDirection");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_name_key" ON "Agent"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_phoneNumberId_key" ON "Agent"("phoneNumberId");

-- CreateIndex
CREATE INDEX "Agent_status_idx" ON "Agent"("status");

-- CreateIndex
CREATE INDEX "Agent_phoneNumberId_idx" ON "Agent"("phoneNumberId");

-- CreateIndex
CREATE INDEX "CampaignAgent_campaignId_idx" ON "CampaignAgent"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignAgent_agentId_idx" ON "CampaignAgent"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignAgent_campaignId_agentId_key" ON "CampaignAgent"("campaignId", "agentId");

-- CreateIndex
CREATE INDEX "CallAnalytics_campaignId_idx" ON "CallAnalytics"("campaignId");

-- CreateIndex
CREATE INDEX "CallAnalytics_agentId_idx" ON "CallAnalytics"("agentId");

-- CreateIndex
CREATE INDEX "CallAnalytics_callStartTime_idx" ON "CallAnalytics"("callStartTime");

-- CreateIndex
CREATE UNIQUE INDEX "SystemMetrics_date_key" ON "SystemMetrics"("date");

-- CreateIndex
CREATE INDEX "SystemMetrics_date_idx" ON "SystemMetrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "_LeadListCampaigns_AB_unique" ON "_LeadListCampaigns"("A", "B");

-- CreateIndex
CREATE INDEX "_LeadListCampaigns_B_index" ON "_LeadListCampaigns"("B");

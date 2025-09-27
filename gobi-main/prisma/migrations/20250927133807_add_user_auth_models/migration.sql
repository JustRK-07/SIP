/*
  Warnings:

  - You are about to drop the `campaigns` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `dispatch_rules` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `livekit_trunks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `phone_numbers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `platform_trunks` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."campaigns" DROP CONSTRAINT "campaigns_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."dispatch_rules" DROP CONSTRAINT "dispatch_rules_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "public"."dispatch_rules" DROP CONSTRAINT "dispatch_rules_livekitTrunkId_fkey";

-- DropForeignKey
ALTER TABLE "public"."dispatch_rules" DROP CONSTRAINT "dispatch_rules_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."livekit_trunks" DROP CONSTRAINT "livekit_trunks_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "public"."livekit_trunks" DROP CONSTRAINT "livekit_trunks_platformTrunkId_fkey";

-- DropForeignKey
ALTER TABLE "public"."livekit_trunks" DROP CONSTRAINT "livekit_trunks_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."phone_numbers" DROP CONSTRAINT "phone_numbers_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "public"."phone_numbers" DROP CONSTRAINT "phone_numbers_livekitTrunkId_fkey";

-- DropForeignKey
ALTER TABLE "public"."phone_numbers" DROP CONSTRAINT "phone_numbers_platformTrunkId_fkey";

-- DropForeignKey
ALTER TABLE "public"."phone_numbers" DROP CONSTRAINT "phone_numbers_tenantId_fkey";

-- DropTable
DROP TABLE "public"."campaigns";

-- DropTable
DROP TABLE "public"."dispatch_rules";

-- DropTable
DROP TABLE "public"."livekit_trunks";

-- DropTable
DROP TABLE "public"."phone_numbers";

-- DropTable
DROP TABLE "public"."platform_trunks";

-- DropEnum
DROP TYPE "public"."DispatchRuleType";

-- DropEnum
DROP TYPE "public"."NumberType";

-- DropEnum
DROP TYPE "public"."Provider";

-- DropEnum
DROP TYPE "public"."TrunkStatus";

-- DropEnum
DROP TYPE "public"."TrunkType";

-- CreateTable
CREATE TABLE "public"."Slot" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."File" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CsvData" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "name" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CsvData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "script" TEXT,
    "totalLeads" INTEGER NOT NULL DEFAULT 0,
    "callsMade" INTEGER NOT NULL DEFAULT 0,
    "callsAnswered" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "averageDuration" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LeadList" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Lead" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorReason" TEXT,
    "campaignId" TEXT,
    "listId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Conversation" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "agentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "callStartTime" TIMESTAMP(3),
    "callEndTime" TIMESTAMP(3),
    "duration" INTEGER,
    "results" TEXT,
    "transcript" TEXT,
    "sentiment" TEXT,
    "leadScore" INTEGER,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PhoneNumber" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "friendlyName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "capabilities" TEXT NOT NULL,
    "twilioSid" TEXT NOT NULL,
    "twilioAccount" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "monthlyCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "assignedAgentId" TEXT,
    "callDirection" TEXT NOT NULL DEFAULT 'BOTH',
    "webhookUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhoneNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "prompt" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'gpt-4',
    "voice" TEXT NOT NULL DEFAULT 'nova',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 1000,
    "status" TEXT NOT NULL DEFAULT 'INACTIVE',
    "deploymentMode" TEXT NOT NULL DEFAULT 'livekit',
    "template" TEXT NOT NULL DEFAULT 'custom',
    "phoneNumberId" TEXT,
    "livekitConfig" TEXT,
    "twilioConfig" TEXT,
    "performance" TEXT,
    "totalCalls" INTEGER NOT NULL DEFAULT 0,
    "successfulCalls" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "averageDuration" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CampaignAgent" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CallAnalytics" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "agentId" TEXT,
    "leadId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "callStartTime" TIMESTAMP(3) NOT NULL,
    "callEndTime" TIMESTAMP(3),
    "duration" INTEGER,
    "status" TEXT NOT NULL,
    "outcome" TEXT,
    "transcript" TEXT,
    "sentiment" TEXT,
    "keywords" TEXT NOT NULL,
    "leadScore" INTEGER,
    "agentPerformance" TEXT,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SystemMetrics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalCalls" INTEGER NOT NULL DEFAULT 0,
    "answeredCalls" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "averageDuration" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "activeAgents" INTEGER NOT NULL DEFAULT 0,
    "activeCampaigns" INTEGER NOT NULL DEFAULT 0,
    "systemUptime" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "errorRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "permissions" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_LeadListCampaigns" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_LeadListCampaigns_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_name_key" ON "public"."Campaign"("name");

-- CreateIndex
CREATE INDEX "LeadList_name_idx" ON "public"."LeadList"("name");

-- CreateIndex
CREATE INDEX "Lead_campaignId_idx" ON "public"."Lead"("campaignId");

-- CreateIndex
CREATE INDEX "Lead_listId_idx" ON "public"."Lead"("listId");

-- CreateIndex
CREATE INDEX "Conversation_campaignId_idx" ON "public"."Conversation"("campaignId");

-- CreateIndex
CREATE INDEX "Conversation_agentId_idx" ON "public"."Conversation"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "PhoneNumber_number_key" ON "public"."PhoneNumber"("number");

-- CreateIndex
CREATE UNIQUE INDEX "PhoneNumber_twilioSid_key" ON "public"."PhoneNumber"("twilioSid");

-- CreateIndex
CREATE UNIQUE INDEX "PhoneNumber_assignedAgentId_key" ON "public"."PhoneNumber"("assignedAgentId");

-- CreateIndex
CREATE INDEX "PhoneNumber_status_idx" ON "public"."PhoneNumber"("status");

-- CreateIndex
CREATE INDEX "PhoneNumber_assignedAgentId_idx" ON "public"."PhoneNumber"("assignedAgentId");

-- CreateIndex
CREATE INDEX "PhoneNumber_callDirection_idx" ON "public"."PhoneNumber"("callDirection");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_name_key" ON "public"."Agent"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_phoneNumberId_key" ON "public"."Agent"("phoneNumberId");

-- CreateIndex
CREATE INDEX "Agent_status_idx" ON "public"."Agent"("status");

-- CreateIndex
CREATE INDEX "Agent_phoneNumberId_idx" ON "public"."Agent"("phoneNumberId");

-- CreateIndex
CREATE INDEX "CampaignAgent_campaignId_idx" ON "public"."CampaignAgent"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignAgent_agentId_idx" ON "public"."CampaignAgent"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignAgent_campaignId_agentId_key" ON "public"."CampaignAgent"("campaignId", "agentId");

-- CreateIndex
CREATE INDEX "CallAnalytics_campaignId_idx" ON "public"."CallAnalytics"("campaignId");

-- CreateIndex
CREATE INDEX "CallAnalytics_agentId_idx" ON "public"."CallAnalytics"("agentId");

-- CreateIndex
CREATE INDEX "CallAnalytics_callStartTime_idx" ON "public"."CallAnalytics"("callStartTime");

-- CreateIndex
CREATE UNIQUE INDEX "SystemMetrics_date_key" ON "public"."SystemMetrics"("date");

-- CreateIndex
CREATE INDEX "SystemMetrics_date_idx" ON "public"."SystemMetrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "public"."users"("username");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "public"."users"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "public"."refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "public"."refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "public"."refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "_LeadListCampaigns_B_index" ON "public"."_LeadListCampaigns"("B");

-- AddForeignKey
ALTER TABLE "public"."Lead" ADD CONSTRAINT "Lead_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lead" ADD CONSTRAINT "Lead_listId_fkey" FOREIGN KEY ("listId") REFERENCES "public"."LeadList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversation" ADD CONSTRAINT "Conversation_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversation" ADD CONSTRAINT "Conversation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversation" ADD CONSTRAINT "Conversation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Agent" ADD CONSTRAINT "Agent_phoneNumberId_fkey" FOREIGN KEY ("phoneNumberId") REFERENCES "public"."PhoneNumber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CampaignAgent" ADD CONSTRAINT "CampaignAgent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CampaignAgent" ADD CONSTRAINT "CampaignAgent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CallAnalytics" ADD CONSTRAINT "CallAnalytics_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_LeadListCampaigns" ADD CONSTRAINT "_LeadListCampaigns_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_LeadListCampaigns" ADD CONSTRAINT "_LeadListCampaigns_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."LeadList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

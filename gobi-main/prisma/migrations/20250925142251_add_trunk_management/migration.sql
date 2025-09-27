-- CreateEnum
CREATE TYPE "public"."TrunkStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PROVISIONING', 'ERROR', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "public"."RouteAction" AS ENUM ('ROUTE_TO_LIVEKIT', 'ROUTE_TO_SIP', 'ROUTE_TO_NUMBER', 'REJECT', 'BUSY', 'TRANSFORM_AND_ROUTE');

-- CreateTable
CREATE TABLE "public"."platform_trunks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Platform Twilio Trunk',
    "description" TEXT,
    "twilioAccountSid" TEXT NOT NULL,
    "twilioAuthToken" TEXT NOT NULL,
    "twilioRegion" TEXT DEFAULT 'us1',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxChannels" INTEGER DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_trunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."livekit_trunks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "livekitUrl" TEXT NOT NULL,
    "livekitApiKey" TEXT NOT NULL,
    "livekitApiSecret" TEXT NOT NULL,
    "livekitRegion" TEXT DEFAULT 'us-east-1',
    "status" "public"."TrunkStatus" NOT NULL DEFAULT 'INACTIVE',
    "maxConcurrentCalls" INTEGER DEFAULT 10,
    "codecPreferences" TEXT[] DEFAULT ARRAY['PCMU', 'PCMA', 'G722']::TEXT[],
    "sipUsername" TEXT,
    "sipPassword" TEXT,
    "sipDomain" TEXT,
    "sipPort" INTEGER DEFAULT 5060,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "platformTrunkId" TEXT NOT NULL,

    CONSTRAINT "livekit_trunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."routing_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sourcePattern" TEXT,
    "destinationPattern" TEXT,
    "callerIdPattern" TEXT,
    "routingAction" "public"."RouteAction" NOT NULL DEFAULT 'ROUTE_TO_LIVEKIT',
    "targetSipUri" TEXT,
    "targetNumber" TEXT,
    "stripDigits" INTEGER DEFAULT 0,
    "prependDigits" TEXT,
    "timeRestrictions" JSONB,
    "geoRestrictions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "livekitTrunkId" TEXT NOT NULL,

    CONSTRAINT "routing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_trunks_twilioAccountSid_key" ON "public"."platform_trunks"("twilioAccountSid");

-- CreateIndex
CREATE INDEX "livekit_trunks_tenantId_idx" ON "public"."livekit_trunks"("tenantId");

-- CreateIndex
CREATE INDEX "livekit_trunks_platformTrunkId_idx" ON "public"."livekit_trunks"("platformTrunkId");

-- CreateIndex
CREATE UNIQUE INDEX "livekit_trunks_tenantId_name_key" ON "public"."livekit_trunks"("tenantId", "name");

-- CreateIndex
CREATE INDEX "routing_rules_livekitTrunkId_idx" ON "public"."routing_rules"("livekitTrunkId");

-- CreateIndex
CREATE INDEX "routing_rules_priority_idx" ON "public"."routing_rules"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "routing_rules_livekitTrunkId_name_key" ON "public"."routing_rules"("livekitTrunkId", "name");

-- AddForeignKey
ALTER TABLE "public"."livekit_trunks" ADD CONSTRAINT "livekit_trunks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."livekit_trunks" ADD CONSTRAINT "livekit_trunks_platformTrunkId_fkey" FOREIGN KEY ("platformTrunkId") REFERENCES "public"."platform_trunks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."routing_rules" ADD CONSTRAINT "routing_rules_livekitTrunkId_fkey" FOREIGN KEY ("livekitTrunkId") REFERENCES "public"."livekit_trunks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

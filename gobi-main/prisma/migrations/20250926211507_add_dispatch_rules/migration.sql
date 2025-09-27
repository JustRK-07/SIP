-- CreateEnum
CREATE TYPE "public"."DispatchRuleType" AS ENUM ('DIRECT', 'INDIVIDUAL');

-- CreateTable
CREATE TABLE "public"."dispatch_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "livekitDispatchRuleId" TEXT,
    "ruleType" "public"."DispatchRuleType" NOT NULL DEFAULT 'DIRECT',
    "roomName" TEXT,
    "roomPrefix" TEXT,
    "pin" TEXT,
    "status" "public"."TrunkStatus" NOT NULL DEFAULT 'INACTIVE',
    "metadata" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "livekitTrunkId" TEXT,

    CONSTRAINT "dispatch_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dispatch_rules_tenantId_idx" ON "public"."dispatch_rules"("tenantId");

-- CreateIndex
CREATE INDEX "dispatch_rules_campaignId_idx" ON "public"."dispatch_rules"("campaignId");

-- CreateIndex
CREATE INDEX "dispatch_rules_livekitTrunkId_idx" ON "public"."dispatch_rules"("livekitTrunkId");

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_rules_tenantId_campaignId_name_key" ON "public"."dispatch_rules"("tenantId", "campaignId", "name");

-- AddForeignKey
ALTER TABLE "public"."dispatch_rules" ADD CONSTRAINT "dispatch_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dispatch_rules" ADD CONSTRAINT "dispatch_rules_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dispatch_rules" ADD CONSTRAINT "dispatch_rules_livekitTrunkId_fkey" FOREIGN KEY ("livekitTrunkId") REFERENCES "public"."livekit_trunks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

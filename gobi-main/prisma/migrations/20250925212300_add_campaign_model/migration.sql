-- AlterTable
ALTER TABLE "public"."phone_numbers" ADD COLUMN     "campaignId" TEXT;

-- CreateTable
CREATE TABLE "public"."campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaigns_tenantId_idx" ON "public"."campaigns"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_tenantId_name_key" ON "public"."campaigns"("tenantId", "name");

-- CreateIndex
CREATE INDEX "phone_numbers_campaignId_idx" ON "public"."phone_numbers"("campaignId");

-- AddForeignKey
ALTER TABLE "public"."campaigns" ADD CONSTRAINT "campaigns_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."phone_numbers" ADD CONSTRAINT "phone_numbers_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

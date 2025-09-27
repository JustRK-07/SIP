-- CreateEnum
CREATE TYPE "public"."NumberType" AS ENUM ('LOCAL', 'MOBILE', 'TOLL_FREE');

-- CreateEnum
CREATE TYPE "public"."Provider" AS ENUM ('TWILIO');

-- CreateTable
CREATE TABLE "public"."phone_numbers" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "type" "public"."NumberType" NOT NULL DEFAULT 'LOCAL',
    "label" TEXT,
    "extension" TEXT,
    "provider" "public"."Provider" NOT NULL DEFAULT 'TWILIO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "phone_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "phone_numbers_tenantId_idx" ON "public"."phone_numbers"("tenantId");

-- AddForeignKey
ALTER TABLE "public"."phone_numbers" ADD CONSTRAINT "phone_numbers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

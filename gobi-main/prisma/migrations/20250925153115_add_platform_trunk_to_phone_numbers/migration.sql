-- AlterTable
ALTER TABLE "public"."phone_numbers" ADD COLUMN     "platformTrunkId" TEXT;

-- CreateIndex
CREATE INDEX "phone_numbers_platformTrunkId_idx" ON "public"."phone_numbers"("platformTrunkId");

-- AddForeignKey
ALTER TABLE "public"."phone_numbers" ADD CONSTRAINT "phone_numbers_platformTrunkId_fkey" FOREIGN KEY ("platformTrunkId") REFERENCES "public"."platform_trunks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

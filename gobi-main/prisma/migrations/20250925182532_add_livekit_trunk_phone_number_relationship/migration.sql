-- AlterTable
ALTER TABLE "public"."phone_numbers" ADD COLUMN     "livekitTrunkId" TEXT;

-- CreateIndex
CREATE INDEX "phone_numbers_livekitTrunkId_idx" ON "public"."phone_numbers"("livekitTrunkId");

-- AddForeignKey
ALTER TABLE "public"."phone_numbers" ADD CONSTRAINT "phone_numbers_livekitTrunkId_fkey" FOREIGN KEY ("livekitTrunkId") REFERENCES "public"."livekit_trunks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

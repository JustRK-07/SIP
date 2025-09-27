-- AlterTable
ALTER TABLE "public"."livekit_trunks" ADD COLUMN     "campaignId" TEXT;

-- CreateIndex
CREATE INDEX "livekit_trunks_campaignId_idx" ON "public"."livekit_trunks"("campaignId");

-- AddForeignKey
ALTER TABLE "public"."livekit_trunks" ADD CONSTRAINT "livekit_trunks_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

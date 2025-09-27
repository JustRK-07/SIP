-- CreateEnum
CREATE TYPE "public"."TrunkType" AS ENUM ('INBOUND', 'OUTBOUND');

-- AlterTable
ALTER TABLE "public"."livekit_trunks" ADD COLUMN     "livekitTrunkId" TEXT,
ADD COLUMN     "trunkType" "public"."TrunkType" NOT NULL DEFAULT 'INBOUND';

-- AlterTable
ALTER TABLE "public"."campaigns" ADD COLUMN     "campaignType" "public"."TrunkType" NOT NULL DEFAULT 'INBOUND';

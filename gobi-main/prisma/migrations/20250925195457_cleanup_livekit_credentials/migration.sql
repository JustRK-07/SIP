/*
  Warnings:

  - You are about to drop the column `livekitApiKey` on the `livekit_trunks` table. All the data in the column will be lost.
  - You are about to drop the column `livekitApiSecret` on the `livekit_trunks` table. All the data in the column will be lost.
  - You are about to drop the column `livekitUrl` on the `livekit_trunks` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."livekit_trunks" DROP COLUMN "livekitApiKey",
DROP COLUMN "livekitApiSecret",
DROP COLUMN "livekitUrl";

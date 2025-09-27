/*
  Warnings:

  - You are about to drop the column `sipDomain` on the `livekit_trunks` table. All the data in the column will be lost.
  - You are about to drop the column `sipPassword` on the `livekit_trunks` table. All the data in the column will be lost.
  - You are about to drop the column `sipPort` on the `livekit_trunks` table. All the data in the column will be lost.
  - You are about to drop the column `sipUsername` on the `livekit_trunks` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."livekit_trunks" DROP COLUMN "sipDomain",
DROP COLUMN "sipPassword",
DROP COLUMN "sipPort",
DROP COLUMN "sipUsername";

/*
  Warnings:

  - You are about to drop the column `twilioAccountSid` on the `platform_trunks` table. All the data in the column will be lost.
  - You are about to drop the column `twilioAuthToken` on the `platform_trunks` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."platform_trunks_twilioAccountSid_key";

-- AlterTable
ALTER TABLE "public"."platform_trunks" DROP COLUMN "twilioAccountSid",
DROP COLUMN "twilioAuthToken";

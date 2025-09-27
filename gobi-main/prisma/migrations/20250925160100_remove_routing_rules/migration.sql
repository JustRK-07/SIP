/*
  Warnings:

  - You are about to drop the `routing_rules` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."routing_rules" DROP CONSTRAINT "routing_rules_livekitTrunkId_fkey";

-- DropTable
DROP TABLE "public"."routing_rules";

-- DropEnum
DROP TYPE "public"."RouteAction";

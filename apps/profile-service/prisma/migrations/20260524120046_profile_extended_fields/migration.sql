/*
  Warnings:

  - You are about to drop the column `displayName` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `photoUrls` on the `Profile` table. All the data in the column will be lost.
  - The `gender` column on the `Profile` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Made the column `bio` on table `Profile` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "displayName",
DROP COLUMN "photoUrls",
ADD COLUMN     "name" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "photos" TEXT[],
ALTER COLUMN "bio" SET NOT NULL,
ALTER COLUMN "bio" SET DEFAULT '',
DROP COLUMN "gender",
ADD COLUMN     "gender" "Gender";

-- CreateTable
CREATE TABLE "Interest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "Interest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Interest_name_key" ON "Interest"("name");

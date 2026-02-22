/*
  Warnings:

  - You are about to drop the column `teamId` on the `LlmConfig` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `LlmConfig` DROP FOREIGN KEY `LlmConfig_teamId_fkey`;

-- AlterTable
ALTER TABLE `LlmConfig` DROP COLUMN `teamId`,
    ADD COLUMN `creatorId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `LlmConfigTeam` (
    `id` VARCHAR(191) NOT NULL,
    `llmConfigId` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `LlmConfigTeam_llmConfigId_teamId_key`(`llmConfigId`, `teamId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `LlmConfig` ADD CONSTRAINT `LlmConfig_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LlmConfigTeam` ADD CONSTRAINT `LlmConfigTeam_llmConfigId_fkey` FOREIGN KEY (`llmConfigId`) REFERENCES `LlmConfig`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LlmConfigTeam` ADD CONSTRAINT `LlmConfigTeam_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

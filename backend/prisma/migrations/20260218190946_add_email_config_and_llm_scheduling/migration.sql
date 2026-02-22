-- AlterTable
ALTER TABLE `LlmConfig` ADD COLUMN `currentRunning` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `isGlobal` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `maxConcurrency` INTEGER NOT NULL DEFAULT 5,
    ADD COLUMN `queueEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `teamId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `email_configs` (
    `id` VARCHAR(191) NOT NULL,
    `host` VARCHAR(191) NOT NULL,
    `port` INTEGER NOT NULL DEFAULT 587,
    `secure` BOOLEAN NOT NULL DEFAULT false,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `fromEmail` VARCHAR(191) NOT NULL,
    `fromName` VARCHAR(191) NOT NULL DEFAULT 'EasyWorkflow',
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `lastTestAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdById` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `LlmConfig` ADD CONSTRAINT `LlmConfig_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

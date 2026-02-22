-- CreateTable
CREATE TABLE `system_settings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'system',
    `easyBotEnabled` BOOLEAN NOT NULL DEFAULT true,
    `processNodeAiEnabled` BOOLEAN NOT NULL DEFAULT true,
    `easyBotLlmConfigId` VARCHAR(191) NULL,
    `processNodeAiLlmConfigId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

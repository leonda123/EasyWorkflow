-- CreateTable
CREATE TABLE `mq_configs` (
    `id` VARCHAR(191) NOT NULL,
    `host` VARCHAR(191) NOT NULL DEFAULT 'localhost',
    `port` INTEGER NOT NULL DEFAULT 5672,
    `username` VARCHAR(191) NOT NULL DEFAULT 'guest',
    `password` VARCHAR(191) NOT NULL,
    `vhost` VARCHAR(191) NOT NULL DEFAULT '/',
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `connected` BOOLEAN NOT NULL DEFAULT false,
    `lastCheckAt` DATETIME(3) NULL,
    `maxRetries` INTEGER NOT NULL DEFAULT 3,
    `retryDelay` INTEGER NOT NULL DEFAULT 5000,
    `prefetchCount` INTEGER NOT NULL DEFAULT 10,
    `messageTtl` INTEGER NOT NULL DEFAULT 86400000,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdById` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

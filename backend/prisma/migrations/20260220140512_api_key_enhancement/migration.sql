-- AlterTable
ALTER TABLE `ApiKey` ADD COLUMN `isGlobal` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `keyType` VARCHAR(191) NOT NULL DEFAULT 'random';

-- CreateIndex
CREATE INDEX `ApiKey_teamId_isGlobal_idx` ON `ApiKey`(`teamId`, `isGlobal`);

-- RenameIndex
ALTER TABLE `ApiKey` RENAME INDEX `ApiKey_workflowId_fkey` TO `ApiKey_workflowId_idx`;

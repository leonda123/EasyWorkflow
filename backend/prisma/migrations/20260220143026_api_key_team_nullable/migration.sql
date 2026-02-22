-- DropForeignKey
ALTER TABLE `ApiKey` DROP FOREIGN KEY `ApiKey_teamId_fkey`;

-- AlterTable
ALTER TABLE `ApiKey` MODIFY `teamId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `ApiKey` ADD CONSTRAINT `ApiKey_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

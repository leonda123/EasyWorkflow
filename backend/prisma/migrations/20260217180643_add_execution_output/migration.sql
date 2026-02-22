-- AlterTable
ALTER TABLE `Execution` ADD COLUMN `outputData` JSON NULL;

-- AlterTable
ALTER TABLE `ExecutionStep` ADD COLUMN `inputData` JSON NULL;

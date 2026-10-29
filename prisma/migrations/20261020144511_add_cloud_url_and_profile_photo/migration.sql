-- AlterTable
ALTER TABLE `Application` ADD COLUMN `photoUrl` VARCHAR(512) NULL,
                        ADD COLUMN `photoPublicId` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `StagedDocument` ADD COLUMN `cloudUrl` VARCHAR(512) NULL;

-- AlterTable
ALTER TABLE `ApplicationDocument` ADD COLUMN `cloudUrl` VARCHAR(512) NULL;

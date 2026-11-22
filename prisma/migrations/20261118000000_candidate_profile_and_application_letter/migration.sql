-- DropForeignKey
ALTER TABLE `StagedDocument` DROP FOREIGN KEY `StagedDocument_candidateId_fkey`;

-- DropForeignKey
ALTER TABLE `StagedDocument` DROP FOREIGN KEY `StagedDocument_jobDocumentRequirementId_fkey`;

-- DropForeignKey
ALTER TABLE `JobDocumentRequirement` DROP FOREIGN KEY `JobDocumentRequirement_jobId_fkey`;

-- DropForeignKey
ALTER TABLE `JobDocumentRequirement` DROP FOREIGN KEY `JobDocumentRequirement_documentTypeId_fkey`;

-- DropForeignKey
ALTER TABLE `ApplicationDocument` DROP FOREIGN KEY `ApplicationDocument_jobDocumentRequirementId_fkey`;

-- DropIndex
DROP INDEX `StagedDocument_candidateId_jobId_jobDocumentRequirementId_key` ON `StagedDocument`;

-- DropIndex
DROP INDEX `ApplicationDocument_jobDocumentRequirementId_idx` ON `ApplicationDocument`;

-- AlterTable
ALTER TABLE `Job` ADD COLUMN `category` ENUM('GENERAL', 'MEDICINE', 'IT', 'BUSINESS') NOT NULL DEFAULT 'GENERAL';

-- AlterTable
ALTER TABLE `StagedDocument` DROP COLUMN `jobDocumentRequirementId`,
    ADD COLUMN `documentKey` VARCHAR(100) NOT NULL;

-- AlterTable
ALTER TABLE `ApplicationDocument` DROP COLUMN `jobDocumentRequirementId`,
    ADD COLUMN `documentKey` VARCHAR(100) NULL,
    MODIFY `requirementKey` VARCHAR(100) NULL;

-- DropTable
DROP TABLE `DocumentType`;

-- DropTable
DROP TABLE `JobDocumentRequirement`;

-- CreateTable
CREATE TABLE `CandidateProfile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `educationLevel` ENUM('NONE', 'PRIMARY', 'SECONDARY', 'CERTIFICATE', 'DIPLOMA', 'BACHELOR', 'MASTER', 'DOCTORATE') NOT NULL,
    `birthYear` INTEGER NOT NULL,
    `birthMonth` INTEGER NOT NULL,
    `physicalAddress` VARCHAR(500) NOT NULL,
    `computerLiteracy` ENUM('BASIC', 'INTERMEDIATE', 'ADVANCED') NOT NULL,
    `languages` VARCHAR(500) NOT NULL,
    `category` ENUM('GENERAL', 'MEDICINE', 'IT', 'BUSINESS') NOT NULL DEFAULT 'GENERAL',
    `photoUrl` VARCHAR(512) NULL,
    `photoPublicId` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CandidateProfile_userId_key`(`userId`),
    INDEX `CandidateProfile_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CandidateDocument` (
    `id` VARCHAR(191) NOT NULL,
    `profileId` VARCHAR(191) NOT NULL,
    `documentKey` VARCHAR(100) NOT NULL,
    `storageKey` VARCHAR(255) NOT NULL,
    `cloudUrl` VARCHAR(512) NULL,
    `originalFileName` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CandidateDocument_storageKey_key`(`storageKey`),
    INDEX `CandidateDocument_profileId_idx`(`profileId`),
    UNIQUE INDEX `CandidateDocument_profileId_documentKey_key`(`profileId`, `documentKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `StagedDocument_candidateId_jobId_documentKey_key` ON `StagedDocument`(`candidateId`, `jobId`, `documentKey`);

-- CreateIndex
CREATE INDEX `ApplicationDocument_documentKey_idx` ON `ApplicationDocument`(`documentKey`);

-- AddForeignKey
ALTER TABLE `CandidateProfile` ADD CONSTRAINT `CandidateProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateDocument` ADD CONSTRAINT `CandidateDocument_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `CandidateProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StagedDocument` ADD CONSTRAINT `StagedDocument_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `CandidateProfile` ADD COLUMN `headline` VARCHAR(160) NULL,
    ADD COLUMN `location` VARCHAR(160) NULL,
    ADD COLUMN `phone` VARCHAR(40) NULL;

-- CreateTable
CREATE TABLE `CandidateEducation` (
    `id` VARCHAR(191) NOT NULL,
    `profileId` VARCHAR(191) NOT NULL,
    `qualification` VARCHAR(160) NOT NULL,
    `institution` VARCHAR(160) NOT NULL,
    `fieldOfStudy` VARCHAR(160) NULL,
    `startDate` DATE NULL,
    `endDate` DATE NULL,
    `grade` VARCHAR(40) NULL,

    INDEX `CandidateEducation_profileId_startDate_idx`(`profileId`, `startDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CandidateEmployment` (
    `id` VARCHAR(191) NOT NULL,
    `profileId` VARCHAR(191) NOT NULL,
    `jobTitle` VARCHAR(160) NOT NULL,
    `organization` VARCHAR(160) NOT NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NULL,
    `current` BOOLEAN NOT NULL DEFAULT false,
    `description` TEXT NULL,

    INDEX `CandidateEmployment_profileId_startDate_idx`(`profileId`, `startDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CandidateSkill` (
    `id` VARCHAR(191) NOT NULL,
    `profileId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(80) NOT NULL,

    UNIQUE INDEX `CandidateSkill_profileId_name_key`(`profileId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CandidateCertification` (
    `id` VARCHAR(191) NOT NULL,
    `profileId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `issuer` VARCHAR(160) NOT NULL,
    `registrationNumber` VARCHAR(120) NULL,
    `issueDate` DATE NULL,
    `expiryDate` DATE NULL,

    INDEX `CandidateCertification_profileId_issueDate_idx`(`profileId`, `issueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CandidateEducation` ADD CONSTRAINT `CandidateEducation_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `CandidateProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateEmployment` ADD CONSTRAINT `CandidateEmployment_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `CandidateProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateSkill` ADD CONSTRAINT `CandidateSkill_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `CandidateProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateCertification` ADD CONSTRAINT `CandidateCertification_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `CandidateProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

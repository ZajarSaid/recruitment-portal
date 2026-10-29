-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('CANDIDATE', 'RECRUITER', 'ADMIN') NOT NULL DEFAULT 'CANDIDATE',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_role_idx`(`role`),
    INDEX `User_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Job` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `department` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `qualifications` TEXT NOT NULL,
    `opensAt` DATETIME(3) NOT NULL,
    `closesAt` DATETIME(3) NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'CLOSED') NOT NULL DEFAULT 'DRAFT',
    `createdById` VARCHAR(191) NOT NULL,
    `recruiterId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Job_status_closesAt_idx`(`status`, `closesAt`),
    INDEX `Job_createdById_idx`(`createdById`),
    INDEX `Job_recruiterId_idx`(`recruiterId`),
    INDEX `Job_department_idx`(`department`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Application` (
    `id` VARCHAR(191) NOT NULL,
    `candidateId` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `resumeSummary` TEXT NOT NULL,
    `status` ENUM('SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'REJECTED') NOT NULL DEFAULT 'SUBMITTED',
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `requirementSnapshot` JSON NULL,

    INDEX `Application_jobId_idx`(`jobId`),
    INDEX `Application_candidateId_idx`(`candidateId`),
    INDEX `Application_status_idx`(`status`),
    UNIQUE INDEX `Application_candidateId_jobId_key`(`candidateId`, `jobId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApplicationEvaluation` (
    `id` VARCHAR(191) NOT NULL,
    `applicationId` VARCHAR(191) NOT NULL,
    `score` INTEGER NOT NULL,
    `method` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,
    `evaluatedById` VARCHAR(191) NULL,
    `evaluatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ApplicationEvaluation_applicationId_key`(`applicationId`),
    INDEX `ApplicationEvaluation_evaluatedById_idx`(`evaluatedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StagedDocument` (
    `id` VARCHAR(191) NOT NULL,
    `candidateId` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `jobDocumentRequirementId` VARCHAR(191) NOT NULL,
    `storageKey` VARCHAR(255) NOT NULL,
    `originalFileName` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StagedDocument_storageKey_key`(`storageKey`),
    INDEX `StagedDocument_candidateId_jobId_idx`(`candidateId`, `jobId`),
    UNIQUE INDEX `StagedDocument_candidateId_jobId_jobDocumentRequirementId_key`(`candidateId`, `jobId`, `jobDocumentRequirementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApplicationStatusHistory` (
    `id` VARCHAR(191) NOT NULL,
    `applicationId` VARCHAR(191) NOT NULL,
    `fromStatus` ENUM('SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'REJECTED') NULL,
    `toStatus` ENUM('SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'REJECTED') NOT NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ApplicationStatusHistory_applicationId_createdAt_idx`(`applicationId`, `createdAt`),
    INDEX `ApplicationStatusHistory_actorId_idx`(`actorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PasswordResetToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PasswordResetToken_tokenHash_key`(`tokenHash`),
    INDEX `PasswordResetToken_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentType` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DocumentType_name_key`(`name`),
    INDEX `DocumentType_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JobDocumentRequirement` (
    `id` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `documentTypeId` VARCHAR(191) NULL,
    `customName` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `requirementStatus` ENUM('REQUIRED', 'OPTIONAL') NOT NULL DEFAULT 'REQUIRED',
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `JobDocumentRequirement_jobId_displayOrder_idx`(`jobId`, `displayOrder`),
    INDEX `JobDocumentRequirement_documentTypeId_idx`(`documentTypeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApplicationDocument` (
    `id` VARCHAR(191) NOT NULL,
    `applicationId` VARCHAR(191) NOT NULL,
    `jobDocumentRequirementId` VARCHAR(191) NULL,
    `requirementKey` VARCHAR(191) NULL,
    `storageKey` VARCHAR(255) NOT NULL,
    `originalFileName` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `reviewStatus` ENUM('PENDING', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `reviewComment` TEXT NULL,
    `reviewedById` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ApplicationDocument_storageKey_key`(`storageKey`),
    INDEX `ApplicationDocument_applicationId_idx`(`applicationId`),
    INDEX `ApplicationDocument_jobDocumentRequirementId_idx`(`jobDocumentRequirementId`),
    INDEX `ApplicationDocument_reviewedById_idx`(`reviewedById`),
    INDEX `ApplicationDocument_reviewStatus_idx`(`reviewStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_recruiterId_fkey` FOREIGN KEY (`recruiterId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Application` ADD CONSTRAINT `Application_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Application` ADD CONSTRAINT `Application_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `Job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApplicationEvaluation` ADD CONSTRAINT `ApplicationEvaluation_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `Application`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApplicationEvaluation` ADD CONSTRAINT `ApplicationEvaluation_evaluatedById_fkey` FOREIGN KEY (`evaluatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StagedDocument` ADD CONSTRAINT `StagedDocument_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StagedDocument` ADD CONSTRAINT `StagedDocument_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `Job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StagedDocument` ADD CONSTRAINT `StagedDocument_jobDocumentRequirementId_fkey` FOREIGN KEY (`jobDocumentRequirementId`) REFERENCES `JobDocumentRequirement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApplicationStatusHistory` ADD CONSTRAINT `ApplicationStatusHistory_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `Application`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApplicationStatusHistory` ADD CONSTRAINT `ApplicationStatusHistory_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PasswordResetToken` ADD CONSTRAINT `PasswordResetToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JobDocumentRequirement` ADD CONSTRAINT `JobDocumentRequirement_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `Job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JobDocumentRequirement` ADD CONSTRAINT `JobDocumentRequirement_documentTypeId_fkey` FOREIGN KEY (`documentTypeId`) REFERENCES `DocumentType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApplicationDocument` ADD CONSTRAINT `ApplicationDocument_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `Application`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApplicationDocument` ADD CONSTRAINT `ApplicationDocument_jobDocumentRequirementId_fkey` FOREIGN KEY (`jobDocumentRequirementId`) REFERENCES `JobDocumentRequirement`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApplicationDocument` ADD CONSTRAINT `ApplicationDocument_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

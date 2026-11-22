ALTER TABLE `CandidateProfile`
  MODIFY `educationLevel` ENUM('NONE','PRIMARY','SECONDARY','CERTIFICATE','DIPLOMA','BACHELOR','MASTER','DOCTORATE') NULL,
  MODIFY `birthYear` INTEGER NULL,
  MODIFY `birthMonth` INTEGER NULL,
  MODIFY `physicalAddress` VARCHAR(500) NULL,
  MODIFY `computerLiteracy` ENUM('BASIC','INTERMEDIATE','ADVANCED') NULL,
  MODIFY `languages` VARCHAR(500) NULL;

CREATE TABLE `AdminSignInChallenge` (
  `id` VARCHAR(64) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `codeHash` CHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `accountVersion` DATETIME(3) NOT NULL,
  UNIQUE INDEX `AdminSignInChallenge_userId_key` (`userId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `AdminSignInChallenge_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `UserSession` (
  `tokenHash` CHAR(64) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `lastSeenAt` DATETIME(3) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`tokenHash`),
  INDEX `UserSession_userId_expiresAt_idx` (`userId`, `expiresAt`),
  CONSTRAINT `UserSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

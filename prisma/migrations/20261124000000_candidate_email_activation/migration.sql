ALTER TABLE `User`
  ADD COLUMN `activationTokenHash` CHAR(64) NULL,
  ADD COLUMN `activationExpiresAt` DATETIME(3) NULL,
  ADD UNIQUE INDEX `User_activationTokenHash_key` (`activationTokenHash`);

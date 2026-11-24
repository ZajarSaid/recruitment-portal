-- Keep the most recently used session for each account. Break ties by token hash.
DELETE older
FROM `UserSession` AS older
JOIN `UserSession` AS newer ON newer.`userId` = older.`userId`
  AND (
    newer.`lastSeenAt` > older.`lastSeenAt`
    OR (newer.`lastSeenAt` = older.`lastSeenAt` AND newer.`tokenHash` > older.`tokenHash`)
  );

CREATE UNIQUE INDEX `UserSession_userId_key` ON `UserSession`(`userId`);

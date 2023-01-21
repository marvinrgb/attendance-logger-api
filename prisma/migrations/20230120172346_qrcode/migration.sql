-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "birth" DATETIME NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'schueler',
    "join" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leave" DATETIME NOT NULL DEFAULT '2030-01-01 00:00:00 +00:00',
    "qrcode" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_User" ("birth", "first_name", "id", "join", "last_name", "leave", "type") SELECT "birth", "first_name", "id", "join", "last_name", "leave", "type" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

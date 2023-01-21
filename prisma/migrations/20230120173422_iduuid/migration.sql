/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `qrcode` on the `User` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "birth" DATETIME NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'schueler',
    "join" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leave" DATETIME NOT NULL DEFAULT '2030-01-01 00:00:00 +00:00'
);
INSERT INTO "new_User" ("birth", "first_name", "id", "join", "last_name", "leave", "type") SELECT "birth", "first_name", "id", "join", "last_name", "leave", "type" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

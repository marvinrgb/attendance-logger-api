-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "birth" DATETIME NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'schueler'
);
INSERT INTO "new_User" ("birth", "first_name", "id", "last_name") SELECT "birth", "first_name", "id", "last_name" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

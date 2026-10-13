/*
  Warnings:

  - Made the column `email` on table `ClientTicket` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ClientTicket" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store" TEXT NOT NULL,
    "storeDomain" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "ticketDescription" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ClientTicket" ("createdAt", "email", "id", "priority", "state", "store", "storeDomain", "subject", "ticketDescription") SELECT "createdAt", "email", "id", "priority", "state", "store", "storeDomain", "subject", "ticketDescription" FROM "ClientTicket";
DROP TABLE "ClientTicket";
ALTER TABLE "new_ClientTicket" RENAME TO "ClientTicket";
CREATE INDEX "ClientTicket_storeDomain_idx" ON "ClientTicket"("storeDomain");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

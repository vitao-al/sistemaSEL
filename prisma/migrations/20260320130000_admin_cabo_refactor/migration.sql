-- Refatoração de modelo: User -> Admin (map), inclusão de CaboEleitoral e vínculo de Eleitor ao cabo.

CREATE TABLE IF NOT EXISTS "CaboEleitoral" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "zona" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "senha" TEXT NOT NULL,
  "avatar" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CaboEleitoral_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CaboEleitoral_email_key" ON "CaboEleitoral"("email");
CREATE INDEX IF NOT EXISTS "CaboEleitoral_adminId_idx" ON "CaboEleitoral"("adminId");

ALTER TABLE "CaboEleitoral"
  ADD CONSTRAINT "CaboEleitoral_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "CaboEleitoral" ("id", "adminId", "nome", "titulo", "zona", "email", "senha", "avatar", "createdAt", "updatedAt")
SELECT
  CONCAT('cabo-', u."id"),
  u."id",
  u."nome",
  'PENDENTE',
  'PENDENTE',
  CONCAT('cabo+', u."email"),
  u."senha",
  u."avatar",
  u."createdAt",
  CURRENT_TIMESTAMP
FROM "User" u
WHERE NOT EXISTS (
  SELECT 1 FROM "CaboEleitoral" c WHERE c."adminId" = u."id"
);

UPDATE "Eleitor"
SET "userId" = CONCAT('cabo-', "userId")
WHERE EXISTS (
  SELECT 1 FROM "User" u WHERE u."id" = "Eleitor"."userId"
);

ALTER TABLE "Eleitor" DROP CONSTRAINT IF EXISTS "Eleitor_userId_fkey";

ALTER TABLE "Eleitor"
  ADD CONSTRAINT "Eleitor_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "CaboEleitoral"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

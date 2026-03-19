-- Migration SQL: alterações estruturais no banco de dados.

-- AddColumn
ALTER TABLE "Eleitor" ADD COLUMN "userId" TEXT;

-- Backfill existing rows with the first available user
UPDATE "Eleitor"
SET "userId" = (
  SELECT "id"
  FROM "User"
  ORDER BY "createdAt" ASC
  LIMIT 1
)
WHERE "userId" IS NULL;

-- Ensure no orphan rows before making column required
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Eleitor" WHERE "userId" IS NULL) THEN
    RAISE EXCEPTION 'Não foi possível definir userId para todos os eleitores. Crie ao menos um usuário antes de aplicar esta migration.';
  END IF;
END $$;

-- Set required and relation
ALTER TABLE "Eleitor" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Eleitor"
  ADD CONSTRAINT "Eleitor_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Index
CREATE INDEX "Eleitor_userId_idx" ON "Eleitor"("userId");

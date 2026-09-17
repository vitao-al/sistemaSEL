/*
  Warnings:

  - A unique constraint covering the columns `[cpf]` on the table `Eleitor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tituloEleitor]` on the table `Eleitor` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "CaboEleitoral" ADD COLUMN     "liderId" TEXT;

-- CreateTable
CREATE TABLE "Lider" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "cargo" TEXT,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Familia" (
    "id" TEXT NOT NULL,
    "caboEleitoralId" TEXT NOT NULL,
    "nome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Familia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamiliaMembro" (
    "id" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "eleitorId" TEXT NOT NULL,
    "grauParentesco" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamiliaMembro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lider_email_key" ON "Lider"("email");

-- CreateIndex
CREATE INDEX "Lider_adminId_idx" ON "Lider"("adminId");

-- CreateIndex
CREATE INDEX "Familia_caboEleitoralId_idx" ON "Familia"("caboEleitoralId");

-- CreateIndex
CREATE INDEX "FamiliaMembro_familiaId_idx" ON "FamiliaMembro"("familiaId");

-- CreateIndex
CREATE INDEX "FamiliaMembro_eleitorId_idx" ON "FamiliaMembro"("eleitorId");

-- CreateIndex
CREATE UNIQUE INDEX "FamiliaMembro_familiaId_eleitorId_key" ON "FamiliaMembro"("familiaId", "eleitorId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_email_idx" ON "PasswordResetToken"("email");

-- CreateIndex
CREATE INDEX "CaboEleitoral_liderId_idx" ON "CaboEleitoral"("liderId");

-- CreateIndex
CREATE UNIQUE INDEX "Eleitor_cpf_key" ON "Eleitor"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Eleitor_tituloEleitor_key" ON "Eleitor"("tituloEleitor");

-- AddForeignKey
ALTER TABLE "CaboEleitoral" ADD CONSTRAINT "CaboEleitoral_liderId_fkey" FOREIGN KEY ("liderId") REFERENCES "Lider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lider" ADD CONSTRAINT "Lider_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Familia" ADD CONSTRAINT "Familia_caboEleitoralId_fkey" FOREIGN KEY ("caboEleitoralId") REFERENCES "CaboEleitoral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamiliaMembro" ADD CONSTRAINT "FamiliaMembro_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "Familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamiliaMembro" ADD CONSTRAINT "FamiliaMembro_eleitorId_fkey" FOREIGN KEY ("eleitorId") REFERENCES "Eleitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

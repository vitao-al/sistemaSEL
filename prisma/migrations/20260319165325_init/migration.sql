-- Migration SQL: alterações estruturais no banco de dados.

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "avatar" TEXT,
    "cargo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Eleitor" (
    "id" TEXT NOT NULL,
    "nome" TEXT,
    "cpf" TEXT,
    "tituloEleitor" TEXT,
    "sessao" TEXT,
    "zona" TEXT,
    "localVotacao" TEXT,
    "promessa" TEXT,
    "promessaConcluida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Eleitor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Eleitor_createdAt_idx" ON "Eleitor"("createdAt");

-- CreateIndex
CREATE INDEX "Eleitor_zona_idx" ON "Eleitor"("zona");

-- CreateIndex
CREATE INDEX "Eleitor_promessaConcluida_idx" ON "Eleitor"("promessaConcluida");

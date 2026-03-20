// Seed inicial para ambiente de desenvolvimento.
// Cria admin padrão, cabos eleitorais e eleitores vinculados ao cabo.

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@sistemasel.com' },
    update: {
      nome: 'Administrador Geral',
      senha: '123456',
      cargo: 'Admin',
      avatar: 'leunamprofile.png',
    },
    create: {
      nome: 'Administrador Geral',
      email: 'admin@sistemasel.com',
      senha: '123456',
      cargo: 'Admin',
      avatar: 'leunamprofile.png',
    },
  });

  const cabo = await prisma.caboEleitoral.upsert({
    where: { email: 'cabo1@sistemasel.com' },
    update: {
      nome: 'Carlos Andrade',
      titulo: '111122223333',
      zona: '01',
      senha: '123456',
    },
    create: {
      adminId: admin.id,
      nome: 'Carlos Andrade',
      titulo: '111122223333',
      zona: '01',
      email: 'cabo1@sistemasel.com',
      senha: '123456',
    },
  });

  const existing = await prisma.eleitor.count();
  if (existing === 0) {
    await prisma.eleitor.createMany({
      data: [
        {
          caboEleitoralId: cabo.id,
          nome: 'José Silva',
          cpf: '12345678900',
          tituloEleitor: '111122223333',
          sessao: '0001',
          zona: '01',
          localVotacao: 'Escola A',
          promessa: 'Ajuda na saúde',
          promessaConcluida: false,
        },
        {
          caboEleitoralId: cabo.id,
          nome: 'Maria Santos',
          cpf: '98765432100',
          tituloEleitor: '444455556666',
          sessao: '0002',
          zona: '02',
          localVotacao: 'Centro Comunitário',
          promessa: 'Melhor infraestrutura',
          promessaConcluida: true,
        },
      ],
    });
  }

  console.log('Seed executado com sucesso.');
}

main()
  .catch((error) => {
    console.error('Erro ao executar seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

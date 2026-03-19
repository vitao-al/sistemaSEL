// Seed inicial para ambiente de desenvolvimento.
// Garante usuário base e um conjunto mínimo de eleitores vinculados a ele.

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'leunam@hotmal.com' },
    update: {
      nome: 'Manuel Almeida Pinto',
      senha: '123456',
      cargo: 'Vereador',
      avatar: 'leunamprofile.png',
    },
    create: {
      nome: 'Manuel Almeida Pinto',
      email: 'leunam@hotmal.com',
      senha: '123456',
      cargo: 'Vereador',
      avatar: 'leunamprofile.png',
    },
  });

  const existing = await prisma.eleitor.count();
  if (existing === 0) {
    await prisma.eleitor.createMany({
      data: [
        {
          userId: user.id,
          nome: 'José Silva',
          cpf: '123.456.789-00',
          tituloEleitor: '111122223333',
          sessao: '0001',
          zona: '01',
          localVotacao: 'Escola A',
          promessa: 'Ajuda na saúde',
          promessaConcluida: false,
        },
        {
          userId: user.id,
          nome: 'Maria Santos',
          cpf: '987.654.321-00',
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

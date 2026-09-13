import { NextResponse } from 'next/server';

const sampleReport = {
  generatedAt: new Date().toISOString(),
  admins: [
    {
      admin: { id: 'admin1', nome: 'Admin Central' },
      cabos: [
        {
          cabo: {
            id: 'cabo1',
            nome: 'João da Silva',
            zona: '01',
            titulo: '1234567',
            email: 'joao@example.com',
          },
          eleitores: [
            {
              id: 'e1',
              nome: 'Maria Oliveira',
              cpf: '111.111.111-11',
              tituloEleitor: '7654321',
              zona: '01',
              sessao: '001',
              telefone: '(11) 99999-0000',
              localVotacao: 'Escola Municipal A',
              promessa: 'Visitar bairro X',
              promessaConcluida: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              id: 'e2',
              nome: 'Pedro Santos',
              cpf: '222.222.222-22',
              tituloEleitor: '9876543',
              zona: '01',
              sessao: '002',
              telefone: '(11) 98888-0000',
              localVotacao: 'Centro Comunitário B',
              promessa: null,
              promessaConcluida: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        },
      ],
    },
    {
      admin: { id: 'admin2', nome: 'Admin Regional' },
      cabos: [
        {
          cabo: {
            id: 'cabo2',
            nome: 'Ana Pereira',
            zona: '02',
            titulo: '2233445',
            email: 'ana@example.com',
          },
          eleitores: [
            {
              id: 'e3',
              nome: 'Carlos Mendes',
              cpf: '333.333.333-33',
              tituloEleitor: '1122334',
              zona: '02',
              sessao: '010',
              telefone: '(21) 98877-0000',
              localVotacao: 'Quadra C',
              promessa: 'Agendar reunião',
              promessaConcluida: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        },
      ],
    },
  ],
  metrics: {
    totalAdmins: 2,
    totalCabos: 2,
    totalEleitores: 3,
    totalPromessas: 2,
    totalPromessasConcluidas: 1,
    totalPromessasPendentes: 1,
  },
};

export function GET() {
  return NextResponse.json({ success: true, data: sampleReport });
}

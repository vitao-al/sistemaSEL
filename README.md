# SistemaSEL

Aplicação web para gestão de eleitores, com autenticação, dashboard analítico, CRUD completo e filtros de consulta. O projeto utiliza Next.js (App Router), TypeScript, Prisma e PostgreSQL, com estrutura preparada para execução local e deploy em produção.

## Tecnologias usadas

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-111111?style=for-the-badge&logo=react&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)

## Visão geral

- Gestão centralizada de eleitores com pesquisa, filtros e paginação
- Dashboard com indicadores e visualizações de dados
- Fluxo de autenticação e gerenciamento de perfil de usuário
- API interna no próprio Next.js com camadas de serviço e acesso a dados

## Stack técnica

| Camada | Tecnologias |
| --- | --- |
| Frontend | Next.js 14, React 18, TypeScript, CSS Modules |
| Estado e formulários | Zustand, React Hook Form, Zod |
| Visualização | Recharts, Lucide React |
| Backend (API) | Route Handlers do Next.js (App Router) |
| Persistência | Prisma ORM + PostgreSQL |
| Qualidade | Vitest |

## Arquitetura

O projeto segue organização por responsabilidade:

- `src/app`: páginas e rotas da aplicação
- `src/app/api`: endpoints HTTP da aplicação
- `src/lib/database`: adaptadores, serviços e integração com banco
- `src/lib/data.ts`: fachada de dados consumida pela interface
- `src/components`: componentes reutilizáveis de layout e UI
- `src/store`: estado global no cliente
- `prisma`: schema, migrations e seed

## Pré-requisitos

- Node.js 18+
- npm 9+
- PostgreSQL em execução

## Configuração local

1. Instalar dependências:

```bash
npm install
```

2. Criar o arquivo `.env` na raiz com as variáveis:

```env
DATABASE_PROVIDER=postgres
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
DATABASE_FALLBACK_TO_MEMORY=false
```

3. Gerar o Prisma Client:

```bash
npm run prisma:generate
```

4. Aplicar migrations:

```bash
npm run prisma:migrate
```

5. Popular dados iniciais:

```bash
npm run prisma:seed
```

6. Iniciar ambiente de desenvolvimento:

```bash
npm run dev
```

Aplicação disponível em `http://localhost:3000`.

## Scripts úteis

```bash
npm run dev            # Desenvolvimento
npm run build          # Build de produção
npm run start          # Executar build
npm run lint           # Lint
npm run test           # Testes (Vitest)
npm run test:watch     # Testes em watch
npm run prisma:studio  # Prisma Studio
```

## Credencial demo (seed)

- Email: `demo@gmail.com`
- Senha: `123456`
- Cargo: `Vereador`

## Deploy

### Vercel

- Framework preset: `Next.js`
- Build command: `npm run build`
- Variáveis de ambiente:
  - `DATABASE_PROVIDER=postgres`
  - `DATABASE_URL=<url-do-postgres>`
  - `DATABASE_FALLBACK_TO_MEMORY=false`

### Render

- Runtime: `Node`
- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Health check: `/api/health`
- Variáveis de ambiente:
  - `DATABASE_PROVIDER=postgres`
  - `DATABASE_URL=<url-do-postgres>`
  - `DATABASE_FALLBACK_TO_MEMORY=false`

## Operação e observações

- O projeto utiliza `postinstall` para executar `prisma generate` automaticamente.
- Para produção, manter `DATABASE_FALLBACK_TO_MEMORY=false`.
- Em caso de inconsistência de tipos do Next.js, limpar cache local (`.next`) e executar verificação de tipos novamente.

## Roadmap técnico sugerido

- Hash de senha com bcrypt
- Sessão segura/JWT
- Exportação de relatórios (CSV/Excel)
- Alertas de promessas pendentes

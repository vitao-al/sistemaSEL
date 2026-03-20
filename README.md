# SistemaSEL

Aplicação web para gestão de campanhas eleitorais, com hierarquia **Admin → Cabo Eleitoral → Eleitor**, autenticação JWT, dashboard analítico, relatórios exportáveis (PDF/XLS/CSV) e interface responsiva mobile-first. Construída com Next.js 14 App Router, TypeScript, Prisma e PostgreSQL (Neon).

## Tecnologias

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-111111?style=for-the-badge&logo=react&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)

## Visão geral

- Hierarquia de papéis: **Admin** gerencia **Cabos Eleitorais**, cada Cabo gerencia seus **Eleitores**
- Dashboard com KPIs, gráficos e painel do último eleitor cadastrado (com cabo e horário)
- Relatórios exportáveis em **PDF** (A4 retrato, estruturado por admin/cabo), **XLS** e **CSV**
- Validação de unicidade de CPF e Título Eleitoral no frontend e no servidor
- Autenticação via **JWT assinado** (HS256) com expiração e verificação de issuer/audience
- Adapter resiliente com fallback em memória para indisponibilidade do banco

## Stack técnica

| Camada | Tecnologias |
| --- | --- |
| Frontend | Next.js 14, React 18, TypeScript, CSS Modules |
| Estado e formulários | Zustand, React Hook Form, Zod |
| Visualização | Recharts, Lucide React |
| Exportação | jsPDF, jspdf-autotable |
| Autenticação | jsonwebtoken (HS256 JWT) |
| Backend (API) | Route Handlers do Next.js (App Router) |
| Persistência | Prisma ORM + PostgreSQL (Neon) |
| Qualidade | Vitest |

## Arquitetura

```
src/
├── app/                    # Páginas e route handlers
│   ├── api/                # Endpoints HTTP (auth, eleitores, cabos, dashboard)
│   ├── dashboard/          # Página de dashboard
│   ├── eleitores/          # Gestão de eleitores
│   ├── cabos/              # Gestão de cabos e relatórios
│   └── login/              # Autenticação
├── lib/
│   ├── auth/               # JWT (jwt.ts) e sessão (session.ts)
│   ├── database/           # Adapter, services, postgres-adapter, tipos
│   └── data.ts             # Fachada de dados do cliente
├── components/             # Layout e componentes de UI reutilizáveis
├── store/                  # Estado global (Zustand)
└── types/                  # Contratos TypeScript compartilhados
prisma/
├── schema.prisma           # Modelos Admin, CaboEleitoral, Eleitor
├── migrations/             # Histórico de migrações
└── seed.js                 # Dados iniciais
```

## Pré-requisitos

- Node.js 18+
- npm 9+
- PostgreSQL (local ou [Neon](https://neon.tech))

## Configuração local

**1. Instalar dependências:**

```bash
npm install
```

**2. Criar o arquivo `.env` na raiz:**

```env
DATABASE_PROVIDER=postgres
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
DATABASE_FALLBACK_TO_MEMORY=false
NEXT_PUBLIC_APP_URL="http://localhost:3000"
JWT_SECRET="seu-segredo-aqui-minimo-32-caracteres"
```

> Para gerar um `JWT_SECRET` seguro:
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

**3. Aplicar migrations e gerar o cliente Prisma:**

```bash
npm run prisma:migrate
```

**4. Popular dados iniciais:**

```bash
npm run prisma:seed
```

**5. Iniciar desenvolvimento:**

```bash
npm run dev
```

Aplicação disponível em `http://localhost:3000`.

## Scripts

```bash
npm run dev              # Servidor de desenvolvimento
npm run build            # Build de produção
npm run start            # Executar build de produção
npm run lint             # ESLint
npm run test             # Testes unitários (Vitest)
npm run test:watch       # Testes em modo watch
npm run prisma:generate  # Gerar Prisma Client
npm run prisma:migrate   # Aplicar migrations
npm run prisma:seed      # Popular dados iniciais
npm run prisma:studio    # Interface visual do banco (Prisma Studio)
```

## Credenciais demo (após seed)

| Papel | Email | Senha |
| --- | --- | --- |
| Admin | `admin@sistemasel.com` | `123456` |
| Cabo Eleitoral | `cabo@sistemasel.com` | `123456` |

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | Sim | Connection string PostgreSQL |
| `DATABASE_PROVIDER` | Sim | `postgres` ou `memory` |
| `DATABASE_FALLBACK_TO_MEMORY` | Não | `true` permite fallback em memória se o banco estiver indisponível |
| `NEXT_PUBLIC_APP_URL` | Sim | URL base da aplicação |
| `JWT_SECRET` | Sim | Segredo para assinatura dos tokens JWT (mínimo 32 caracteres) |

## Observações

- `postinstall` executa `prisma generate` automaticamente após `npm install`.
- `DATABASE_FALLBACK_TO_MEMORY=true` é útil em desenvolvimento com banco instável — **desative em produção**.
- CPF e Título Eleitoral são únicos por eleitor: validados no cliente (blur) e no servidor (409 Conflict).
- Relatórios PDF são gerados em A4 retrato, agrupados por Admin → Cabo → Eleitores.
- Em produção, use `JWT_SECRET` longo (≥ 48 bytes), único por ambiente, e **nunca commite no repositório**.

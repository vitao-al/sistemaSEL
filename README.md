# VotaGestor — Sistema de Gestão de Eleitores

Sistema web em **Next.js 14** com App Router, Prisma e PostgreSQL, preparado para execução local e deploy em plataformas como **Vercel** e **Render**.

---

## 🛠 Stack

| Tecnologia | Uso |
|---|---|
| **Next.js 14** (App Router) | Framework principal |
| **TypeScript** | Tipagem estática |
| **Prisma ORM** | Acesso ao banco e migrations |
| **PostgreSQL** | Persistência principal |
| **CSS Modules** | Estilização (zero Tailwind/Bootstrap) |
| **Recharts** | Gráficos (área, barra, pizza) |
| **Zustand** (+ persist) | Estado global e autenticação |
| **React Hook Form + Zod** | Formulários e validação |
| **date-fns** | Formatação de datas |
| **Lucide React** | Ícones |

---

## 🚀 Como rodar

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env

# 3. Gerar client do Prisma
npm run prisma:generate

# 4. Rodar migrations
npm run prisma:migrate

# 5. Popular dados iniciais
npm run prisma:seed

# 6. Rodar em desenvolvimento
npm run dev

# 7. Acessar
http://localhost:3000
```

---

## 🔐 Credencial inicial do seed

| Email | Senha | Cargo |
|---|---|---|
| leunam@hotmal.com | 123456 | Vereador |

---

## 📁 Estrutura

```
src/
├── app/
│   ├── api/            # Route handlers do backend (auth, users, eleitores, dashboard, health)
│   ├── login/          # Tela de login + recuperação de senha
│   ├── dashboard/      # Dashboard com gráficos e estatísticas
│   ├── eleitores/      # CRUD completo com filtros e paginação
│   └── perfil/         # Perfil do usuário + troca de senha
├── components/
│   ├── layout/         # Sidebar + Header compartilhados
│   └── ui/             # Componentes reutilizáveis
├── lib/
│   ├── database/       # Adaptadores, serviços e tipos de acesso a dados
│   ├── http/           # Cliente HTTP compartilhado do frontend
│   ├── data.ts         # Fachada consumida pelo frontend
│   └── errors.ts       # Padronização de erros da aplicação
├── store/
│   └── auth.ts         # Zustand store de autenticação
├── styles/
│   └── globals.css     # Variáveis CSS globais + reset
└── types/
    └── index.ts        # Interfaces TypeScript

prisma/
├── schema.prisma       # Schema do banco
└── seed.js             # Carga inicial
```

---

## 🧱 Arquitetura de pastas utilizada

O projeto usa uma arquitetura em camadas, comum em apps Next.js com App Router:

- **`src/app`**: camada de apresentação e rotas
- **`src/app/api`**: camada HTTP/backend
- **`src/lib/database`**: camada de acesso a dados e regras de serviço
- **`src/lib/data.ts`**: fachada para o frontend consumir a API sem acoplamento à UI
- **`src/components`**: componentes reutilizáveis e composição visual
- **`src/store`**: estado global do cliente
- **`prisma`**: infraestrutura de banco e schema

Em resumo, é uma mistura de:

- **App Router feature-based** nas páginas
- **Layered architecture** no backend
- **Shared UI components** para reaproveitamento visual

---

## ☁️ Deploy em Vercel ou Render

### Vercel

- Framework preset: `Next.js`
- Build command: `npm run build`
- Output: automático
- Variáveis obrigatórias:
  - `DATABASE_URL`
  - `DATABASE_PROVIDER=postgres`
  - `DATABASE_FALLBACK_TO_MEMORY=false`
  - `NEXT_PUBLIC_APP_URL=https://seu-dominio.vercel.app`

### Render

- Runtime: `Node`
- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Health check path: `/api/health`
- Variáveis obrigatórias:
  - `DATABASE_URL`
  - `DATABASE_PROVIDER=postgres`
  - `DATABASE_FALLBACK_TO_MEMORY=false`
  - `NEXT_PUBLIC_APP_URL=https://seu-app.onrender.com`

### Observações de produção

- O projeto já está com `output: 'standalone'`, facilitando execução em hosts Node.
- O script `postinstall` gera o Prisma Client automaticamente no deploy.
- Em produção, mantenha `DATABASE_FALLBACK_TO_MEMORY=false`.

---

## 🔌 Integração de dados

O frontend consome a API interna por meio de `src/lib/data.ts`, enquanto as regras e persistência ficam desacopladas em `src/lib/database` e `src/app/api`.

---

## 🎨 Telas

1. **Login** — Autenticação com email/senha, modal de recuperação de senha
2. **Dashboard** — 4 cards de stats, gráfico de área (eleitores/mês), pizza (promessas), barras (zonas), último eleitor
3. **Eleitores** — Tabela com busca full-text, filtros por zona e promessa, ordenação, paginação, CRUD completo (ver/editar/excluir)
4. **Perfil** — Editar nome/cargo, trocar senha

---

## 🔧 Próximos passos sugeridos

- [ ] Hash de senha com bcrypt
- [ ] Autenticação JWT ou sessão segura
- [ ] Export de eleitores para CSV/Excel
- [ ] Notificações de promessas vencidas
- [ ] Upload de foto de perfil
- [ ] Dashboard com mapa de zonas eleitorais

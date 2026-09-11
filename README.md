# Expense Tracker

Monorepo for a TypeScript expense tracker: React frontend, Express API, AWS CDK (coming next).

## Structure

```
apps/
  frontend/   # Vite + React + MUI + TanStack Query + Recharts
  backend/    # Express + TypeScript + Prisma + PostgreSQL
```

## Prerequisites

- Node.js 20+
- PostgreSQL 16 (`brew install postgresql@16`)

## Setup

```bash
brew services start postgresql@16
createdb expense_tracker   # once
cp apps/backend/.env.example apps/backend/.env
# edit DATABASE_URL if needed

npm install
npm run db:migrate
```

## Develop

Run API and UI in two terminals:

```bash
npm run dev:backend   # http://localhost:4000
npm run dev:frontend  # http://localhost:5173 (proxies /api → backend)
```

Then open the UI, register an account, add expenses, and check the dashboard charts.

## Frontend routes

| Path | Description |
|---|---|
| `/login` | Sign in |
| `/register` | Create account |
| `/` | Dashboard (totals + charts) |
| `/expenses` | Search, filter, CRUD expenses |

## API (current)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | no | Create account |
| POST | `/api/auth/login` | no | Login |
| POST | `/api/auth/refresh` | no | Rotate tokens |
| POST | `/api/auth/logout` | no | Revoke refresh token |
| GET | `/api/auth/me` | yes | Current user |
| GET/POST | `/api/expenses` | yes | List / create |
| GET/PATCH/DELETE | `/api/expenses/:id` | yes | Read / update / delete |
| GET | `/api/dashboard/summary` | yes | Totals by category/month |

## Infrastructure

AWS CDK lives in [`infra/`](infra/). Deployed stacks:

- VPC + security groups (no NAT)
- RDS PostgreSQL 16
- ACM + Route53 for `app.briefly-learn.com` / `api.briefly-learn.com`
- ECR + ECS Fargate + ALB (HTTPS)

```bash
npm run cdk:deploy
```

ECS services start at `desiredCount=0` until images are pushed.

CI/CD uses GitHub Actions with AWS OIDC (no long-lived keys). Role ARN:

`arn:aws:iam::565393069879:role/GitHubActionsExpenseTracker`

- **CI** runs on every push/PR to `main` (typecheck).
- **Deploy** starts only after CI succeeds on `main` (`workflow_run`), or via manual dispatch.

## Docker

Images are built from the repo root (npm workspaces). Local container runtime is unavailable on this workshop VM; builds will run in GitHub Actions / ECS.

```bash
# Backend (Node + Prisma migrate on start)
docker build -f apps/backend/Dockerfile -t expense-tracker-backend .

# Frontend (Nginx SPA); bake API origin at build time
docker build -f apps/frontend/Dockerfile \
  --build-arg VITE_API_URL=https://api.briefly-learn.com \
  -t expense-tracker-frontend .
```

`docker-compose.yml` is a reference stack (Postgres + both apps) for environments that can run Docker.

## Scripts

| Command | Description |
|---|---|
| `npm run build` | Build backend and frontend |
| `npm run typecheck` | Typecheck both apps |
| `npm run lint` | Lint both apps |
| `npm run db:migrate` | Run Prisma migrations (dev) |
| `npm run db:migrate:deploy -w @expense-tracker/backend` | Apply migrations (prod) |

# Expense Tracker

Monorepo for a TypeScript expense tracker: React frontend, Express API, AWS CDK (coming next).

## Structure

```
apps/
  frontend/   # Vite + React + TypeScript
  backend/    # Express + TypeScript
```

## Prerequisites

- Node.js 20+

## Setup

```bash
npm install
```

## Develop

Run API and UI in two terminals:

```bash
npm run dev:backend   # http://localhost:4000
npm run dev:frontend  # http://localhost:5173 (proxies /api → backend)
```

## Scripts

| Command | Description |
|---|---|
| `npm run build` | Build backend and frontend |
| `npm run typecheck` | Typecheck both apps |
| `npm run lint` | Lint both apps |

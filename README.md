# Image to PDF

A production-oriented foundation for an image-to-PDF web application. This repository currently contains only project structure, tooling, and server security foundations—no user interface, conversion logic, authentication implementation, or database tables.

## Architecture

```text
img-2-pdf/
├── frontend/                  # React client (independently runnable)
├── backend/                   # Express API (independently runnable)
├── package.json               # npm workspaces and shared commands
└── README.md
```

The frontend is responsible for presentation and browser-safe integrations. The backend owns authorization, validation, PDF processing, database access, and storage access. Secrets remain server-side and are supplied exclusively through environment variables.

## Tech stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, Three.js / React Three Fiber, Framer Motion, Lucide React
- Backend: Node.js, Express, TypeScript, Prisma, PostgreSQL
- Security foundation: Helmet, CORS allow-listing, rate limiting, Zod validation, HTTP-only cookie support
- Planned integrations: JWT, Argon2, Supabase Storage, pdf-lib

## Getting started

1. Use Node.js 20.19 or newer.
2. Install all workspaces from the repository root:

   ```bash
   npm install
   ```

3. Copy each workspace’s `.env.example` to `.env` and populate only the variables needed for that workspace. Do not commit `.env` files.

## Commands

Run from the repository root:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start frontend and backend development processes concurrently via npm workspaces |
| `npm run build` | Build every workspace |
| `npm run lint` | Lint every workspace |
| `npm run typecheck` | Type-check every workspace without emitting files |

Workspaces can also run independently:

```bash
npm run dev --workspace frontend
npm run dev --workspace backend
```

## Environment and deployment

`frontend/.env.example` contains only Vite-prefixed, public configuration. `backend/.env.example` documents server-only values such as `DATABASE_URL`, JWT material, cookie settings, and Supabase credentials. Production deployments should provide these values through the host’s secret manager, enforce HTTPS, and set a restrictive `CORS_ORIGIN`.

Prisma is initialized with an intentionally model-free schema. Define models and migrations only when the application’s data requirements are approved.

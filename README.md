# BioTracker

Full-stack health tracker built with:
- React 18 + TypeScript + Vite
- Express 5 + Passport + WebSockets
- MySQL + Drizzle ORM

## Project Structure

```text
backend/
  config/      runtime config, db, vite setup
  contracts/   shared API contracts
  security/    password helpers
  server/      express entrypoint, routes, realtime, static serving
  services/    database/service layer
  types/       local backend type declarations

database/
  drizzle/     generated migrations
  schema.ts    Drizzle schema

frontend/
  assets/      app branding assets
  public/      static public files
  src/
    components/
    hooks/
    lib/
    pages/

scripts/
  build.ts     production build script
```

## Main Commands

```bash
npm run dev
npm run build
npm run start
npm run db:generate
npm run db:push
```

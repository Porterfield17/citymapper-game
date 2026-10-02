# CityMapper

## Local development

```sh
npm install
npm run dev
```

## Live publishing setup

Production deploys automatically when a commit is pushed to the `main` branch on GitHub. The Vercel project is connected to `Porterfield17/citymapper-game` and serves `citymappergame.vercel.app`.

Studio content is stored in Supabase and delivered to players through Supabase Realtime. Clue images are stored in a public-read bucket; only the server-side admin session can upload them. To enable it:

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL editor.
2. Copy `.env.example` to `.env.local` for local development and fill in the Supabase URL, publishable key, server-only secret key, admin name, admin password, and a long random session secret.
3. Add all seven variables to the Vercel project for Production and Preview, then redeploy.
4. Open `/studio` and sign in with the configured admin name and password. Existing content in that browser is imported to Supabase when the Studio first loads; after that, Studio edits publish automatically and connected game clients receive them live.

Keep `SUPABASE_SECRET_KEY`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` server-side only. Do not prefix them with `VITE_` or commit `.env.local`.

If Studio content was previously saved in a different browser, export/copy that content into the browser used for the initial admin sign-in before connecting Supabase; browser-local data is not uploaded from other devices automatically.

## Production build

```sh
npm run build
```

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

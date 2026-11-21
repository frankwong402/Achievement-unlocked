# Achievement Unlocked

A Hackathon Track 2 prototype built with Next.js App Router.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Build production using `npm run build`.

## Project structure

```text
src/
  app/                       # Next.js routing, global CSS, page shell
  features/achievements/
    components/              # Client-side app entry
    data/                    # Mock goal, chapter and task content, XP rules
    lib/                     # Game logic, state persistence and controller
    ui/                      # Presentation templates
```

- `src/app/page.jsx` is the entry page. **No root `index.html` is used.**
- `lib/storage.js` persists goals, task state, XP and Evil UX preferences in LocalStorage, maintaining the legacy key.
- `lib/game-model.js` holds game object factories and pure progression calculations.
- `data/mock-content.js` contains deterministic example content; **real AI API is not yet connected**.
- `lib/controller.js` wires UI actions and mock hidden-achievement evaluation, while `ui/views.js` keeps view markup separate.
- Evil UX is ON by default, and its switch appears **only under Settings**.

## Deployment

The Vercel project is `achievement-unlocked` (production branch `main`).
The profile project reverse-proxies exactly `https://www.frankwong.dev/achievement` to this app.
Because the app is mounted via a cross-project rewrite at a subpath, production Next.js static assets use an absolute `assetPrefix` configured in `next.config.mjs`. This is distinct from the app's public URL.

## Next phase (not implemented)

- `src/app/api/goals/generate/route.js` — AI goal outline generation
- `src/app/api/chapters/generate/route.js` — AI task generation
- `src/app/api/achievements/evaluate/route.js` — semantic hidden achievement evaluation
- Zod schemas and a provider adapter, after the event's API endpoint and contract are confirmed

Do not add API keys to the client bundle or Git. Keep credentials in Vercel environment variables.

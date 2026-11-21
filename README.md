# Achievement Unlocked

Hackathon Track 2 — a Steam-like quest tracker with satirical Evil UX. Built with **Next.js App Router**.

## Project structure

```text
src/
  app/
    page.jsx                            # App UI entry
    globals.css                         # Visual theme
    api/
      goals/generate/route.js           # POST generate goal/chapters
      chapters/generate/route.js        # POST generate chapter tasks
      achievements/evaluate/route.js    # POST semantic hidden judgment
      ai/status/route.js                # GET safe status
  features/achievements/
    components/                         # Client UI
    ui/                                 # Visual templates
    lib/                                # Game state, XP, persistence
    data/                               # Offline Mock tasks
    lib/evil-engine.mjs                 # Satirical Evil UX sequences
  lib/ai/
    provider.mjs                        # DeepSeek via AIHubMix
    prompts.mjs                         # B teammate's prompt ownership
    schema.mjs                          # Stable JSON contract + validators
    http.mjs                            # Errors / input / lightweight throttling
docs/
  API_CONTRACT.md                       # API requests, responses, status codes
test/
  ai-contract.test.mjs                  # Contract and safe-mode tests
```

The root HTML file is gone: Next.js serves the UI through `src/app/page.jsx`. D teammate owns UI; A teammate owns the `app/api` and `lib/ai` boundaries.

## Quick start

```sh
npm install
npm test
npm run dev
```

The production build (`npm run build`) runs tests before `next build`.

## AI setup

Copy variable **names** from `.env.example` into Vercel Production, without exposing real secrets in code:

- `AIHUBMIX_API_KEY` — stored only as a sensitive Vercel environment variable
- `AIHUBMIX_BASE_URL=https://aihubmix.com/v1`
- `AIHUBMIX_MODEL=deepseek-v4-flash` (optional: provider also defaults to this ID)
- `AI_LIVE_ENABLED=true` — **do not enable until** rate limiting, $12 credit controls and end-to-end testing are ready

AI endpoints are present but **disabled by default** to prevent spending real credit unintentionally. `GET /api/ai/status` works without a billed request.

## Current frontend limitations

The frontend still displays clearly labeled Mock data and saves locally under the existing LocalStorage key, including progress and Evil UX toggle settings. **It is not yet connected to the new live API routes.** See `docs/API_CONTRACT.md` for D's integration contract.

`https://www.frankwong.dev/achievement` is reverse-proxied from the profile project. The reverse proxy currently handles the homepage, **not** `/achievement/api/*`. Configure the API path proxy or a permitted API origin before live front-end integration. The Next.js `assetPrefix` remains configured for the standalone project.

## Team responsibilities

- **A (technical lead):** server API, AI provider, schemas, XP rules, deployment.
- **B:** update prompts in `src/lib/ai/prompts.mjs`, keep JSON fields consistent.
- **C:** test cases, achievement behavior, UX acceptance.
- **D:** UI templates/components and API consumption, preserve LocalStorage progress.

## Security

Don't commit actual keys. The in-process rate limiter is best-effort only, not a distributed abuse-control solution. Protect real paid endpoints with appropriate Vercel Firewall/rate limits before enabling them.

## Evil UX Lab (Track 2)

The Quest Board includes a **separate, interactive seven-stage Evil UX Lab**: infinite 99.9% progress, surprise conditions, moving XP thresholds, near-complete lucky draws, simulated friend referrals, apparent progress rollback and simulated urgency countdown. The lab is always labeled **satirical/demo**; it does not send invites, erase progress, reduce earned XP, or claim real prizes. Only the demo stage and the progress bar presentation are affected. It is enabled by default and can be disabled from Settings. The existing task cards and quest flow are not redesigned.

The reference WorkBuddy share page could not be opened from this environment; the implementation follows the Evil UX concepts agreed in the project conversation, rather than claiming a pixel-perfect copy.

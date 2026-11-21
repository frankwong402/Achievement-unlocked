# Achievement Unlocked — API Contract v0.1

Status: Backend routes added. **The frontend still uses Mock content.**
Live AI calls are **disabled by default**; no API key is shipped to the browser.

Base route on standalone Vercel project: `/api`. The personal-domain `/achievement` reverse proxy currently forwards only the homepage, NOT API paths. Before wiring the UI on the personal domain, configure a safe API proxy (or use a deliberately configured cross-origin endpoint).

## Endpoint 1 — Goal outline
`POST /api/goals/generate`

Request:
```json
{"goal":"我要从零基础学英语，直到雅思9分","language":"zh"}
```
Response:
```json
{"data":{"title":"IELTS Roadmap","chapters":[{"title":"English Foundations","description":"...","metadata":{}}],"hiddenAchievements":[{"title":"Secret Starter","description":"...","condition":"Complete your first three tasks","kind":"semantic","metadata":{}}],"metadata":{}}}
```

## Endpoint 2 — Chapter tasks
`POST /api/chapters/generate`

Request:
```json
{"goal":"我要从零基础学英语，直到雅思9分","chapter":"English Foundations","chapterDescription":"...","batch":0,"existingTasks":[{"title":"ABC","completed":true}],"language":"zh"}
```
Response:
```json
{"data":{"tasks":[{"title":"Write 26 letters","description":"...","difficulty":"easy","achievementTitle":"Alphabet Master","completionCriteria":"Write every letter","metadata":{}}],"hiddenAchievements":[],"hasMore":true,"metadata":{}}}
```

The AI chooses a useful number of tasks per batch, up to a contract maximum of 25. `batch>0` requests additional tasks; `existingTasks` prevents repeats. Retain already completed tasks on chapter regeneration.

## Endpoint 3 — Semantic hidden achievement evaluation
`POST /api/achievements/evaluate`

Request:
```json
{"goal":"Learn English","tasks":[{"title":"Write 26 letters","completed":true}],"achievements":[{"id":"achievement-1","title":"First Secret","condition":"Complete 3 tasks"}],"language":"en"}
```
Response:
```json
{"data":{"decisions":[{"id":"achievement-1","unlocked":false}]}}
```

IDs are supplied by the client and validated against the candidate list. The model may only judge evidence in the submitted completion state. The frontend remains authoritative for local state, XP, reversals and achievement persistence; it must not grant XP from arbitrary repeated responses.

## Endpoint 4 — Status
`GET /api/ai/status` returns `{"ai":{"enabled":false,"model":"deepseek-v4-flash","configured":true}}` when AI is configured but deliberately disabled. This endpoint makes no billed calls.

## Error response
`{"error":{"code":"AI_DISABLED","message":"Live AI is disabled until the owner enables it"}}`

Usual status codes: 400 invalid input, 413 oversized input, 415 content type, 422 invalid schema/input, 429 throttled, 502 upstream or schema failure, 503 AI disabled/not configured, 504 timeout. **No automatic JSON repair or fallback to Mock.**

## Activation checklist
1. Confirm `AIHUBMIX_API_KEY` and `AIHUBMIX_BASE_URL` in Vercel **Production**.
2. Set `AIHUBMIX_MODEL=deepseek-v4-flash` in Production when 2FA is available. (Provider defaults to this ID already.)
3. Add `AI_LIVE_ENABLED=true` **only after** setting spending controls and production rate limiting (Vercel Firewall/WAF). Avoid public abuse of the $12 credit.
4. Redeploy production to load newly configured variables, then test one request to each endpoint and confirm structured JSON.
5. Implement UI integration and `/achievement/api/*` proxy or equivalent route. Do not claim the public UX is connected until verified.

**Security note:** The in-memory per-instance limiter in `http.mjs` is best-effort only; it is NOT a substitute for distributed/proxy rate limiting. Hidden achievement conditions are sent to the browser as data and are therefore not secret from a technical user while storage is browser-only.

# Achievement Unlocked — API Contract v0.1

The web client calls the three endpoints below. The standalone base is `/api`. The profile path proxies `/achievement/api/*` to the same handlers.

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

Production reservations use a private Vercel Blob ledger shared by all function instances. See README for limits. Hidden conditions are omitted from the UI and stored locally for evaluation.

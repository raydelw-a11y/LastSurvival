# Cloud save sync (Cloudflare Worker + D1)

Syncs `PlayerProgress` between devices using a 12-character sync code (no accounts).
Merge rules live in `../src/sync/mergeProgress.ts` (shared with the game client).

- Live URL: https://last-survival-sync.raydelw.workers.dev
- D1 database: `last-survival-saves` (table in `schema.sql`)

Redeploy after changing the Worker or the merge rules:

```bash
cd cloud-sync && npx wrangler@3 deploy
```

Local testing: `npx wrangler@3 d1 execute last-survival-saves --local --file schema.sql`,
then `npx wrangler@3 dev --local --port 8799` and run the game with
`VITE_SYNC_URL=http://localhost:8799 npm run dev`.

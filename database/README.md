# SentinelEye database (Supabase)

1. Create a Supabase project (region: South Asia / Mumbai).
2. SQL Editor -> New query -> paste `schema.sql` -> Run. It is safe to run again.
3. Project Settings -> API: copy the Project URL and the anon / publishable key.
4. Put them in `frontend/.env.production` (or Vercel -> Project -> Settings -> Environment Variables):

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon or publishable key>
```

Never put the service_role / secret key in the frontend.

What gets stored
- `alerts`: every case, upserted when it changes (audit trail inside `data`).
- `ledger_blocks`: every evidence block, append-only; a trigger rejects UPDATE and DELETE for every role.
- `chain_anchors`: chain-head anchors, append-only.
- `zones`: the 8 protected zones as PostGIS geometry; `alert_zone_check` is a view that runs `ST_Contains`.

The browser keeps its own copy, so the app still works if the database is unreachable.

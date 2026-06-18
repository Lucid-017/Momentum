# Momentum — Developer README

A daily focus dashboard for people who abandon productivity apps.
Built with Next.js · TypeScript · Tailwind · Supabase · Anthropic API.

---

## What this app does

One screen. Three tasks. A brain dump. A time audit. One AI reflection at the end of the day.
No backlog, no tags, no nested projects — just today, repeated until the habit forms itself.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (Postgres) |
| AI | Anthropic Claude API (streaming) |
| Deployment | Vercel |

---

## Project structure

```
momentum/
├── app/
│   ├── layout.tsx               ← root layout, font, metadata
│   ├── page.tsx                 ← dashboard — userId logic lives here
│   └── api/
│       └── reflect/
│           └── route.ts         ← Claude API call for nightly reflection
├── components/
│   ├── FocusTasks.tsx           ← the 3-task zone (primary component)
│   ├── BrainDump.tsx            ← textarea + auto-save
│   ├── TimeAudit.tsx            ← bucket logging + bar visualisation
│   └── ReflectionCard.tsx       ← AI response display
├── lib/
│   ├── supabase.ts              ← Supabase client (single instance)
│   └── types.ts                 ← shared TypeScript types
├── .env.local                   ← secrets (never commit this)
└── MOMENTUM_README.md
```

---

## Database schema

Two tables. Run this in Supabase SQL Editor before anything else.

```sql
-- one row per user per day
create table entries (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  date date not null default current_date,
  brain_dump text,
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- one row per task (up to 3 per entry)
create table tasks (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references entries(id) on delete cascade,
  user_id text not null,
  text text not null default '',
  done boolean default false,
  position int not null,
  created_at timestamptz default now()
);
```

Why two tables and not columns `task_1`, `task_2`, `task_3` on entries?
Because separate rows let you add metadata per task later (priority, category, carry-forward)
without restructuring the whole table. The fixed-column approach is not sustainable.

---

## Environment variables

Create `.env.local` at the project root. Never commit this file.

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
ANTHROPIC_API_KEY=your-anthropic-key-here
NEXT_PUBLIC_TEST_USER_ID=test-user-001
```

The `NEXT_PUBLIC_` prefix exposes variables to the browser.
`ANTHROPIC_API_KEY` has no prefix — it stays server-side only.

---

## Supabase connection (`lib/supabase.ts`)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

Import `supabase` from this file everywhere. Never call `createClient` more than once.

---

## userId — where it comes from

### Phase 1 (no auth)

userId is a UUID generated once and stored in `localStorage`.
It lives in `app/page.tsx` and is passed down as a prop to all components.

Flow:
```
localStorage
    ↓
app/page.tsx  →  reads or creates userId, stores in state
    ↓
FocusTasks    →  receives userId as prop
    ↓
Supabase      →  used as a filter on all queries
```

Rules:
- `FocusTasks` never touches `localStorage` directly
- Nothing renders until `userId` is in state (never pass undefined or null)
- Use `useEffect` for `localStorage` — it is browser-only and will crash on the server

```
on mount →
  check localStorage for 'momentum_user_id' →
    found   → read it, set in state
    missing → generate uuid, save to localStorage, set in state
  once userId is in state → render FocusTasks with userId prop
```

### Phase 2 (Supabase Auth)

Replace the localStorage block in `page.tsx` with `supabase.auth.getUser()`.
userId becomes `session.user.id`. Nothing inside `FocusTasks` changes.

---

## Entry creation — lazy, not eager

Do NOT create an entry on page load. Create it on first user action (first keystroke).

Gate logic on every save:
```
user types in task slot →
  entryId in state is null? →
    yes → create entries row first → store returned id in state → then create tasks row
    no  → upsert tasks row directly
```

Why lazy?
Avoids empty rows in the database for days the user opened the app and immediately closed it.

---

## FocusTasks — logic breakdown

### The four moments

**Moment 1 — component mounts**
Query `entries` joined with `tasks`, filtered by `user_id` and today's date.
Result is either a full entry object with a tasks array, or null.

**Moment 2 — no entry found**
Set `entryId` to null in state. Render three empty task slots. Wait for user action.

**Moment 3 — user types a task**
- Update UI immediately (instant feel)
- Check if `entryId` is null
  - If null: create entry row → save `entryId` to state → create task row
  - If not null: upsert task row by `user_id + position`
- Save fires after user stops typing (debounce — not on every keystroke)

**Moment 4 — user checks a task done**
- Update local state immediately (optimistic update — do not wait for DB)
- Update tasks row in Supabase by task `id`
- If Supabase fails: log error (Phase 1), roll back state (Phase 2)

### Two types of save — do not confuse them

| Save type | When | DB operation |
|---|---|---|
| Text save | user edits task text | insert (new) or update (existing) — check if task has a DB id |
| Done save | user clicks checkbox | always update — task must exist before it can be checked |

### State shape — think this through before writing code

Map out what your component state looks like at each moment:
- right after mount (loading)
- after fetch returns null (empty day)
- after fetch returns data (existing day)
- after user types (unsaved changes)
- after save completes (synced)

If you can describe the state clearly at each point, the code writes itself.

### Loading state

While the initial fetch is in flight, do not render task inputs.
Render a skeleton or null. Prevents race conditions between user input and fetch.

---

## Fetching entry + tasks together

```typescript
const { data, error } = await supabase
  .from('entries')
  .select(`
    *,
    tasks (
      id, text, done, position
    )
  `)
  .eq('user_id', userId)
  .eq('date', today)
  .order('position', { referencedTable: 'tasks' })
  .single()
```

Expected shape:
```json
{
  "id": "a1b2c3d4-...",
  "user_id": "test-user-001",
  "date": "2026-06-18",
  "brain_dump": "...",
  "tasks": [
    { "id": "...", "text": "Task one", "done": true,  "position": 1 },
    { "id": "...", "text": "Task two", "done": false, "position": 2 },
    { "id": "...", "text": "Task three","done": false, "position": 3 }
  ]
}
```

---

## Seed data for testing

Run in Supabase SQL Editor to get real data in the frontend immediately:

```sql
insert into entries (id, user_id, date, brain_dump)
values (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'test-user-001',
  current_date,
  'Momentum project — figure out the reflection prompt UX. Modal or inline? Check if streaming feels better than waiting for full reply.'
);

insert into tasks (entry_id, user_id, text, done, position)
values
  ('a1b2c3d4-0000-0000-0000-000000000001', 'test-user-001', 'Set up Supabase + Next.js connection', true,  1),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'test-user-001', 'Find first OSS good-first-issue',      false, 2),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'test-user-001', 'Post this week''s build update',       false, 3);
```

---

## Common gotchas

**Date mismatch**
`current_date` in Supabase uses UTC. Your local `new Date()` may return a different date
depending on your timezone. If `data` is null but `error` is also null, this is why.
Temporarily change the date filter to `.gte('date', '2026-01-01')` to confirm data exists.

**RLS blocking queries silently**
Supabase returns empty results (not errors) when Row Level Security blocks a read.
For Phase 1, either disable RLS on both tables or add a permissive policy:

```sql
create policy "allow all" on entries for all using (true);
create policy "allow all" on tasks for all using (true);
```

Replace with proper user-scoped policies when you add auth in Phase 2.

**`localStorage` crashing on server**
Next.js renders on the server first. `localStorage` is browser-only.
Always access it inside `useEffect`, never at the top level of a component.

**`'use client'` missing**
`useState` and `useEffect` only work in client components.
Any component using them must have `'use client'` as the very first line.

**`createClient` called multiple times**
Always import `supabase` from `lib/supabase.ts`. Never call `createClient` inline
inside a component — it creates a new connection on every render.

---

## Packages to install

```bash
npm install @supabase/supabase-js uuid lodash.debounce
npm install -D @types/uuid @types/lodash.debounce
```

---

## Phase 1 definition of done

Before calling this shipped:

- [*] userId generated and persisted in localStorage
- [*] Today's entry fetched on mount
- [ ] Three task slots rendered (empty or populated)
- [ ] Task text saves to Supabase on debounce (not every keystroke)
- [ ] Checking a task updates Supabase immediately (optimistic)
- [ ] Entry created lazily on first keystroke (not on load)
- [ ] Brain dump auto-saves with debounce
- [ ] Deployed to Vercel with a real URL
- [ ] Works on mobile

## Phase 2 upgrades (do not build now)

- [ ] Supabase Auth (email or Google)
- [ ] Row Level Security policies scoped to authenticated user
- [ ] Time audit component
- [ ] AI reflection via Anthropic API (streaming)
- [ ] Weekly visualisation with Recharts
- [ ] Streak tracking

---

*Built by Uche · Momentum v0.1*

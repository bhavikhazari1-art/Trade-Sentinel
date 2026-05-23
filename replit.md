# TradeJournal

A premium AI-powered Trading Journal app with Firebase Authentication and Firestore, featuring a luxury dark UI with gold accents — built mobile-first.

## Run & Operate

- `pnpm --filter @workspace/trading-journal run dev` — run the frontend (port 21194)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- Firebase env vars are stored as shared env vars (VITE_FIREBASE_*)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Wouter routing, TailwindCSS, Recharts, Framer Motion
- Auth + DB: Firebase Authentication + Firestore + Storage
- API: Express 5 (health check only — data in Firestore)
- Build: Vite

## Where things live

- `artifacts/trading-journal/src/` — React frontend
- `artifacts/trading-journal/src/contexts/AuthContext.tsx` — Firebase Auth context
- `artifacts/trading-journal/src/contexts/TradesContext.tsx` — Firestore trades CRUD
- `artifacts/trading-journal/src/lib/firebase.ts` — Firebase config
- `artifacts/trading-journal/src/pages/` — all pages
- `artifacts/trading-journal/src/index.css` — luxury dark theme with gold accents

## Architecture decisions

- Firebase Firestore as the primary database (no PostgreSQL needed for this app)
- All trades stored per user with `userId` field, queried with Firestore `where`
- Firebase Storage for chart screenshot uploads
- Mobile-first layout with fixed bottom navigation
- `overscroll-behavior-y: contain` on scroll containers to prevent pull-to-refresh conflicts
- All data starts empty — no sample/seed data

## Product

- Login/Signup with email+password or Google OAuth
- Dashboard with P&L summary, equity curve chart, win rate, streak
- Add Trade page with psychology tracking, screenshot upload, emotion tags
- Analytics page with charts (by symbol, by month, by emotion, by setup)
- AI Coach page with Smart Trading Score, Discipline Tracker, Risk Control Meter, personalized insights
- Calendar with month switcher — profit/loss days highlighted in green/red
- Profile page with account summary, full trade log with delete, and logout

## User preferences

- Dark mode always on (black/silver/gold luxury theme)
- Mobile-first design
- No sample data — journal starts completely empty
- Firebase Auth (no Replit Auth)
- Scroll up must not trigger page refresh (fixed with overscroll-behavior-y: contain)

## Gotchas

- Firebase env vars must be prefixed with VITE_ for Vite to expose them to the browser
- Firestore requires the `trades` collection to have a composite index on `userId + createdAt desc` — Firebase will prompt you with a link in console if missing
- Firebase Storage CORS may need to be configured for production uploads
- Do NOT add Replit Auth — this app uses Firebase Auth only

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

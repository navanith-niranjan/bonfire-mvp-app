# Bonfire MVP

**Secure & instant digital trading** — a full-stack MVP for trading collectibles (starting with Pokémon TCG cards). Users sign in, manage a wallet, build an inventory, discover cards, and trade with others.

---

## Overview

Bonfire is a mobile-first app (iOS, Android, Web) with a FastAPI backend. It uses **Supabase** for auth and Postgres, and supports **email** and **Google** sign-in. Users get a **wallet**, an **inventory** (with submission → authentication → vault flow), **card discovery** powered by the Pokémon TCG API, and **trading** with transaction history.

---

## Features

| Area | Description |
|------|-------------|
| **Auth** | Email/password and Google OAuth via Supabase; email verification, forgot/reset password |
| **Wallet** | Per-user balance; deposits, withdrawals, and balance shown in the app |
| **Inventory** | Add items (e.g. cards); status flow: Pending → Authenticating → Authenticated → Vaulted (or Rejected) |
| **Cards** | Pokémon card catalog synced from [Pokémon TCG API](https://pokemontcg.io); search and browse |
| **Trading** | Select cards and conditions, build trades, complete swaps with transaction records |
| **Activity** | Transaction history (trades, deposits, withdrawals, submissions, redemptions) |

---

## Project Structure

```
bonfire-mvp-app/
├── frontend/
│   └── mock-app/          # React Native (Expo) app
│       ├── app/            # Expo Router screens (tabs: Discover, Vault, Activity)
│       ├── components/     # UI and feature components
│       ├── hooks/          # useAuth, useWallet, useCardSearch, useInventory, etc.
│       ├── providers/      # Auth, Wallet, Inventory, Trade, Transactions
│       ├── lib/             # Supabase client, theme, utils
│       └── types/          # Card, inventory types
├── backend/
│   ├── app/
│   │   ├── main.py         # FastAPI app, CORS, lifespan, router registration
│   │   ├── config.py       # Settings from env (Supabase, DB, Resend, Pokemon TCG API)
│   │   ├── database.py     # Async SQLModel/Supabase Postgres, init_db, get_session
│   │   ├── auth.py         # Supabase JWT verification (JWKS)
│   │   ├── models.py       # Wallet, Inventory, PokemonCard, Transaction
│   │   ├── email.py        # Resend integration
│   │   └── routers/        # wallet, inventory, trade, cards, transactions, oauth_callback
│   └── scripts/
│       └── sync_cards.py   # Sync Pokémon cards from API into Postgres
└── README.md               # This file
```

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React Native, Expo (Router), NativeWind (Tailwind), Supabase JS, React Native Reusables |
| **Backend** | Python 3, FastAPI, SQLModel, SQLAlchemy (async), Supabase (Postgres + Auth) |
| **Auth** | Supabase Auth (email + Google); backend verifies JWTs via JWKS |
| **Data** | Supabase Postgres (connection via `DATABASE_URL`); Pokemon TCG API for card data |
| **Email** | Resend (verification, password reset) |

---

## Prerequisites

- **Node.js** (LTS) and npm/yarn/pnpm
- **Python 3.10+** and a virtual environment
- **Supabase** project (Auth + Postgres; use Transaction Mode / port 6543 for the backend)
- **Resend** account (for transactional email)
- **Pokémon TCG API** key from [pokemontcg.io](https://pokemontcg.io) (for card sync and catalog)

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `SUPABASE_SECRET_KEY` | Supabase service role key (backend only) |
| `DATABASE_URL` | Postgres connection string (use **Transaction Mode**, e.g. port **6543**) |
| `POKEMON_TCG_API_URL` | Pokemon TCG API base URL |
| `POKEMON_TCG_API_KEY` | API key from pokemontcg.io |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_TEMPLATE_ID` | Resend template ID for emails |
| `RESEND_FROM_EMAIL` | Sender email for Resend |
| `ENVIRONMENT` | e.g. `development` or `production` |
| `DEBUG` | `True` / `False` |

### Frontend (`frontend/mock-app/.env` or Expo env)

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Same as backend `SUPABASE_URL` |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same as backend `SUPABASE_PUBLISHABLE_KEY` |

Configure the backend API base URL in the app (e.g. in a config or env) so the frontend can call your deployed or local API.

---

## Getting Started

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install fastapi uvicorn sqlmodel sqlalchemy[asyncio] asyncpg supabase python-dotenv pyjwt pyjwks aiohttp resend
```

Create `backend/.env` with the variables above, then:

```bash
uvicorn app.main:app --reload
```

API root: `http://localhost:8000`  
Health: `http://localhost:8000/health`

### 2. Sync Pokémon cards (optional, for catalog)

From `backend/` with your venv active and `.env` set:

```bash
python scripts/sync_cards.py
```

### 3. Frontend

```bash
cd frontend/mock-app
npm install
npm run dev
```

Then:

- **Web**: press `w` in the terminal or open the URL in a browser  
- **iOS**: press `i` (simulator, Mac only)  
- **Android**: press `a` (emulator)  
- **Device**: scan the QR code with [Expo Go](https://expo.dev/go)

Point the app at your backend (e.g. `http://localhost:8000` or your deployed API) via your frontend config.

---

## Main flows

1. **Auth**: Welcome → Login/Create account (email or Google) → Verify email if required → Redirect to Discover.
2. **Discover**: Browse/search cards, add to trade; view balance and user menu.
3. **Vault**: View inventory and vaulted items.
4. **Activity**: View transaction history.
5. **Trade**: Add cards (with condition) from Discover → complete trade flow; backend records transactions and updates wallets/inventory.

---

## API overview

| Router | Purpose |
|--------|---------|
| `wallet` | Balance, deposit, withdraw |
| `inventory` | CRUD for user inventory and status |
| `trade` | Create/execute trades |
| `cards` | Card search and catalog (Pokemon cards) |
| `transactions` | List user transactions |
| `oauth_callback` | Google OAuth callback handling |

Protected routes expect a valid Supabase JWT in the `Authorization` header; the backend verifies it using Supabase JWKS.

---

## License

Private / unlicensed unless otherwise specified. Use and distribution subject to the repository owner’s terms.

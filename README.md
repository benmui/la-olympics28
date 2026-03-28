# LA28 Olympics Schedule Planner

A web application for browsing, planning, and comparing LA 2028 Olympic Games events. Users can filter the full competition schedule, build personal itineraries, and compare plans side-by-side with conflict detection.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Lucide React |
| Backend | Node.js, Express 4 |
| Database | SQLite (via sql.js) |
| Auth | JWT (jsonwebtoken), bcryptjs |

---

## Prerequisites

- Node.js 18+
- Python 3 (for database initialization only)

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/benmui/la-olympics28.git
cd la-olympics28
```

### 2. Install all dependencies

```bash
npm run install:all
```

This installs dependencies for both the server and client.

### 3. Initialize the database

The SQLite database file (`la28.db`) must be initialized before the server can run. Two Python scripts handle this:

```bash
# Import the competition schedule from the source PDF
python3 import_schedule.py

# Create application tables (users, plans, plan_events)
python3 init_db.py
```

> These scripts only need to be run once. Re-running `init_db.py` is safe — it checks for existing tables before creating them.

---

## Running the Application

### Development (recommended)

Starts both the server and client concurrently with hot reload:

```bash
npm run dev
```

- **Client:** [http://localhost:5173](http://localhost:5173)
- **Server:** [http://localhost:3001](http://localhost:3001)

### Run server or client independently

```bash
npm run dev:server   # Server only (port 3001, auto-restarts on file changes)
npm run dev:client   # Client only (port 5173, Vite HMR)
```

### Production build

```bash
cd client && npm run build   # Outputs to client/dist/
cd ../server && npm start    # Serves built client + API
```

---

## Environment Variables

The server uses the following environment variables (both have built-in defaults for local development):

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Port the Express server listens on |
| `JWT_SECRET` | `la28-dev-secret` | Secret used to sign JWT tokens — **change this in production** |

---

## Application Features

### Authentication

Users register and log in with a username and password. Credentials are stored with bcrypt password hashing. A JWT token (7-day expiry) is issued on login and used to authenticate all plan-related API requests.

### Browse Events

The main event browser provides a filterable, searchable grid of all competition events drawn from the official LA28 schedule.

**Filters available:**
- **Text search** — searches across sport, venue, session description, session type, and session code
- **Date** — filter to a specific competition day
- **Zone** — filter by venue zone, with a grouped dropdown:
  - *Los Angeles (All Zones)* — selects all 15 LA venues at once
  - Individual LA zones: DTLA, Exposition, Port of Los Angeles, Riviera, Universal City, Valley, Venice, Carson, Inglewood, Long Beach, Pasadena, Anaheim, Arcadia, City of Industry, Pomona
  - Other venues: Trestles, New York, Columbus, St. Louis, Nashville, San Jose, San Diego, OKC
- **Sports** — multi-select checkbox list with its own search field; shows top 15 by default with a "Show all" toggle

When a plan is active, events can be added to it directly from the browse view.

### Plans

Users can create multiple named plans (itineraries). Each plan shows a summary of:
- Total events added
- Unique sports covered
- Number of days spanned
- Number of scheduling conflicts

Conflicts are detected automatically when two events in a plan overlap in time on the same day. Conflicting events are highlighted within the plan view.

Plans support inline rename and deletion with a confirmation prompt.

### Compare Plans

Two plans can be selected and compared side-by-side. The comparison view shows:
- **Stats panel** — events, conflicts, sports, and days for each plan, with color coding to highlight which plan performs better on each metric
- **Day selector** — horizontal tabs to step through each competition day
- **Timeline view** — visual hour-by-hour timeline showing both plans' events for the selected day
- **Event lists** — scrollable per-day event lists for each plan

---

## Project Structure

```
la-olympics28/
├── client/                  # React frontend (Vite)
│   └── src/
│       ├── pages/           # BrowsePage, PlansPage, ComparePage, AuthPage
│       ├── components/      # EventCard, Header, PlanDetail, TimelineView
│       ├── context/         # AuthContext, PlansContext
│       ├── utils/           # Color helpers, time formatting
│       └── api.js           # API client
├── server/
│   └── index.js             # Express server, API routes, SQLite access
├── init_db.py               # Creates application tables
├── import_schedule.py       # Imports competition schedule into DB
├── la28.db                  # SQLite database (generated)
└── package.json             # Root workspace — install:all and dev scripts
```

---

## API Overview

### Public endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Log in and receive a JWT |
| `GET` | `/api/events` | List events (supports `sports`, `date`, `zone`, `search` query params) |
| `GET` | `/api/sports` | List all sports |
| `GET` | `/api/dates` | List all competition dates |
| `GET` | `/api/zones` | List all venue zones |
| `GET` | `/api/meta` | Schedule metadata (version, import date) |

### Authenticated endpoints (require `Authorization: Bearer <token>`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/plans` | List the current user's plans |
| `POST` | `/api/plans` | Create a new plan |
| `PUT` | `/api/plans/:id` | Rename a plan |
| `DELETE` | `/api/plans/:id` | Delete a plan |
| `GET` | `/api/plans/:id/events` | Get events in a plan (includes conflict data) |
| `POST` | `/api/plans/:id/events` | Add an event to a plan |
| `DELETE` | `/api/plans/:id/events/:eventId` | Remove an event from a plan |

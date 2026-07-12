# GreenField API

Flask + SQLite backend for the GreenField QA tools. First module wired up:
**Raise Ticket** (screen at `http://localhost:5173/raise-ticket`).

## Setup

```bash
cd Greenfield_API
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
python app.py
```

The server starts on `http://localhost:5000` and creates `greenfield.db`
(seeded with default staff / point rules) on first run.

To enable the AI analysis endpoint, copy `.env.example` to `.env`, set
`ANTHROPIC_API_KEY`, and load it into your shell before `python app.py`
(e.g. PowerShell: `$env:ANTHROPIC_API_KEY="sk-..."`). Without a key the
endpoint returns 503 and the UI shows a local fallback summary.

## Endpoints

| Method | Path                  | Purpose                              |
|--------|-----------------------|--------------------------------------|
| GET    | `/api/health`         | Health check                         |
| GET    | `/api/staff`          | List staff                           |
| POST   | `/api/staff`          | Add staff                            |
| PUT    | `/api/staff/<id>`     | Update staff (e.g. reporting line)   |
| DELETE | `/api/staff/<id>`     | Remove staff                         |
| GET    | `/api/tickets`        | List tickets (newest first)          |
| POST   | `/api/tickets`        | Create ticket (code assigned server) |
| PATCH  | `/api/tickets/<id>`   | Toggle `useful` / set `customPoints` |
| DELETE | `/api/tickets/<id>`   | Delete ticket                        |
| GET    | `/api/config`         | `{ points, emails }`                 |
| PUT    | `/api/config/points`  | Save point rules                     |
| PUT    | `/api/config/emails`  | Save report email list               |
| POST   | `/api/ai/analyze`     | Claude proxy (key stays server-side) |

## Frontend

The Vite dev server proxies `/api` to `http://localhost:5000`
(see `Greenfield_UI/vite.config.js`), so run both and open the app on `5173`.

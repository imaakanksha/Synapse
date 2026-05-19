# 🧠 Synapse — AI-Powered Text Triage SaaS

**Synapse** transforms unstructured brain dumps into actionable, categorized items using Google's Gemini AI. Paste in your raw thoughts, and Synapse triages them into:

- ✅ **To-Do List** — Tasks with priority levels
- 📅 **Calendar Events** — Dates and times inferred from context
- ✉️ **Drafted Comms** — Ready-to-send email/message drafts
- 💡 **Notes & Ideas** — Everything else worth remembering

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 AI Triage | Gemini 2.0 Flash-powered categorization of raw text |
| 📊 Analytics Dashboard | Real-time stats, category breakdown charts, productivity score |
| 📌 Priority Matrix | Eisenhower matrix auto-populated from your todos |
| 📜 Triage History | Full session replay with re-triage capability |
| 🎯 Focus Mode | Minimal view with active tasks only |
| 🍅 Pomodoro Timer | Built-in 25/15/5 min timer with session tracking |
| 🔍 Live Search | Instant search across all items |
| 📝 Smart Templates | Pre-built prompts for common scenarios |
| ⌨️ Keyboard Shortcuts | Full shortcut system (press `?` to view) |
| 🎨 Theme Toggle | Dark/Light mode with smooth transitions |
| 📤 CSV Export | Export todos and notes to CSV |
| ✏️ Inline Editing | Double-click any item to edit in place |
| 🔐 JWT Authentication | Secure multi-user auth with bcrypt |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python · FastAPI · Uvicorn · SQLAlchemy |
| Frontend | HTML · Vanilla JS · Tailwind CSS (CDN) |
| AI | Google Gemini 2.0 Flash |
| Auth | JWT · bcrypt · HTTPBearer |
| Deploy | Docker · Google Cloud Run |

## Quick Start (Local)

### 1. Prerequisites
- Python 3.10+
- A [Gemini API Key](https://aistudio.google.com/apikey)

### 2. Setup

```bash
# Clone the repo
git clone <your-repo-url> && cd synapse

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### 3. Run

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## Docker Deployment

```bash
docker build -t synapse .
docker run -p 8080:8080 -e GEMINI_API_KEY=your_key_here synapse
```

---

## Deploy to Google Cloud Run

```bash
gcloud run deploy synapse \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key_here
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | Create new account |
| POST | `/api/login` | Authenticate & get JWT |
| GET | `/api/me` | Get current user profile |
| POST | `/api/triage` | AI-triage raw text |
| GET | `/api/items` | Get all items (grouped) |
| PUT | `/api/items/{id}` | Update item content/status |
| DELETE | `/api/items/{id}` | Delete an item |
| GET | `/api/items/export` | Export active items as CSV |
| GET | `/api/analytics/dashboard` | Dashboard statistics |
| GET | `/api/history` | Triage session history |
| DELETE | `/api/history/{id}` | Delete a history session |
| GET | `/api/search?q=` | Search across all items |
| GET | `/health` | Health check |

## Project Structure

```
synapse/
├── app/
│   ├── main.py                 # FastAPI entry point
│   ├── core/
│   │   ├── config.py           # Environment settings
│   │   ├── database.py         # SQLAlchemy engine & session
│   │   ├── dependencies.py     # Auth dependency
│   │   └── security.py         # JWT & bcrypt utilities
│   ├── models/
│   │   ├── user.py             # User ORM model
│   │   ├── item.py             # TriagedItem ORM model
│   │   └── triage_session.py   # TriageSession ORM model
│   ├── routers/
│   │   ├── auth.py             # Register/Login/Profile
│   │   ├── triage.py           # AI triage endpoint
│   │   ├── items.py            # CRUD + CSV export
│   │   └── analytics.py        # Dashboard, History, Search
│   └── static/
│       ├── index.html           # Main frontend
│       ├── styles.css           # Design system
│       ├── app.js               # Core application logic
│       └── features.js          # Feature modules
├── .env.example
├── Dockerfile
├── gunicorn_conf.py
├── requirements.txt
└── README.md
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+Enter` | Submit triage |
| `Ctrl+K` | Focus search |
| `Ctrl+D` | Dashboard tab |
| `Ctrl+H` | History tab |
| `Ctrl+F` | Focus mode tab |
| `?` | Show shortcuts |
| `Esc` | Close modals |

## License

MIT

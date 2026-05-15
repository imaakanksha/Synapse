# 🧠 Synapse — AI-Powered Text Triage

**Synapse** transforms unstructured brain dumps into actionable, categorized items using Google's Gemini AI. Paste in your raw thoughts, and Synapse triages them into:

- ✅ **To-Do List** — Tasks with priority levels
- 📅 **Calendar Events** — Dates and times inferred from context
- ✉️ **Drafted Comms** — Ready-to-send email/message drafts
- 💡 **Notes & Ideas** — Everything else worth remembering

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python · FastAPI · Uvicorn |
| Frontend | HTML · Vanilla JS · Tailwind CSS (CDN) |
| AI | Google Gemini 2.0 Flash |
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

### Build the Image

```bash
docker build -t synapse .
```

### Run Locally with Docker

```bash
docker run -p 8080:8080 -e GEMINI_API_KEY=your_key_here synapse
```

---

## Deploy to Google Cloud Run

### One-Command Deploy

```bash
gcloud run deploy synapse \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key_here
```

### Or Build & Push Manually

```bash
# Set your project
export PROJECT_ID=your-gcp-project-id

# Build and push to Artifact Registry
gcloud builds submit --tag gcr.io/$PROJECT_ID/synapse

# Deploy
gcloud run deploy synapse \
  --image gcr.io/$PROJECT_ID/synapse \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key_here
```

---

## Project Structure

```
synapse/
├── app/
│   ├── main.py              # FastAPI backend + Gemini integration
│   └── static/
│       └── index.html        # Full frontend (HTML + Tailwind + JS)
├── .env                      # Local secrets (gitignored)
├── .env.example              # Template for API key
├── .dockerignore
├── Dockerfile
├── requirements.txt
└── README.md
```

## License

MIT

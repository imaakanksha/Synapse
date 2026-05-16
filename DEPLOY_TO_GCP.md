# 🚀 Deploy Synapse to Google Cloud Run

> Step-by-step guide to deploy Synapse from source to Google Cloud Run.

---

## Prerequisites

Before you begin, ensure you have:

- [x] **Google Cloud CLI** (`gcloud`) installed → [Install Guide](https://cloud.google.com/sdk/docs/install)
- [x] A **GCP Project** created with **billing enabled**
- [x] A **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/apikey)
- [x] Docker is **NOT** required — Cloud Run builds from source automatically

---

## Step 1: Authenticate with Google Cloud

```bash
gcloud auth login
```

This opens a browser window. Sign in with your Google account that has access to your GCP project.

---

## Step 2: Set Your Project

Replace `YOUR_PROJECT_ID` with your actual GCP project ID:

```bash
gcloud config set project YOUR_PROJECT_ID
```

To find your project ID:
```bash
gcloud projects list
```

---

## Step 3: Enable Required APIs

Cloud Run needs these APIs enabled (one-time setup):

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

---

## Step 4: Deploy to Cloud Run

Run this command from the project root directory (`d:\Synapse`):

```bash
gcloud run deploy synapse \
  --source . \
  --port 8080 \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="GEMINI_API_KEY=your_actual_gemini_api_key,SECRET_KEY=your-random-secret-key-here,DATABASE_URL=sqlite:///./synapse.db,ACCESS_TOKEN_EXPIRE_MINUTES=1440"
```

### ⚡ Windows PowerShell version (single line):

```powershell
gcloud run deploy synapse --source . --port 8080 --region us-central1 --allow-unauthenticated --set-env-vars="GEMINI_API_KEY=your_actual_gemini_api_key,SECRET_KEY=your-random-secret-key-here,DATABASE_URL=sqlite:///./synapse.db,ACCESS_TOKEN_EXPIRE_MINUTES=1440"
```

### What this does:
| Flag | Purpose |
|------|---------|
| `--source .` | Builds the Docker image from the current directory using Cloud Build |
| `--port 8080` | Tells Cloud Run the container listens on port 8080 |
| `--region us-central1` | Deploys to the us-central1 region (low latency, free tier eligible) |
| `--allow-unauthenticated` | Makes the service publicly accessible (no IAM auth required) |
| `--set-env-vars` | Injects environment variables into the running container |

---

## Step 5: Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ Yes | Your Google Gemini API key |
| `SECRET_KEY` | ✅ Yes | Random secret for JWT signing (use a long random string) |
| `DATABASE_URL` | No | Defaults to `sqlite:///./synapse.db` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | JWT token lifetime, defaults to `1440` (24 hours) |

### Generate a secure SECRET_KEY:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## Step 6: Verify Deployment

After deployment completes, `gcloud` will print a URL like:

```
Service URL: https://synapse-xxxxx-uc.a.run.app
```

Open that URL in your browser. You should see the Synapse login page.

---

## Updating the Deployment

After making code changes, redeploy with the same command:

```bash
gcloud run deploy synapse --source . --port 8080 --region us-central1 --allow-unauthenticated
```

> **Note:** Environment variables persist between deployments. You only need `--set-env-vars` the first time or when changing values.

---

## Useful Commands

```bash
# View deployment logs
gcloud run services logs read synapse --region us-central1

# Get the service URL
gcloud run services describe synapse --region us-central1 --format='value(status.url)'

# Delete the service (if needed)
gcloud run services delete synapse --region us-central1
```

---

## ⚠️ Important Notes

1. **SQLite on Cloud Run**: Cloud Run containers are stateless. SQLite data will be lost when the container restarts. For persistent data in production, migrate to **Cloud SQL (PostgreSQL)**. The SQLAlchemy ORM makes this a one-line config change.

2. **Cold starts**: The first request after inactivity may take 2-5 seconds. This is normal for Cloud Run.

3. **Costs**: Cloud Run has a generous free tier (2M requests/month). You'll likely stay within free tier for a hackathon.

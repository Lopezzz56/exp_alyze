# ExpAlyze: Financial Stream & Commission Analytics Platform

ExpAlyze is an intelligent financial management platform designed to help businesses, agencies, and independent professionals track, reconcile, and optimize their commission structures and income streams directly from raw bank account statements.

---

## Business Problem

Businesses that handle multi-channel revenue streams—such as sales commissions, affiliate payouts, client retains, and platform distributions—face significant operational friction:

1. **Complex Bank Statements**: Payout statements are delivered in unstructured PDF formats with varying schemas across financial institutions.
2. **Untracked Commission Drops**: Manual reconciliation makes it difficult to detect missed payouts, fee deductions, or incorrect commission percentages.
3. **Fragmented Income Visibility**: Decision-makers lack a unified view of stream performance across multiple accounts and recurring payout partners.

---

## Solution

ExpAlyze automates the end-to-end financial stream workflow:

- **Statement Ingestion**: Upload bank statement PDFs (including password-protected files) to automatically extract line-item transactions.
- **Commission & Stream Categorization**: Intelligently classify incoming transactions into distinct commission rules, vendor channels, and income buckets.
- **Stream Management**: Merge, rename, and analyze custom commission streams with historical tracking.
- **Executive Analytics**: Real-time visualization of net revenue, commission growth rates, top income drivers, and transaction ledger details.

---

## System Architecture

The project is structured as a decoupled monorepo comprising a modern Next.js frontend, a FastAPI microservice for document ingestion, and Supabase for cloud data storage and authentication.

### Component Breakdown

1. **Frontend Application (`/frontend`)**
   - **Framework**: Next.js 15 (App Router), TypeScript, Tailwind CSS
   - **Data Visualization**: Recharts for dynamic income charts and stream metrics
   - **Icons & UI Elements**: Lucide React, CSS Utilities
   - **Authentication**: Supabase Auth (Session management, Magic Link, Password Login)

2. **Backend Engine (`/backend`)**
   - **Framework**: FastAPI (Python 3.11+)
   - **PDF Processing Pipeline**: PDFPlumber and PikePDF for password decryption and tabular data extraction
   - **Data Transformation**: Pandas for data cleansing and transaction normalization
   - **AI Intelligence**: Google Gemini API for transaction classification and summary insights

3. **Database & Infrastructure (`/supabase`)**
   - **Database**: Supabase PostgreSQL with Row Level Security (RLS)
   - **Tables**: `bank_accounts`, `bank_statements`, `transactions`, `commission_rules`

---

## Technical Stack

| Layer | Technology |
|---|---|
| Frontend Framework | Next.js 15 (App Router), React 19 |
| Language | TypeScript, Python 3.11 |
| Styling | Tailwind CSS |
| Backend API | FastAPI, Uvicorn |
| Database | PostgreSQL (Supabase) |
| Authentication | Supabase Auth |
| PDF Extraction Engine | PDFPlumber, PikePDF, Pandas |
| AI / LLM Integration | Google Gemini API |
| Hosting & Deployment | Vercel (Frontend), Docker / FastAPI Cloud (Backend) |

---

## Repository Structure

```text
exp_alyze/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/         # Upload, transactions, analytics, and insights endpoints
│   │   ├── core/               # App configuration and database clients
│   │   ├── services/           # PDF parsing and Gemini AI engines
│   │   └── main.py             # FastAPI entry point
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js App Router pages (Dashboard, Upload, Commissions, etc.)
│   │   ├── components/         # Reusable UI components and analytics widgets
│   │   ├── hooks/              # Custom React hooks for data fetching
│   │   └── lib/                # Supabase client and utility helpers
│   ├── package.json
│   ├── next.config.ts
│   └── .env.example
├── supabase/                   # Database schema migrations and seed scripts
├── vercel.json                 # Vercel deployment configuration
├── .gitignore
├── .env.example
└── README.md
```

---

## Local Setup and Installation

### Prerequisites

- Node.js (v18 or higher)
- Python (v3.10 or higher)
- Supabase Account and Project

### 1. Environment Configuration

Copy the example environment files and populate them with your credentials.

For the **Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

For the **Backend** (`backend/.env`):
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-service-role-or-anon-key
GEMINI_API_KEY=your-google-gemini-api-key
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
# source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The backend server will run at `http://localhost:8000`.

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend application will run at `http://localhost:3000`.

---

## Deployment Guide

### Deploying Frontend to Vercel

1. Push your repository to GitHub / GitLab.
2. Connect your repository to Vercel.
3. If importing the root repository:
   - Vercel auto-detects `vercel.json` and builds the Next.js app in the `/frontend` directory.
   - Alternatively, set **Root Directory** to `frontend` in Project Settings.
4. Add the required Environment Variables in Vercel Dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL` (URL of deployed backend microservice)
5. Deploy.

### Deploying Backend Service

The FastAPI backend can be deployed using Docker or directly on platforms such as Render, Railway, or AWS EC2:

```bash
cd backend
docker build -t expalyze-backend .
docker run -p 8000:8000 --env-file .env expalyze-backend
```

---

## Security and Privacy

- **Environment File Protection**: Sensitive keys (`.env`, `.env.local`) are excluded from Git via `.gitignore`.
- **Data Encryption**: Financial statements are processed in memory and decrypted temporarily without persistent local file storage.
- **Row Level Security**: Database queries are secured via Supabase RLS policies ensuring users only access their own account statements and analytics.

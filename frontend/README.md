# ExpAlyze Frontend

This is the Next.js frontend application for ExpAlyze, built with Next.js 15 (App Router), TypeScript, Tailwind CSS, and Recharts.

For full project details, business background, backend setup, and deployment guides, please refer to the main [Root README.md](../README.md).

---

## Local Development

1. Ensure environment variables are configured in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

Open `http://localhost:3000` with your browser to access the dashboard.

---

## Production Build and Verification

To verify production build locally:

```bash
npm run build
npm run start
```

---

## Vercel Deployment

This Next.js application is pre-configured for Vercel deployment. When linking the repository to Vercel:

1. Set the Root Directory to `frontend` (or rely on root `vercel.json`).
2. Configure environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`).
3. Deploy.

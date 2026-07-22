# Brian AI

Evidence-backed industrial knowledge intelligence for refinery compliance and failure analysis.

Live app: https://brian-ai-app.vercel.app

## Demo Flow

1. Open the dashboard.
2. Click `Prove It`.
3. Review the P-204B seal failure answer.
4. Click `Open evidence`.
5. Check the OISD/PESO compliance matrix and plant evidence.

## Stack

- Frontend: React 19, Vite 6, TypeScript, Tailwind CSS 4, shadcn/ui
- Backend: FastAPI
- Deployment: Vercel frontend, Railway backend

## Local Run

```bash
cd frontend
npm install
npm run dev
```

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

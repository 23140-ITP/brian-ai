# Brian AI

Evidence-backed industrial knowledge intelligence for refinery compliance and failure analysis.

Live app: https://brian-ai-app.vercel.app

## Submission Artifacts

- [Pitch deck](docs/Brian_AI_pitch_deck.pdf)
- [Narrated demo video](docs/Brian_AI_demo_video.mp4)
- [Demo video script](docs/DEMO_VIDEO_SCRIPT.md)
- [Public links checklist](docs/PUBLIC_LINKS_CHECKLIST.md)
- [Submission guide](docs/SUBMISSION.md)
- [Implementation audit](docs/IMPLEMENTATION_AUDIT.md)

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

# Brian AI Public Links Checklist

Use this checklist before submitting Brian AI to the ET AI Hackathon portal.

## Required Links

- Working prototype: https://brian-ai-app.vercel.app
- Backend health: https://brian-ai-production.up.railway.app/health
- Pitch deck: https://github.com/23140-ITP/brian-ai/blob/main/docs/Brian_AI_pitch_deck.pdf
- Demo video: https://github.com/23140-ITP/brian-ai/blob/main/docs/Brian_AI_demo_video.mp4
- Recording script: https://github.com/23140-ITP/brian-ai/blob/main/docs/DEMO_VIDEO_SCRIPT.md

## Railway Backend

1. Deploy from the repository root with `railway.toml`.
2. Confirm Railway builds `backend/Dockerfile`.
3. Attach a persistent volume at `/data`.
4. Set environment variables:

   ```text
   OPENROUTER_API_KEY=sk-or-...
   BRIAN_AI_USE_OPENROUTER=1
   OPENROUTER_VISION_MODEL=google/gemini-2.5-flash
   NEO4J_URI=neo4j+s://xxxx.databases.neo4j.io
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=...
   ALLOW_ORIGINS=https://your-vercel-url.vercel.app
   ENVIRONMENT=production
   ```

5. Open `https://your-railway-backend/health` and verify `status` is `ok`.
6. Open `https://your-railway-backend/api/system/status` and verify provider modes.

## Vercel Frontend

1. Import the repo and set root directory to `frontend`.
2. Set `VITE_API_URL` to the Railway backend URL.
3. Deploy with the checked-in `frontend/vercel.json`.
4. Open the Vercel URL and verify:

   - `/` dashboard loads.
   - `/copilot` streams or falls back cleanly.
   - `/field` loads and registers the service worker.
   - `/manifest.json`, `/icon-192.png`, `/icon-512.png`, and `/sw.js` return 200.

5. Add the Vercel URL to Railway `ALLOW_ORIGINS` and redeploy Railway.

## Final Portal Entry

Paste these values into the submission form:

- Prototype URL: https://brian-ai-app.vercel.app
- Pitch deck URL: https://github.com/23140-ITP/brian-ai/blob/main/docs/Brian_AI_pitch_deck.pdf
- Demo video URL: https://github.com/23140-ITP/brian-ai/blob/main/docs/Brian_AI_demo_video.mp4
- Team/contact notes:

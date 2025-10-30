# GDU AI Mentor Chatbot

Simple chatbot web app using Next.js (App Router) and Gemini API.

## Setup

1. Install deps:

```
pnpm install # or npm install / yarn
```

2. Create `.env.local` with your Gemini API key:

```
GEMINI_API_KEY=your_api_key_here
```

3. Run dev server:

```
pnpm dev # or npm run dev / yarn dev
```

Open http://localhost:3000

## Deploy

- Add `GEMINI_API_KEY` to your Vercel Environment Variables.

## Notes

- Chat history is stored in localStorage and persists during the session.
- Server-side API at `app/api/chat/route.ts` calls Gemini `generateContent` endpoint.

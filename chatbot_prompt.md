You are my coding assistant. I’m building a **simple chatbot web app** using **Next.js (latest version)** for a school assignment. The app will be deployed on **Vercel** later.

---

## 🧩 Core Requirements

1. **Chat Page (UI)**
   - Create a clean, minimal chat interface inspired by **Google Gemini**.
   - Include:
     - Scrollable chat area.
     - Input bar fixed at the bottom.
     - Chat bubbles for user and assistant.
     - Responsive layout (mobile + desktop).

2. **API Integration**
   - Implement an **API route** that runs on the **server side**.
   - Use the **Gemini API**, with the `GEMINI_API_KEY` stored in `.env.local`.
   - The API should handle sending user input to Gemini and returning responses.

3. **Chat Session & History**
   - Maintain chat history while the page is open.
   - Store messages as an array:
     ```ts
     { role: "user" | "assistant"; content: string }[]
     ```
   - Possible methods:
     - React state + localStorage.
     - Session-based memory on the backend.

---

## ⚙️ Additional Features (Recommended)

- **Loading Indicator**  
  Show “Thinking…” or a spinner while waiting for the model’s reply.

- **Error Handling**  
  Handle cases like missing API key, bad response, or timeout gracefully.

- **Clear Chat Button**  
  Allow user to reset conversation history.

- **Keyboard Shortcuts**  
  - `Enter` → Send message  
  - `Shift + Enter` → New line

- **Styling**  
  - Use **Tailwind CSS** or **Shadcn/UI**.
  - Rounded chat bubbles, consistent spacing, subtle shadows.

- **TypeScript Support**  
  Ensure type safety throughout (`.tsx` files).

- **Optional: Model Selector**  
  Dropdown to switch between Gemini model variants (e.g., `gemini-2.5-flash`).

---

## 📁 Project Structure

```
/app
 ├── page.tsx          # Chat UI
 ├── api/
 │    └── chat/
 │         └── route.ts # Server route calling Gemini API
/.env.local             # GEMINI_API_KEY=your_api_key_here
```

---

## ✅ Deliverables

- Fully working chatbot page with persistent chat session.
- Server-side API call to Gemini.
- Responsive UI ready for Vercel deployment.
- Error handling and basic UX polish.

---

## 💡 Notes

- Use `fetch()` or `axios` for the server request to Gemini.
- Keep UI minimal and accessible.
- Focus on clean code and comments for clarity.

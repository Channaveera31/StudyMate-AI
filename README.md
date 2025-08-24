# StudyMate AI — Fixed & Enhanced

This build fixes `scanner.html` navigation, adds a global profile dropdown, a realtime progress bar, ImageKit-based uploads, activity logging, and Groq-powered summarization.

## What's Included
- **Navigation fix**: All feature pages' back buttons return to `dashboard.html`. On `dashboard.html`, the back button returns to `index.html`.
- **Profile dropdown**: Human icon (👤) with **My Profile**, **Change Password**, **Activities**.
- **Realtime Progress Bar**: Visible in navbar; stored locally and can be updated from any page (`SM.setProgress(75)`).
- **ImageKit storage**: Client uses ImageKit JS SDK with secure server auth endpoint.
- **Activities**: Stored locally and mirrored to a server file. Replace with DB if desired.
- **Scanner Summarization**: Uses Groq Chat Completions API with your key (`gsk_...zZad`) to generate summaries from pasted text or uploaded text files.
- **Server**: Minimal Express server for ImageKit auth and activities persistence.

## Quick Start (Local)
1. Install Node 18+
2. Rename `.env.sample` to `.env` and fill:
   ```env
   IMAGEKIT_PUBLIC_KEY=your_public_key
   IMAGEKIT_PRIVATE_KEY=your_private_key
   IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id
   ```
3. (Optional) Edit `config.json` to set your Groq API key (`gsk_...zZad`).
4. Install deps and start:
   ```bash
   npm install
   npm run dev
   ```
5. Open `http://localhost:8080`

## Deploy
- Deploy as a Node app (Render/Railway/Heroku/Vercel Node server). The server serves static files and exposes:
  - `GET /api/imagekit-auth` for ImageKit signature
  - `POST /api/activities` to mirror activity log (demo)
  - `GET /config.json` to deliver client config

## Notes
- If an `<a href="#">` or `document.querySelector('#')` caused console errors, they are sanitized.
- The scanner uploads any selected file to ImageKit and can summarize pasted or text-like files. PDF/DOC content text extraction is **not** implemented client-side; paste text for best results.
- Use the global object in dev console:
  - `SM.setProgress(42)`
  - `SM.addActivity({ type: 'demo', timestamp: Date.now() })`

## Files Added
- `assets/app.css`, `assets/app.js`
- `profile.html`, `activities.html`, `change-password.html`
- `server/index.js`, `package.json`, `.env.sample`
- `config.json` (and `config.sample.json`)
- `README.md`

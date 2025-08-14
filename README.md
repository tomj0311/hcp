# ConsultFlow Platform Monorepo

Full-stack prototype for generic provider ↔ consumer interactions (originally virtual consultations).

## Structure
- `backend/` Express + WebSocket API, Stripe integration, temporary JSON storage (now `data/providers/` & `data/consumers/`).
- `frontend/` React + MUI dashboard with dark/light themes.

## Features Implemented (Checklist)
1. User login (admin hardcoded via env) ✔
2. Dashboard layout inspired by provided image ✔ (cards, dark style, togglable theme)
3. Platform arrangement showing ranked providers ✔ (sorted by rank, top list)
4. Provider & consumer registration screens (simplified unified form) ✔
5. Intuitive UI/UX with responsive Material UI layout ✔ (cards, spacing, accessible labels)
6. Security via optional TLS for WebSockets & REST when cert/key env vars provided ✔
7. Material UI with dark & light themes; default dark styling similar to screenshot ✔
8. Spacing & alignment with consistent MUI spacing scale (WCAG-friendly labels, color contrast adjustable via theme) ✔
9. Email verification emails (Nodemailer via SMTP/Gmail) ✔
10. Stripe payment integration (checkout session endpoint & pricing UI) ✔
11. Pricing page with freemium, per consultation ($50), enterprise ($100) tiers ✔
12. **Google OAuth Authentication & Registration** ✔
    - Sign in/up with Google for both consumers and providers
    - Automatic profile creation with Google-verified emails
    - Profile completion flow for users who need to add additional details
    - Seamless integration with existing JWT authentication system

## Google OAuth Setup

The platform now supports Google OAuth for streamlined registration and authentication. See `GOOGLE_OAUTH_SETUP.md` for detailed configuration instructions.

### Quick OAuth Setup:
1. Set up Google Cloud Console project with OAuth 2.0 credentials
2. Add environment variables to `backend/.env`:
   ```bash
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   SESSION_SECRET=your_session_secret
   ```
3. Users can now register/login using "Continue with Google" buttons

## TODO / Next Steps
// Email send now implemented with verification tokens.
- Add form validations & better accessibility audits (ARIA roles, focus management, contrast tests).
- Persist users in a real database.
- Add provider availability & real matchmaking logic.
- Add WebSocket auth (pass token and verify on connection).

## Quick Start
Backend:
1. Copy `backend/.env.example` to `backend/.env` and set credentials.
2. `cd backend && npm install && npm run dev`.

Frontend:
1. Create `frontend/.env` with:
```
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000/ws
```
2. `cd frontend && npm install && npm run dev`.

Open http://localhost:5173

## Testing & Reports
- Run E2E tests: `npm run test:e2e`
- After run, open HTML report locally: `npm run test:report`
- CI uploads artifact named `playwright-html-report` containing the HTML report.
# ConsultFlow Virtual Backend

Implements Express API + WebSocket for realtime consult requests.

## Features
- Auth with hardcoded admin credentials (see `.env.example`).
- JWT issuance.
- Temp JSON file storage for providers & consumers in `data/providers/` & `data/consumers/`.
- Stripe checkout session endpoint.
- WebSocket channel `/ws` for consult matchmaking.
- Optional TLS if `TLS_KEY` & `TLS_CERT` env vars provided.

## Quick start
1. Copy `.env.example` to `.env` and adjust values.
2. Install deps: `npm install`.
3. Run dev: `npm run dev`.

## Email (Verification) Setup
You can send real verification emails using either a local SMTP catcher or Gmail.

### Option A: Local Dev (MailDev / MailHog)
Run a local SMTP server (e.g., MailDev) on port 1025 and keep the default `.env.example` values. Emails will appear in the MailDev UI.

### Option B: Gmail (hub8ai@gmail.com)
1. In Gmail account settings enable 2FA.
2. Create an App Password (select App: Mail, Device: Other) and copy the 16‑character password.
3. In `backend/.env` set:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=hub8ai@gmail.com
SMTP_PASS=YOUR_APP_PASSWORD
EMAIL_FROM="ConsultFlow Platform <hub8ai@gmail.com>"
```
4. Restart the backend. New consumer registrations will send a verification code + link.

The verification token is still returned in the API response for dev convenience; remove it in production.


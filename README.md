# HealthCare Platform Monorepo

Full-stack prototype for virtual doctor consultations.
## Structure
- `backend/` Express + WebSocket API, Stripe integration, temporary JSON storage.
- `frontend/` React + MUI dashboard with dark/light themes.
## Features Implemented (Checklist)
1. User login (admin hardcoded via env) ✔
2. Dashboard layout inspired by provided image ✔ (cards, dark style, togglable theme)
3. Health platform arrangement showing ranked doctors ✔ (sorted by rank, top list)
4. Doctor & patient registration screens ✔
5. Intuitive UI/UX with responsive Material UI layout ✔ (cards, spacing, accessible labels)
6. Security via optional TLS for WebSockets & REST when cert/key env vars provided ✔
7. Material UI with dark & light themes; default dark styling similar to screenshot ✔
8. Spacing & alignment with consistent MUI spacing scale (WCAG-friendly labels, color contrast adjustable via theme) ✔
9. Email integration placeholder via SMTP env (API hook to be implemented) ◻ (future enhancement: send email on registration)
10. Stripe payment integration (checkout session endpoint & pricing UI) ✔
11. Pricing page with freemium, per consultation ($50), enterprise ($100) tiers ✔
## TODO / Next Steps
- Implement actual email send in registration route (Nodemailer service file & call after registration, using accessible HTML template).
- Add form validations & better accessibility audits (ARIA roles, focus management, contrast tests).
- Persist users in a real database.
- Add doctor availability & real matchmaking logic.
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
# Healthcare Virtual Doctor Backend

Implements Express API + WebSocket for realtime consult requests.

## Features
- Auth with hardcoded admin credentials (see `.env.example`).
- JWT issuance.
- Temp JSON file storage for doctors & patients in `data/`.
- Stripe checkout session endpoint.
- WebSocket channel `/ws` for consult matchmaking.
- Optional TLS if `TLS_KEY` & `TLS_CERT` env vars provided.

## Quick start
1. Copy `.env.example` to `.env` and adjust values.
2. Install deps: `npm install`.
3. Run dev: `npm run dev`.


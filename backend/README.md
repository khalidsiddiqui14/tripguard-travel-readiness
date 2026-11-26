# TripGuard Backend

FastAPI backend for **TripGuard – Intelligent Travel Readiness & Risk Dashboard**.

## Features
- Employee registration and login with Argon2 password hashing and JWT access tokens.
- Employee/admin role checks and per-employee trip data isolation.
- Trip CRUD, cancellation and preparation checklist.
- Weather and destination search through Open-Meteo.
- Currency rates through Frankfurter.
- Country/time-zone details through REST Countries.
- Explainable travel readiness score and risk bands.
- Employee/admin dashboards and downloadable PDF reports.
- Request IDs, structured request logging, validation and external API error handling.

## Requirements
Python 3.12 recommended.

## Local setup (SQLite quick start)
```bash
cd backend
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```
API: http://localhost:8000  
Swagger docs: http://localhost:8000/docs  
Health: http://localhost:8000/health

SQLite is only a convenient local-development default. For final deployment, configure a persistent PostgreSQL database in `DATABASE_URL`, for example:
`postgresql+psycopg://USER:PASSWORD@HOST:5432/DBNAME`

## Authentication
Register using `POST /api/v1/auth/register`, then login using `POST /api/v1/auth/login`.
Use the returned access token as `Authorization: Bearer TOKEN`.

Public registration always creates an `employee`. Do not expose admin registration publicly. Create the first admin through a controlled database/seed operation before deployment.

## Main endpoints
- `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`
- `GET/PATCH /api/v1/users/me`
- `POST/GET /api/v1/trips`, `GET/PUT /api/v1/trips/{id}`, `PATCH /api/v1/trips/{id}/cancel`
- `GET/POST /api/v1/trips/{id}/checklist`
- `PATCH/DELETE /api/v1/trips/{id}/checklist/{item_id}`
- `GET /api/v1/destinations/search?q=Singapore`
- `GET /api/v1/weather?latitude=1.29&longitude=103.85`
- `GET /api/v1/currency?base=INR&symbols=USD,EUR`
- `GET /api/v1/countries/Singapore`
- `GET /api/v1/trips/{id}/readiness`
- `GET /api/v1/dashboard/employee`, `GET /api/v1/dashboard/admin`
- `GET /api/v1/reports/trips/{id}.pdf`
- `GET /api/v1/admin/employees`

## Readiness score business rules
- Checklist completion: up to 40 points, proportional to completed items.
- Departure proximity: 20 points if 7+ days away; 10 points if 2–6 days away; otherwise 0.
- Trip details: 20 points when required trip details and date order are valid.
- Checklist setup: 20 points for 3+ tasks; 10 points for 1–2 tasks; otherwise 0.
- Risk bands: Low >=75, Medium 45–74, High <45.

## Important production hardening still required
- Configure a strong random `SECRET_KEY`, persistent PostgreSQL and HTTPS.
- Use Alembic migrations rather than `create_all` at startup.
- Add rate limiting, refresh-token/session revocation and stricter admin provisioning.
- Configure trusted CORS origins and centralized secret management.
- Add automated test coverage and execute/document at least 25 test cases as required by the internship brief.
- Review privacy/retention policy and ensure production logs never contain credentials or personal payloads.

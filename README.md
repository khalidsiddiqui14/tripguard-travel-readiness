# TripGuard — Travel Readiness & Risk Dashboard

TripGuard is a full-stack travel readiness platform for corporate travel teams.
Employees create trips, manage preparation checklists, and see a readiness score.
Admins review all trips, monitor risk, and approve / manage users.

## Features

- JWT Auth — Register / Login / Protected routes
- Role-based access — Employee + Admin
- Trips — Create, View, Cancel, Search, Filter by status
- Preparation Checklist — Add / Complete / Delete
- Travel Readiness Score — 0 to 100 + Low / Medium / High risk
- Travel Intelligence — Weather, Currency, Country info
- Dashboards — Employee dashboard + Admin dashboard
- PDF Report — Downloadable trip readiness report
- Profile — View + Update profile

## Readiness Score Formula

Total = 100 points

| Component | Points |
| :--- | :--- |
| Checklist completion | 40 |
| Weather risk | 30 |
| Departure proximity | 20 |
| Trip details completeness | 10 |

Risk bands:
- 75 - 100 = LOW risk
- 45 - 74 = MEDIUM risk
- 0 - 44 = HIGH risk

## Tech Stack

- Frontend: React 19 + Vite + React Router 7
- Backend: Python + FastAPI + SQLAlchemy
- Database: PostgreSQL (psycopg) / SQLite for local demo
- Auth: JWT (PyJWT) + pwdlib
- PDF: ReportLab
- Tests: Pytest

## Project Structure

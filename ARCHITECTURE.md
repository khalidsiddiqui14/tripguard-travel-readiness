# TripGuard - Architecture + ER Diagram

## 1. Architecture Diagram

User (Browser)
  ↓ HTTPS
Frontend - React + Vite (Vercel)
  ↓ REST API + JWT Token
Backend - FastAPI (Render)
  ↓
Database - PostgreSQL
  +
External APIs - Weather, Currency, Country

## 2. ER Diagram

users (1) -> trips (Many)
trips (1) -> checklist (Many)
trips (1) -> readiness (1)

users:
- id, name, email, password_hash, phone, home_city, role

trips:
- id, user_id, title, origin_city, destination_city, departure_date, return_date, budget, status

checklist:
- id, trip_id, title, is_completed

readiness:
- id, trip_id, score, risk_level
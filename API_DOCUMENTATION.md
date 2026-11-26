# TripGuard — API Documentation
Base URL (local): http://localhost:8000

## Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /auth/register | Public | Register employee/admin |
| POST | /auth/login | Public | Login, returns JWT |
| GET | /users/me | JWT | Current user profile |
| PATCH | /users/me | JWT | Update profile |

## Trips
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /trips | JWT | List my trips (admin: all) |
| POST | /trips | JWT | Create trip |
| GET | /trips/{id} | JWT | Trip details |
| PATCH | /trips/{id} | JWT | Edit trip |
| DELETE | /trips/{id} | JWT | Cancel trip |

## Dashboard / Intelligence / Report
| Method | Endpoint | Description |
|---|---|---|
| GET | /dashboard/employee | Employee overview |
| GET | /dashboard/admin | Admin overview |
| GET | /intelligence/weather?city= | Weather for city |
| GET | /intelligence/currency?from=&to= | Exchange rate |
| GET | /intelligence/country?country= | Country / timezone info |
| GET | /trips/{id}/report | Download readiness report PDF |

## Errors
- 400 Validation error
- 401 Unauthorized / token expired
- 403 Forbidden / data isolation
- 404 Not found
- 502 External API failure (graceful fallback)
- 500 Internal error (generic message, detailed log internal)
# TripGuard — Security Summary + AI Usage + Limitations

## Security Implementation
- Passwords: bcrypt hashing, kabhi plain text me store nahi hote
- Auth: JWT token, expiry ke saath, har protected route pe check
- Authorization: Backend pe role check — Employee sirf apna data dekh sakta hai, Admin sab dekh sakta hai
- Data Isolation: Har query me user_id filter lagta hai
- Input Security: Pydantic validation, SQLAlchemy ORM (SQL injection se safe), XSS se bachav ke liye React escaping
- Secrets: .env me, Git me kabhi commit nahi — .env.example me sirf sample keys
- PII: Logs aur error response me sensitive data nahi aata
- CORS: Sirf allowed frontend origin

## Logging
- Har request me: timestamp, severity, request_id, endpoint, status
- External API fail hone pe alag log: `EXTERNAL_API_ERROR`
- Sensitive data logs me nahi likha jata

## AI Usage Summary
- AI-assisted development use kiya gaya: boilerplate, bug fixing, test cases, documentation
- Saara business logic, readiness formula aur validation human ne review karke final kiya
- AI se banaya hua code manually test kiya gaya (pytest + manual flow)

## Known Limitations
- Weather / Currency APIs free-tier hai — rate limit ya downtime pe fallback data dikhta hai
- Deployment free-tier pe hai — cold start me pehli request slow ho sakti hai
- Report PDF basic format me hai, advanced charts nahi hai
- Real-time flight / hotel booking is MVP me nahi hai
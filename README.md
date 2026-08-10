# Pixar Labs — v0.1.0

Infrastructure for the next digital frontier.

## What This Is

Pixar Labs is a real production hosting platform in active development. This is the first working slice: authentication and project management with a real database.

**Working now:**
- User registration & login (password hashing, secure sessions)
- Project creation, viewing, renaming, deletion
- Strict project ownership enforced server-side

**Coming soon:**
- Deployments, servers, domains, databases, storage
- Analytics, logs, monitoring, billing, teams

## Project Structure

```
pixar-labs/
├── public/              # Static frontend (deploy anywhere)
│   ├── index.html       # Landing page
│   ├── login.html       # Login page
│   ├── signup.html      # Registration page
│   ├── dashboard.html   # Dashboard (projects, account, overview)
│   ├── css/
│   │   └── style.css    # All styles (cyber/infrastructure aesthetic)
│   └── js/
│       ├── app.js       # Shared: API client, auth, toast, canvas, command palette
│       └── dashboard.js # Dashboard: panels, projects, sidebar
├── backend/
│   └── app.py           # Single Python file: auth, projects, database, security
├── requirements.txt     # Python dependencies
└── README.md            # This file
```

## How It Works

**Frontend:** Plain HTML/CSS/JavaScript. No framework. Static files talk to the backend via `fetch()` to `/api/*` endpoints.

**Backend:** One Flask file (`backend/app.py`) that handles:
- SQLite database (auto-created on first run)
- Password hashing with Werkzeug
- Secure session cookies
- Rate limiting on auth endpoints
- Server-side project ownership checks on every request

## Install & Run Locally

```bash
# 1. Clone or extract the project
cd pixar-labs

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Start the backend
python backend/app.py

# 4. Open http://localhost:5000
```

The backend serves the static frontend files automatically, so everything runs on one port.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | No | Flask session secret. Change this in production. |

```bash
SECRET_KEY=your-production-secret python backend/app.py
```

## Authentication

- Passwords are hashed with Werkzeug's `generate_password_hash` (pbkdf2)
- Sessions use `HttpOnly`, `SameSite=Lax` cookies
- Registration is rate-limited to 5/minute
- Login is rate-limited to 10/minute
- All project endpoints verify the session `user_id` and enforce ownership

## Frontend → Backend Communication

The frontend uses a simple `fetch()` wrapper in `js/app.js`:

```javascript
const data = await api("/projects", { method: "POST", body: { name, slug } });
```

All API calls include credentials (cookies) for session authentication.

## Deploy

**Option A: Together (simplest)**

Deploy the entire folder to a platform like Render, Railway, or a VPS:

```bash
pip install -r requirements.txt
python backend/app.py
```

The backend serves static files from `public/` automatically.

**Option B: Separate (static host + API)**

1. Deploy `public/` to Netlify, Vercel, or any static host
2. Deploy `backend/app.py` to Render, Railway, or a VPS
3. Update `API_BASE` in `js/app.js` to point to your backend URL
4. The backend includes CORS headers for cross-origin requests

## Security Notes

- Never commit `SECRET_KEY` to source control
- Set `SESSION_COOKIE_SECURE = True` when using HTTPS
- All database queries use parameterized statements
- A user cannot access another user's project by changing an ID
- Password minimum length is 8 characters

## License

© 2025 Pixar Labs, Inc. — All Rights Reserved

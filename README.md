# Pixar Labs — v0.2.0

Infrastructure for the next digital frontier.

## What This Is

Pixar Labs is a real production hosting platform in active development.

**Working now:**
- User registration & login (password hashing, secure sessions)
- Project creation, viewing, renaming, deletion
- Strict project ownership enforced server-side
- **Environment Variables** per project (create, edit, delete, masked values)

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
│       └── dashboard.js # Dashboard: panels, projects, env vars, sidebar
├── app.py               # Single Python file: auth, projects, env vars, database, security
├── requirements.txt     # Python dependencies
└── README.md            # This file
```

## How It Works

**Frontend:** Plain HTML/CSS/JavaScript. No framework. Static files talk to the backend via `fetch()` to `/api/*` endpoints.

**Backend:** One Flask file (`app.py`) that handles:
- SQLite database (auto-created on first run, auto-migrated on startup)
- Password hashing with Werkzeug
- Secure session cookies
- Rate limiting on auth endpoints
- Server-side project ownership checks on every request
- Environment variables scoped to projects

## Install & Run Locally

```bash
# 1. Clone or extract the project
cd pixar-labs

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Start the backend
python app.py

# 4. Open http://localhost:5000
```

The backend serves the static frontend files automatically, so everything runs on one port.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | No | Flask session secret. Change this in production. |
| `PORT` | No | Server port. Defaults to 5000. |

```bash
SECRET_KEY=your-production-secret python app.py
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

## API Endpoints

### Auth
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Get current user

### Projects
- `GET /api/projects` — List user's projects
- `POST /api/projects` — Create project
- `GET /api/projects/<id>` — Get project
- `PUT /api/projects/<id>` — Update project
- `DELETE /api/projects/<id>` — Delete project

### Environment Variables
- `GET /api/projects/<id>/env` — List env vars
- `POST /api/projects/<id>/env` — Create env var
- `PUT /api/projects/<id>/env/<var_id>` — Update env var
- `DELETE /api/projects/<id>/env/<var_id>` — Delete env var

## Deploy

**Together:** Deploy entire folder to Render, Railway, or VPS:

```bash
pip install -r requirements.txt
python app.py
```

**Separate:** Deploy `public/` to Netlify/Vercel (static), deploy `app.py` to Render/Railway (API). Update `API_BASE` in `js/app.js` to your backend URL.

## Security Notes

- Never commit `SECRET_KEY` to source control
- Set `SESSION_COOKIE_SECURE = True` when using HTTPS
- All database queries use parameterized statements
- A user cannot access another user's project or env vars by changing an ID
- Password minimum length is 8 characters
- Env var keys are validated: `^[A-Z][A-Z0-9_]{0,63}$`

## License

© 2025 Pixar Labs, Inc. — All Rights Reserved

"""
Pixar Labs Backend — v0.1.0
Single-file Flask backend. Handles auth, projects, database, and security.
"""
from flask import Flask, request, jsonify, session, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import sqlite3
import os
import re

# ── Config ──────────────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-key-change-in-production")
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=False,  # Set True in production with HTTPS
    PERMANENT_SESSION_LIFETIME=86400,
)

limiter = Limiter(app=app, key_func=get_remote_address)

DB_PATH = os.path.join(os.path.dirname(__file__), "pixar_labs.db")
EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
SLUG_RE = re.compile(r"^[a-z][a-z0-9-]{2,39}$")


# ── Database ────────────────────────────────────────────────────
def get_db():
    db = sqlite3.connect(DB_PATH, detect_types=sqlite3.PARSE_DECLTYPES)
    db.row_factory = sqlite3.Row
    return db


def init_db():
    if os.path.exists(DB_PATH):
        return
    db = get_db()
    db.executescript("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            slug TEXT NOT NULL,
            status TEXT DEFAULT 'READY',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, slug)
        );
        CREATE INDEX idx_projects_user ON projects(user_id);
    """)
    db.commit()
    db.close()


init_db()


# ── CORS (for separate static hosting during dev) ───────────────
@app.after_request
def after_request(response):
    origin = request.headers.get("Origin", "*")
    response.headers.add("Access-Control-Allow-Origin", origin)
    response.headers.add("Access-Control-Allow-Headers", "Content-Type")
    response.headers.add("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS")
    response.headers.add("Access-Control-Allow-Credentials", "true")
    return response


# ── Auth ────────────────────────────────────────────────────────
@app.route("/api/auth/register", methods=["POST"])
@limiter.limit("5 per minute")
def register():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or len(name) > 100:
        return jsonify(error="NAME_REQUIRED"), 400
    if not email or not EMAIL_RE.match(email):
        return jsonify(error="INVALID_EMAIL"), 400
    if len(password) < 8:
        return jsonify(error="PASSWORD_TOO_SHORT"), 400

    db = get_db()
    if db.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone():
        return jsonify(error="EMAIL_ALREADY_EXISTS"), 409

    pw_hash = generate_password_hash(password)
    cur = db.execute(
        "INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)",
        (email, pw_hash, name),
    )
    db.commit()
    user_id = cur.lastrowid
    session["user_id"] = user_id
    session.permanent = True

    return jsonify(
        success=True,
        user={"id": user_id, "name": name, "email": email},
    ), 201


@app.route("/api/auth/login", methods=["POST"])
@limiter.limit("10 per minute")
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify(error="INVALID_CREDENTIALS"), 400

    db = get_db()
    user = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()

    if user is None or not check_password_hash(user["password_hash"], password):
        return jsonify(error="INVALID_CREDENTIALS"), 401

    session["user_id"] = user["id"]
    session.permanent = True

    return jsonify(
        success=True,
        user={"id": user["id"], "name": user["name"], "email": user["email"]},
    )


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify(success=True)


@app.route("/api/auth/me", methods=["GET"])
def me():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify(error="UNAUTHORIZED"), 401

    db = get_db()
    user = db.execute(
        "SELECT id, name, email, created_at FROM users WHERE id = ?", (user_id,)
    ).fetchone()
    if not user:
        session.clear()
        return jsonify(error="UNAUTHORIZED"), 401

    return jsonify(user=dict(user))


# ── Projects ────────────────────────────────────────────────────
def require_user():
    user_id = session.get("user_id")
    if not user_id:
        return None, (jsonify(error="UNAUTHORIZED"), 401)
    return user_id, None


@app.route("/api/projects", methods=["GET"])
def list_projects():
    user_id, err = require_user()
    if err:
        return err

    db = get_db()
    rows = db.execute(
        "SELECT id, name, slug, status, created_at, updated_at "
        "FROM projects WHERE user_id = ? ORDER BY created_at DESC",
        (user_id,),
    ).fetchall()
    return jsonify(projects=[dict(r) for r in rows])


@app.route("/api/projects", methods=["POST"])
def create_project():
    user_id, err = require_user()
    if err:
        return err

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    slug = (data.get("slug") or "").strip().lower()

    if not name:
        return jsonify(error="PROJECT_NAME_REQUIRED"), 400
    if len(name) > 100:
        return jsonify(error="PROJECT_NAME_TOO_LONG"), 400
    if not slug:
        return jsonify(error="PROJECT_SLUG_REQUIRED"), 400
    if not SLUG_RE.match(slug):
        return jsonify(error="INVALID_PROJECT_SLUG"), 400

    db = get_db()
    if db.execute(
        "SELECT id FROM projects WHERE user_id = ? AND slug = ?", (user_id, slug)
    ).fetchone():
        return jsonify(error="SLUG_ALREADY_EXISTS"), 409

    cur = db.execute(
        "INSERT INTO projects (user_id, name, slug) VALUES (?, ?, ?)",
        (user_id, name, slug),
    )
    db.commit()

    project = db.execute("SELECT * FROM projects WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify(project=dict(project)), 201


@app.route("/api/projects/<int:project_id>", methods=["GET"])
def get_project(project_id):
    user_id, err = require_user()
    if err:
        return err

    db = get_db()
    project = db.execute(
        "SELECT * FROM projects WHERE id = ? AND user_id = ?", (project_id, user_id)
    ).fetchone()
    if not project:
        return jsonify(error="PROJECT_NOT_FOUND"), 404
    return jsonify(project=dict(project))


@app.route("/api/projects/<int:project_id>", methods=["PUT"])
def update_project(project_id):
    user_id, err = require_user()
    if err:
        return err

    db = get_db()
    project = db.execute(
        "SELECT * FROM projects WHERE id = ? AND user_id = ?", (project_id, user_id)
    ).fetchone()
    if not project:
        return jsonify(error="PROJECT_NOT_FOUND"), 404

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    slug = (data.get("slug") or "").strip().lower()

    updates, params = [], []

    if name:
        if len(name) > 100:
            return jsonify(error="PROJECT_NAME_TOO_LONG"), 400
        updates.append("name = ?")
        params.append(name)
    if slug:
        if not SLUG_RE.match(slug):
            return jsonify(error="INVALID_PROJECT_SLUG"), 400
        if db.execute(
            "SELECT id FROM projects WHERE user_id = ? AND slug = ? AND id != ?",
            (user_id, slug, project_id),
        ).fetchone():
            return jsonify(error="SLUG_ALREADY_EXISTS"), 409
        updates.append("slug = ?")
        params.append(slug)

    if not updates:
        return jsonify(project=dict(project))

    updates.append("updated_at = CURRENT_TIMESTAMP")
    params.append(project_id)

    db.execute(f"UPDATE projects SET {', '.join(updates)} WHERE id = ?", params)
    db.commit()

    project = db.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    return jsonify(project=dict(project))


@app.route("/api/projects/<int:project_id>", methods=["DELETE"])
def delete_project(project_id):
    user_id, err = require_user()
    if err:
        return err

    db = get_db()
    project = db.execute(
        "SELECT * FROM projects WHERE id = ? AND user_id = ?", (project_id, user_id)
    ).fetchone()
    if not project:
        return jsonify(error="PROJECT_NOT_FOUND"), 404

    db.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    db.commit()
    return jsonify(success=True)


# ── Health ──────────────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify(status="ok", version="0.1.0", environment="preview")


# ── Static files (for local development) ────────────────────────
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    public_dir = os.path.join(os.path.dirname(__file__), "..", "public")
    if path and os.path.exists(os.path.join(public_dir, path)):
        return send_from_directory(public_dir, path)
    return send_from_directory(public_dir, "index.html")


# ── Run ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)

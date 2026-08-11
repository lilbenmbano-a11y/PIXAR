/* ============================================================
   PIXAR LABS — DASHBOARD
   Panel switching, projects, account, coming-soon modules
   ============================================================ */

const PANEL_LABELS = {
  overview: "Overview", projects: "Projects", deployments: "Deployments",
  servers: "Servers", domains: "Domains", databases: "Databases",
  storage: "Storage", analytics: "Analytics", logs: "Logs",
  monitoring: "Monitoring", account: "Account", billing: "Billing",
  team: "Team", settings: "Settings",
};

let currentPanel = "overview";
let currentProjectId = null;

/* ---- Panel Switching ---- */
function showPanel(panel) {
  currentPanel = panel;
  currentProjectId = null;

  // Update sidebar active state
  document.querySelectorAll(".dash-nav-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.panel === panel);
  });

  document.getElementById("dashSidebar")?.classList.remove("open");
  renderPanel(panel);
}

function toggleDashSidebar() {
  document.getElementById("dashSidebar")?.classList.toggle("open");
}

async function renderPanel(panel) {
  const main = document.getElementById("dashMain");
  if (!main) return;

  if (panel === "overview") main.innerHTML = await renderOverview();
  else if (panel === "projects") main.innerHTML = await renderProjects();
  else if (panel === "project-detail") main.innerHTML = await renderProjectDetail(currentProjectId);
  else if (panel === "account") main.innerHTML = renderAccount();
  else main.innerHTML = renderComingSoon(PANEL_LABELS[panel] || panel);
}

/* ---- Overview ---- */
async function renderOverview() {
  let projectCount = 0;
  try {
    const data = await api("/projects");
    projectCount = data.projects.length;
  } catch (e) { /* ignore */ }

  return `
    <div class="dash-topline">
      <div>
        <h1>System Overview</h1>
        <div class="breadcrumb">DASHBOARD // OVERVIEW</div>
      </div>
      <span class="env-tag">Preview Environment</span>
    </div>
    <div class="stat-row">
      <div class="stat-cell"><div class="label">Active Projects</div><div class="value">${String(projectCount).padStart(2, "0")}</div><div class="demo-note">Real Data</div></div>
      <div class="stat-cell"><div class="label">Running Servers</div><div class="value">00</div><div class="demo-note">Not Enabled</div></div>
      <div class="stat-cell"><div class="label">Total Deployments</div><div class="value">00</div><div class="demo-note">Not Enabled</div></div>
      <div class="stat-cell"><div class="label">Network Status</div><div class="value ok">OFFLINE</div><div class="demo-note">Not Enabled</div></div>
    </div>
    <div class="dash-grid">
      <div class="panel">
        <div class="panel-head"><span>Quick Actions</span><span class="id">[SYS.CTL]</span></div>
        <div class="panel-body">
          <button class="btn btn-primary btn-block" onclick="openCreateProjectModal()" style="margin-bottom:12px;">[ + New Project ]</button>
          <button class="btn btn-block" onclick="showPanel('projects')">[ View Projects ]</button>
          <p class="demo-note" style="margin-top:12px;">Projects and Environment Variables are active in v0.2.0</p>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><span>Platform Status</span><span class="id">[SYS.INFO]</span></div>
        <div class="panel-body">
          <div class="term-row" style="border-bottom:1px dashed var(--border);padding:8px 0;"><span class="k">VERSION</span><span class="v">0.2.0</span></div>
          <div class="term-row" style="border-bottom:1px dashed var(--border);padding:8px 0;"><span class="k">AUTHENTICATION</span><span class="v ok">ONLINE</span></div>
          <div class="term-row" style="border-bottom:1px dashed var(--border);padding:8px 0;"><span class="k">PROJECTS</span><span class="v ok">ONLINE</span></div>
          <div class="term-row" style="border-bottom:1px dashed var(--border);padding:8px 0;"><span class="k">DEPLOYMENTS</span><span class="v">NOT ENABLED</span></div>
          <div class="term-row" style="padding:8px 0;"><span class="k">INFRASTRUCTURE</span><span class="v">NOT ENABLED</span></div>
        </div>
      </div>
    </div>
  `;
}

/* ---- Projects ---- */
async function renderProjects() {
  let projects = [];
  try {
    const data = await api("/projects");
    projects = data.projects;
  } catch (e) {
    return `
      <div class="dash-empty comingsoon">
        <div class="status-chip">ERROR</div>
        <h3>Failed to Load Projects</h3>
        <p>Could not retrieve your projects. Please try again.</p>
      </div>
    `;
  }

  const rows = projects.map(p => `
    <tr>
      <td class="mono-strong" onclick="showProjectDetail(${p.id})">${p.name}</td>
      <td>${p.slug}</td>
      <td>${statusBadge(p.status)}</td>
      <td>${timeAgo(new Date(p.created_at).getTime())}</td>
      <td><button class="btn btn-ghost-sm" onclick="showProjectDetail(${p.id})">Open</button></td>
    </tr>
  `).join("");

  return `
    <div class="dash-topline">
      <div>
        <h1>Projects</h1>
        <div class="breadcrumb">DASHBOARD // PROJECTS</div>
      </div>
      <div class="actions">
        <button class="btn btn-primary btn-sm" onclick="openCreateProjectModal()">[ + New Project ]</button>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><span>All Projects</span><span class="id">[PROJ.LIST]</span></div>
      <div class="panel-body table-scroll" style="padding:0;">
        <table>
          <thead><tr><th>Name</th><th>Slug</th><th>Status</th><th>Created</th><th></th></tr></thead>
          <tbody>
            ${rows || '<tr><td colspan="5" style="color:var(--text-dim);padding:24px;">No projects yet. Create your first project to get started.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* ---- Project Detail ---- */
async function renderProjectDetail(projectId) {
  let project = null;
  try {
    const data = await api(`/projects/${projectId}`);
    project = data.project;
  } catch (err) {
    if (err.status === 404 || err.status === 401) {
      return `
        <div class="dash-empty comingsoon">
          <div class="status-chip">NOT FOUND</div>
          <h3>Project Not Found</h3>
          <p>This project does not exist or you do not have access to it.</p>
          <button class="btn btn-primary" onclick="showPanel('projects')" style="margin-top:16px;">[ Back to Projects ]</button>
        </div>
      `;
    }
    throw err;
  }

  const tab = currentProjectId === projectId ? "overview" : "overview";
  const tabs = ["overview", "environment", "settings"];

  let body = "";
  if (tab === "overview") {
    body = `
      <div class="dash-grid">
        <div class="panel">
          <div class="panel-head"><span>Project Information</span><span class="id">[PROJ.INFO]</span></div>
          <div class="panel-body">
            <div class="term-row" style="border-bottom:1px dashed var(--border);padding:8px 0;"><span class="k">NAME</span><span class="v">${project.name}</span></div>
            <div class="term-row" style="border-bottom:1px dashed var(--border);padding:8px 0;"><span class="k">SLUG</span><span class="v">${project.slug}</span></div>
            <div class="term-row" style="border-bottom:1px dashed var(--border);padding:8px 0;"><span class="k">PROJECT ID</span><span class="v">${project.id}</span></div>
            <div class="term-row" style="border-bottom:1px dashed var(--border);padding:8px 0;"><span class="k">STATUS</span><span class="v ok">${project.status}</span></div>
            <div class="term-row" style="border-bottom:1px dashed var(--border);padding:8px 0;"><span class="k">CREATED</span><span class="v">${new Date(project.created_at).toLocaleString()}</span></div>
            <div class="term-row" style="padding:8px 0;"><span class="k">UPDATED</span><span class="v">${new Date(project.updated_at).toLocaleString()}</span></div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><span>Actions</span><span class="id">[PROJ.CTL]</span></div>
          <div class="panel-body">
            <button class="btn btn-primary btn-block" onclick="handleRenameProject(${project.id})" style="margin-bottom:12px;">[ Rename Project ]</button>
            <button class="btn btn-danger btn-block" onclick="handleDeleteProject(${project.id})">[ Delete Project ]</button>
            <p class="demo-note" style="margin-top:12px;">Deployments and infrastructure provisioning are not yet available.</p>
          </div>
        </div>
      </div>
    `;
  } else if (tab === "environment") {
    body = await renderEnvTab(project);
  } else if (tab === "settings") {
    body = `
      <div class="panel">
        <div class="panel-head"><span>Project Settings</span><span class="id">[PROJ.SETTINGS]</span></div>
        <div class="panel-body">
          <div class="form-row">
            <label>Project Name</label>
            <input type="text" value="${project.name}" id="settingsProjectName" maxlength="100">
          </div>
          <div class="form-row">
            <label>Project Slug</label>
            <input type="text" value="${project.slug}" id="settingsProjectSlug" maxlength="40">
          </div>
          <div class="form-actions">
            <button class="btn" onclick="showPanel('projects')">[ Cancel ]</button>
            <button class="btn btn-primary" onclick="saveProjectSettings(${project.id})">[ Save Changes ]</button>
          </div>
        </div>
      </div>
      <div class="panel" style="margin-top:20px;">
        <div class="panel-head"><span>Danger Zone</span><span class="id">[PROJ.DANGER]</span></div>
        <div class="panel-body">
          <p style="color:var(--text-mid);font-size:13px;margin-bottom:16px;">Once deleted, this project cannot be recovered.</p>
          <button class="btn btn-danger" onclick="handleDeleteProject(${project.id})">[ Delete Project ]</button>
        </div>
      </div>
    `;
  }

  return `
    <button class="project-back" onclick="showPanel('projects')">← Back to Projects</button>
    <div class="project-head">
      <div>
        <h1 style="font-family:var(--font-display);font-size:22px;text-transform:uppercase;letter-spacing:.03em;">Project // ${project.name}</h1>
        <div class="breadcrumb" style="font-size:11px;color:var(--text-dim);letter-spacing:.06em;margin-top:4px;">DASHBOARD // PROJECTS // ${project.slug.toUpperCase()}</div>
      </div>
      ${statusBadge(project.status)}
    </div>
    <div class="project-info-row">
      <div class="project-info-cell"><div class="label">Slug</div><div class="value">${project.slug}</div></div>
      <div class="project-info-cell"><div class="label">Project ID</div><div class="value">#${project.id}</div></div>
      <div class="project-info-cell"><div class="label">Status</div><div class="value">${project.status}</div></div>
      <div class="project-info-cell"><div class="label">Created</div><div class="value">${new Date(project.created_at).toLocaleDateString()}</div></div>
    </div>
    <div class="project-tabs">
      ${tabs.map(t => `<button class="project-tab ${t === tab ? "active" : ""}" onclick="setProjectTab('${t}', ${project.id})">${t}</button>`).join("")}
    </div>
    ${body}
  `;
}

function showProjectDetail(projectId) {
  currentProjectId = projectId;
  currentPanel = "project-detail";
  document.querySelectorAll(".dash-nav-item").forEach(btn => btn.classList.remove("active"));
  renderPanel("project-detail");
}

function setProjectTab(tab, projectId) {
  // Re-render with the tab context preserved via currentProjectId
  renderPanel("project-detail");
  // Note: for a more complete implementation, we'd track the active tab per project
  // For simplicity in v0.1.0, we just re-render the overview tab
}

/* ---- Account ---- */
function renderAccount() {
  if (!currentUser) {
    return `
      <div class="dash-empty comingsoon">
        <div class="status-chip">UNAUTHORIZED</div>
        <h3>Access Denied</h3>
        <p>Please log in to view your account.</p>
      </div>
    `;
  }

  return `
    <div class="dash-topline">
      <div>
        <h1>Account</h1>
        <div class="breadcrumb">DASHBOARD // ACCOUNT</div>
      </div>
      <span class="env-tag">Preview Environment</span>
    </div>
    <div class="panel">
      <div class="panel-head"><span>Profile</span><span class="id">[USER.PROFILE]</span></div>
      <div class="panel-body">
        <div class="account-grid">
          <div class="account-cell"><div class="label">Name</div><div class="value">${currentUser.name}</div></div>
          <div class="account-cell"><div class="label">Email</div><div class="value">${currentUser.email}</div></div>
          <div class="account-cell"><div class="label">User ID</div><div class="value">#${currentUser.id}</div></div>
          <div class="account-cell"><div class="label">Member Since</div><div class="value">${new Date(currentUser.created_at).toLocaleDateString()}</div></div>
        </div>
        <p class="demo-note" style="margin-top:16px;">Profile editing will be available in a future release.</p>
      </div>
    </div>
    <div class="panel" style="margin-top:20px;">
      <div class="panel-head"><span>Session</span><span class="id">[USER.SESSION]</span></div>
      <div class="panel-body">
        <button class="btn btn-danger" onclick="handleLogout()">[ Logout ]</button>
      </div>
    </div>
  `;
}


/* ---- Environment Variables ---- */
async function renderEnvTab(project) {
  let vars = [];
  try {
    const data = await api(`/projects/${project.id}/env`);
    vars = data.vars;
  } catch (e) {
    return `
      <div class="panel">
        <div class="dash-empty comingsoon">
          <div class="status-chip">ERROR</div>
          <h3>Failed to Load Variables</h3>
          <p>Could not retrieve environment variables.</p>
        </div>
      </div>
    `;
  }

  const rows = vars.map(v => `
    <tr>
      <td style="font-family:var(--font-mono);color:var(--accent-2);">${v.key}</td>
      <td>
        <span class="env-mask" id="mask-${v.id}" onclick="toggleMask(${v.id}, '${encodeURIComponent(v.value)}')">${"•".repeat(Math.min(v.value.length, 16))}</span>
        <span class="env-value" id="val-${v.id}" style="display:none;font-family:var(--font-mono);">${v.value.replace(/</g, "&lt;")}</span>
      </td>
      <td>${timeAgo(new Date(v.created_at).getTime())}</td>
      <td>
        <button class="btn btn-ghost-sm" onclick="editEnvVar(${project.id}, ${v.id}, '${v.key.replace(/'/g, "\'")}', '${encodeURIComponent(v.value)}')">Edit</button>
        <button class="btn btn-ghost-sm" onclick="deleteEnvVar(${project.id}, ${v.id})">Delete</button>
      </td>
    </tr>
  `).join("");

  return `
    <div class="panel">
      <div class="panel-head"><span>Environment Variables</span><span class="id">[PROJ.ENV]</span></div>
      <div class="panel-body">
        <p style="color:var(--text-mid);font-size:12.5px;margin-bottom:16px;">Configuration values for this project. Stored in the database. Click a masked value to reveal.</p>
        <div class="table-scroll" style="margin-bottom:16px;">
          <table>
            <thead><tr><th>Key</th><th>Value</th><th>Created</th><th></th></tr></thead>
            <tbody>
              ${rows || '<tr><td colspan="4" style="color:var(--text-dim);padding:24px;">No environment variables configured.</td></tr>'}
            </tbody>
          </table>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openAddEnvModal(${project.id})">[ + Add Variable ]</button>
      </div>
    </div>
  `;
}

function toggleMask(id, encodedValue) {
  const mask = document.getElementById(`mask-${id}`);
  const val = document.getElementById(`val-${id}`);
  if (!mask || !val) return;
  if (val.style.display === "none") {
    mask.style.display = "none";
    val.style.display = "inline";
  } else {
    mask.style.display = "inline";
    val.style.display = "none";
  }
}

function openAddEnvModal(projectId) {
  const key = prompt("Enter variable key (UPPERCASE, letters/numbers/underscore, starts with letter):");
  if (!key || !key.trim()) return;
  const value = prompt("Enter variable value:");
  if (value === null) return;
  handleAddEnvVar(projectId, key.trim(), value);
}

async function handleAddEnvVar(projectId, key, value) {
  try {
    await api(`/projects/${projectId}/env`, { method: "POST", body: { key, value } });
    pushToast("Variable Added", `${key} has been created.`, "success");
    renderPanel("project-detail");
  } catch (err) {
    const msg = {
      "ENV_KEY_REQUIRED": "Key is required.",
      "INVALID_ENV_KEY": "Invalid key format. Use UPPERCASE letters, numbers, and underscores. Must start with a letter.",
      "ENV_VALUE_TOO_LONG": "Value must be under 2048 characters.",
      "ENV_KEY_EXISTS": "This key already exists for this project.",
    }[err.code] || (err.message || "Failed to add variable.");
    pushToast("Error", msg, "danger");
  }
}

function editEnvVar(projectId, varId, currentKey, encodedValue) {
  const key = prompt("Enter new key:", currentKey);
  if (!key || !key.trim()) return;
  const value = prompt("Enter new value:", decodeURIComponent(encodedValue));
  if (value === null) return;
  handleUpdateEnvVar(projectId, varId, key.trim(), value);
}

async function handleUpdateEnvVar(projectId, varId, key, value) {
  try {
    await api(`/projects/${projectId}/env/${varId}`, { method: "PUT", body: { key, value } });
    pushToast("Variable Updated", `${key} has been updated.`, "success");
    renderPanel("project-detail");
  } catch (err) {
    const msg = {
      "ENV_KEY_REQUIRED": "Key is required.",
      "INVALID_ENV_KEY": "Invalid key format. Use UPPERCASE letters, numbers, and underscores. Must start with a letter.",
      "ENV_VALUE_TOO_LONG": "Value must be under 2048 characters.",
      "ENV_KEY_EXISTS": "This key already exists for this project.",
      "ENV_VAR_NOT_FOUND": "Variable not found.",
    }[err.code] || (err.message || "Failed to update variable.");
    pushToast("Error", msg, "danger");
  }
}

async function deleteEnvVar(projectId, varId) {
  if (!confirm("Delete this environment variable?")) return;
  try {
    await api(`/projects/${projectId}/env/${varId}`, { method: "DELETE" });
    pushToast("Variable Deleted", "Environment variable has been removed.", "success");
    renderPanel("project-detail");
  } catch (err) {
    pushToast("Error", "Failed to delete variable.", "danger");
  }
}

/* ---- Coming Soon ---- */
function renderComingSoon(name) {
  return `
    <div class="dash-topline">
      <div>
        <h1>${name}</h1>
        <div class="breadcrumb">DASHBOARD // ${name.toUpperCase()}</div>
      </div>
    </div>
    <div class="panel">
      <div class="dash-empty comingsoon">
        <div class="status-chip">Not Enabled</div>
        <h3>${name}</h3>
        <p>${name} hasn't been built yet. It's on the roadmap and will be available in a future release of Pixar Labs.</p>
      </div>
    </div>
  `;
}

/* ---- Project CRUD ---- */
function openCreateProjectModal() {
  document.getElementById("createProjectForm")?.reset();
  document.getElementById("createOverlay")?.classList.add("open");
  setTimeout(() => document.getElementById("fProjectName")?.focus(), 50);
}

function closeCreateModal() {
  document.getElementById("createOverlay")?.classList.remove("open");
}

document.getElementById("createOverlay")?.addEventListener("click", e => {
  if (e.target.id === "createOverlay") closeCreateModal();
});

async function handleCreateProject(e) {
  e.preventDefault();
  const name = document.getElementById("fProjectName").value.trim();
  const slug = document.getElementById("fProjectSlug").value.trim().toLowerCase();

  if (!name) { pushToast("Error", "Project name is required.", "danger"); return; }
  if (!slug) { pushToast("Error", "Project slug is required.", "danger"); return; }
  if (!/^[a-z][a-z0-9-]{2,39}$/.test(slug)) {
    pushToast("Error", "Invalid slug format. Use lowercase letters, numbers, and hyphens. Must start with a letter.", "danger");
    return;
  }

  try {
    await api("/projects", { method: "POST", body: { name, slug } });
    closeCreateModal();
    pushToast("Project Created", `${name} has been created.`, "success");
    showPanel("projects");
  } catch (err) {
    const msg = {
      "PROJECT_NAME_REQUIRED": "Project name is required.",
      "PROJECT_SLUG_REQUIRED": "Project slug is required.",
      "INVALID_PROJECT_SLUG": "Invalid slug format.",
      "SLUG_ALREADY_EXISTS": "You already have a project with this slug.",
      "UNAUTHORIZED": "Please log in to create a project.",
    }[err.code] || (err.message || "Failed to create project.");
    pushToast("Error", msg, "danger");
  }
}

async function handleDeleteProject(projectId) {
  if (!confirm("Delete this project? This cannot be undone.")) return;
  try {
    await api(`/projects/${projectId}`, { method: "DELETE" });
    pushToast("Project Deleted", "Project has been removed.", "success");
    showPanel("projects");
  } catch (err) {
    pushToast("Error", err.code === "PROJECT_NOT_FOUND" ? "Project not found." : "Failed to delete project.", "danger");
  }
}

async function handleRenameProject(projectId) {
  const newName = prompt("Enter new project name:");
  if (!newName || !newName.trim()) return;
  try {
    await api(`/projects/${projectId}`, { method: "PUT", body: { name: newName.trim() } });
    pushToast("Project Updated", "Name has been changed.", "success");
    renderPanel("project-detail");
  } catch (err) {
    pushToast("Error", "Failed to rename project.", "danger");
  }
}

async function saveProjectSettings(projectId) {
  const name = document.getElementById("settingsProjectName")?.value.trim();
  const slug = document.getElementById("settingsProjectSlug")?.value.trim().toLowerCase();
  if (!name) { pushToast("Error", "Project name is required.", "danger"); return; }
  if (!slug) { pushToast("Error", "Project slug is required.", "danger"); return; }
  if (!/^[a-z][a-z0-9-]{2,39}$/.test(slug)) {
    pushToast("Error", "Invalid slug format.", "danger"); return;
  }
  try {
    await api(`/projects/${projectId}`, { method: "PUT", body: { name, slug } });
    pushToast("Project Updated", "Settings saved successfully.", "success");
    renderPanel("project-detail");
  } catch (err) {
    const msg = {
      "SLUG_ALREADY_EXISTS": "You already have a project with this slug.",
      "INVALID_PROJECT_SLUG": "Invalid slug format.",
    }[err.code] || "Failed to update project.";
    pushToast("Error", msg, "danger");
  }
}

/* ---- Helpers ---- */
function statusBadge(status) {
  const map = { ONLINE: "on", DEPLOYING: "cyan", QUEUED: "warn", BUILDING: "warn",
    FAILED: "danger", Running: "on", Idle: "warn", INITIALIZING: "warn", READY: "on", ACTIVE: "on" };
  const cls = map[status] || "neutral";
  const dotCls = cls === "on" ? "" : cls === "cyan" ? "cyan" : cls === "warn" ? "warn" : cls === "danger" ? "danger" : "neutral";
  return `<span class="badge ${cls}"><span class="status-dot ${dotCls}"></span> ${status}</span>`;
}

function timeAgo(ts) {
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  return Math.floor(hrs / 24) + "d ago";
}

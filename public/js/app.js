/* ============================================================
   PIXAR LABS — SHARED FRONTEND
   API client, toast, command palette, auth state, canvas, infra
   ============================================================ */

const API_BASE = "/api";

/* ---- API Client ---- */
async function api(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const opts = {
    headers: { "Content-Type": "application/json", ...options.headers },
    credentials: "include",
    ...options,
  };
  if (opts.body && typeof opts.body === "object") opts.body = JSON.stringify(opts.body);

  const response = await fetch(url, opts);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `HTTP ${response.status}`);
    error.code = data.error;
    error.status = response.status;
    throw error;
  }
  return data;
}

/* ---- Auth State ---- */
let currentUser = null;

async function checkAuthState() {
  try {
    const data = await api("/auth/me");
    currentUser = data.user;
    updateNavAuth();
    return true;
  } catch (e) {
    currentUser = null;
    updateNavAuth();
    return false;
  }
}

function updateNavAuth() {
  const isAuthed = !!currentUser;

  const els = {
    loginBtn: document.getElementById("navLoginBtn"),
    registerBtn: document.getElementById("navRegisterBtn"),
    dashboardLink: document.getElementById("navDashboardLink"),
    userArea: document.getElementById("navUserArea"),
    userName: document.getElementById("navUserName"),
    heroCtaRegister: document.getElementById("heroCtaRegister"),
    heroCtaDashboard: document.getElementById("heroCtaDashboard"),
    footerLogin: document.getElementById("footerLoginBtn"),
    mobileLogin: document.getElementById("mobileLoginBtn"),
    mobileRegister: document.getElementById("mobileRegisterBtn"),
    mobileLogout: document.getElementById("mobileLogoutBtn"),
    mobileDashboard: document.getElementById("mobileDashboardLink"),
  };

  if (isAuthed) {
    if (els.loginBtn) els.loginBtn.style.display = "none";
    if (els.registerBtn) els.registerBtn.style.display = "none";
    if (els.dashboardLink) els.dashboardLink.style.display = "inline-flex";
    if (els.userArea) { els.userArea.style.display = "flex"; els.userName.textContent = currentUser.name; }
    if (els.heroCtaRegister) els.heroCtaRegister.style.display = "none";
    if (els.heroCtaDashboard) els.heroCtaDashboard.style.display = "inline-flex";
    if (els.footerLogin) els.footerLogin.style.display = "none";
    if (els.mobileLogin) els.mobileLogin.style.display = "none";
    if (els.mobileRegister) els.mobileRegister.style.display = "none";
    if (els.mobileLogout) els.mobileLogout.style.display = "block";
    if (els.mobileDashboard) els.mobileDashboard.style.display = "block";
  } else {
    if (els.loginBtn) els.loginBtn.style.display = "inline-flex";
    if (els.registerBtn) els.registerBtn.style.display = "inline-flex";
    if (els.dashboardLink) els.dashboardLink.style.display = "none";
    if (els.userArea) els.userArea.style.display = "none";
    if (els.heroCtaRegister) els.heroCtaRegister.style.display = "inline-flex";
    if (els.heroCtaDashboard) els.heroCtaDashboard.style.display = "none";
    if (els.footerLogin) els.footerLogin.style.display = "block";
    if (els.mobileLogin) els.mobileLogin.style.display = "block";
    if (els.mobileRegister) els.mobileRegister.style.display = "block";
    if (els.mobileLogout) els.mobileLogout.style.display = "none";
    if (els.mobileDashboard) els.mobileDashboard.style.display = "none";
  }
}

async function handleLogout() {
  try {
    await api("/auth/logout", { method: "POST" });
    currentUser = null;
    pushToast("Logged Out", "See you next time.", "info");
    window.location.href = "index.html";
  } catch (err) {
    pushToast("Error", "Failed to log out.", "danger");
  }
}

/* ---- Toast ---- */
function pushToast(headline, message, type) {
  const stack = document.getElementById("toastStack");
  if (!stack) return;
  const el = document.createElement("div");
  el.className = "toast" + (type ? " " + type : "");
  el.innerHTML = `<div class="t-head">${headline}</div><div class="t-msg">${message}</div>`;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .3s ease, transform .3s ease";
    el.style.opacity = "0";
    el.style.transform = "translateX(14px)";
    setTimeout(() => el.remove(), 320);
  }, 4200);
}

/* ---- Command Palette ---- */
const COMMANDS = [
  { label: "Create project", run: () => { closeCmdk(); openCreateProjectModal?.(); } },
  { label: "View projects", run: () => { closeCmdk(); window.location.href = "dashboard.html#projects"; } },
  { label: "Open dashboard", run: () => { closeCmdk(); window.location.href = "dashboard.html"; } },
  { label: "Go to infrastructure", run: () => { closeCmdk(); window.location.href = "index.html#infrastructure"; } },
  { label: "Go to hosting", run: () => { closeCmdk(); window.location.href = "index.html#hosting"; } },
  { label: "Login", run: () => { closeCmdk(); window.location.href = "login.html"; } },
  { label: "Register", run: () => { closeCmdk(); window.location.href = "signup.html"; } },
  { label: "Logout", run: () => { closeCmdk(); handleLogout(); } },
];

let cmdkActive = 0;
let cmdkFiltered = COMMANDS;

function openCmdk() {
  const overlay = document.getElementById("cmdkOverlay");
  if (!overlay) return;
  overlay.classList.add("open");
  document.getElementById("cmdkInput").value = "";
  cmdkActive = 0;
  renderCmdkList(COMMANDS);
  setTimeout(() => document.getElementById("cmdkInput").focus(), 30);
}

function closeCmdk() {
  const overlay = document.getElementById("cmdkOverlay");
  if (overlay) overlay.classList.remove("open");
}

function renderCmdkList(list) {
  cmdkFiltered = list;
  const el = document.getElementById("cmdkList");
  if (!el) return;
  if (list.length === 0) {
    el.innerHTML = '<div class="cmdk-empty">No matching commands.</div>';
    return;
  }
  el.innerHTML = list.map((c, i) => `
    <button class="cmdk-item ${i === cmdkActive ? "active" : ""}" onclick="cmdkFiltered[${i}].run()">
      <span class="chev">&gt;</span> ${c.label}
    </button>
  `).join("");
}

function initCommandPalette() {
  const input = document.getElementById("cmdkInput");
  if (!input) return;

  input.addEventListener("input", e => {
    const q = e.target.value.toLowerCase();
    cmdkActive = 0;
    renderCmdkList(COMMANDS.filter(c => c.label.toLowerCase().includes(q)));
  });

  input.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { e.preventDefault(); cmdkActive = Math.min(cmdkActive + 1, cmdkFiltered.length - 1); renderCmdkList(cmdkFiltered); }
    else if (e.key === "ArrowUp") { e.preventDefault(); cmdkActive = Math.max(cmdkActive - 1, 0); renderCmdkList(cmdkFiltered); }
    else if (e.key === "Enter") { e.preventDefault(); if (cmdkFiltered[cmdkActive]) cmdkFiltered[cmdkActive].run(); }
    else if (e.key === "Escape") { closeCmdk(); }
  });

  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openCmdk();
    } else if (e.key === "Escape") {
      closeCmdk();
    }
  });

  const overlay = document.getElementById("cmdkOverlay");
  if (overlay) overlay.addEventListener("click", e => { if (e.target.id === "cmdkOverlay") closeCmdk(); });
}

/* ---- Status Modal ---- */
const STATUS_COPY = {
  "coming-soon": {
    chip: "Not Enabled",
    msg: (name) => `${name} hasn't been built yet. It's on the roadmap and will be available in a future release of Pixar Labs.`,
  },
};

function showStatusModal(feature) {
  const copy = STATUS_COPY["coming-soon"];
  const box = document.getElementById("modalBox");
  if (!box) return;
  box.className = "modal-box comingsoon";
  document.getElementById("modalBarLabel").textContent = "Module Status";
  document.getElementById("modalChip").textContent = copy.chip;
  document.getElementById("modalTitle").textContent = feature;
  document.getElementById("modalMsg").textContent = copy.msg(feature);
  document.getElementById("modalOverlay").classList.add("open");
}

function closeModal() {
  const overlay = document.getElementById("modalOverlay");
  if (overlay) overlay.classList.remove("open");
}

const modalOverlay = document.getElementById("modalOverlay");
if (modalOverlay) modalOverlay.addEventListener("click", e => { if (e.target.id === "modalOverlay") closeModal(); });

/* ---- Mobile Menu ---- */
function toggleMobileMenu() {
  const menu = document.getElementById("mobileMenu");
  if (menu) menu.classList.toggle("open");
}

/* ---- Network Canvas ---- */
function initNetworkCanvas() {
  const canvas = document.getElementById("netCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let w, h, nodes;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resize() {
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
    const count = Math.max(18, Math.min(46, Math.floor((w * h) / 28000)));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15
    }));
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);
    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
    }
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 150) {
          ctx.strokeStyle = `rgba(53,226,255,${(1 - d / 150) * 0.18})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    for (const n of nodes) {
      ctx.fillStyle = "rgba(200,255,61,0.55)";
      ctx.fillRect(n.x - 1, n.y - 1, 2, 2);
    }
    if (!reduced) requestAnimationFrame(tick);
  }

  window.addEventListener("resize", resize);
  resize();
  if (!reduced) requestAnimationFrame(tick);
  else tick();
}

/* ---- Infrastructure ---- */
const INFRA_GROUPS = [
  { label: "Core Infrastructure", num: "01", items: [
    { tag: "[COMPUTE]", title: "Compute", desc: "Dedicated and burstable compute tuned for latency-sensitive workloads." },
    { tag: "[RUNTIME]", title: "Container Hosting", desc: "Isolated runtime environments, orchestrated across the edge." },
    { tag: "[STORAGE]", title: "NVMe Storage", desc: "Sub-millisecond local storage backing every node in the network." },
    { tag: "[NET_EDGE]", title: "Global Edge Network", desc: "Edge nodes across multiple regions, routing requests to the nearest node." },
  ]},
  { label: "Platform Services", num: "02", items: [
    { tag: "[DEPLOY]", title: "Automated Deployments", desc: "Push-to-deploy pipelines with instant rollback checkpoints." },
    { tag: "[GATEWAY]", title: "API Infrastructure", desc: "Managed gateways with rate-limiting, auth, and key rotation." },
    { tag: "[DATA]", title: "Database Hosting", desc: "Managed relational and key-value stores with automated failover." },
    { tag: "[DOMAIN]", title: "Custom Domains", desc: "Attach and route your own domains directly at the edge." },
    { tag: "[SECURE]", title: "SSL / TLS", desc: "Automatic certificate issuance, rotation, and renewal." },
  ]},
  { label: "Observability", num: "03", items: [
    { tag: "[TELEMETRY]", title: "Monitoring", desc: "Real-time telemetry and alerting across every deployed node." },
    { tag: "[ARCHIVE]", title: "Backups", desc: "Scheduled snapshots retained across redundant storage zones." },
  ]},
];

function renderInfra() {
  const wrap = document.getElementById("infraGroups");
  if (!wrap) return;
  wrap.innerHTML = INFRA_GROUPS.map(g => `
    <div class="infra-group">
      <div class="infra-group-head">
        <span class="num">[GRP.${g.num}]</span>
        <h3>${g.label}</h3>
        <span class="count">${g.items.length} SERVICES</span>
      </div>
      <div class="infra-grid">
        ${g.items.map(it => `
          <div class="infra-card">
            <span class="tag">${it.tag}</span>
            <h4>${it.title}</h4>
            <p>${it.desc}</p>
          </div>
        `).join("")}
      </div>
    </div>
  `).join("");
}

/* ---- Plans ---- */
const PLANS = [
  { name: "Node // Starter", desc: "For prototypes and small projects.", priceMonthly: 9, priceAnnual: 7, featured: false,
    specs: [["CPU", "1 vCPU"], ["Memory", "1 GB RAM"], ["Storage", "10 GB NVMe"], ["Bandwidth", "1 TB / mo"], ["Deployments", "Basic pipeline"]] },
  { name: "Node // Pro", desc: "For production applications and APIs.", priceMonthly: 29, priceAnnual: 24, featured: true,
    specs: [["CPU", "2 vCPU"], ["Memory", "4 GB RAM"], ["Storage", "50 GB NVMe"], ["Bandwidth", "5 TB / mo"], ["Deployments", "Advanced pipeline"]] },
  { name: "Node // Core", desc: "For high-throughput infrastructure.", priceMonthly: 79, priceAnnual: 65, featured: false,
    specs: [["CPU", "4 vCPU"], ["Memory", "8 GB RAM"], ["Storage", "100 GB NVMe"], ["Bandwidth", "Unmetered"], ["Deployments", "Priority infrastructure"]] },
];

let cycle = "monthly";

function setCycle(c) {
  cycle = c;
  const tm = document.getElementById("toggleMonthly");
  const ta = document.getElementById("toggleAnnual");
  if (tm) tm.classList.toggle("active", c === "monthly");
  if (ta) ta.classList.toggle("active", c === "annual");
  renderPlans();
}

function renderPlans() {
  const grid = document.getElementById("plansGrid");
  if (!grid) return;
  grid.innerHTML = PLANS.map(p => {
    const price = cycle === "monthly" ? p.priceMonthly : p.priceAnnual;
    return `
    <div class="plan ${p.featured ? "featured" : ""} plan-disabled">
      ${p.featured ? '<span class="plan-tag">Recommended</span>' : '<span class="plan-soon">Coming Soon</span>'}
      <h3>${p.name}</h3>
      <div class="desc">${p.desc}</div>
      <div class="price"><sup>$</sup>${price}<small>/mo</small></div>
      <div class="cycle-note">${cycle === "monthly" ? "Billed monthly" : "Billed annually"}</div>
      <ul>${p.specs.map(s => `<li><span>${s[0]}</span><b>${s[1]}</b></li>`).join("")}</ul>
      <button class="btn btn-primary btn-block" onclick="showStatusModal('Hosting')">[ Deploy Node ]</button>
    </div>`;
  }).join("");
}

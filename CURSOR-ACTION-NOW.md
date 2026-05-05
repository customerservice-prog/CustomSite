# CURSOR-ACTION-NOW.md

**Immediate fixes needed — verified by Claude live audit May 5 2026**  
Do these in **EXACT ORDER** listed. Do not skip any step.

---

## WHAT CLAUDE ALREADY VERIFIED (no guesswork)

- **CUSTOMSITE_DOMAIN_PROJECT_MAP** — already set in Railway with ALL domains (`theeyeisi.com`, `thesoulvault.org`, `jordanmaxwell.org`, `cestuiquevietrust.com`, etc.). The env var is **CORRECT**. The problem is **DNS**, not the env var.

- **cestuiquevietrust.com JavaScript** — **CLEAN.** No syntax error found. The earlier audit report was wrong. JS validates fine.

- **ANTHROPIC_API_KEY** = `"PASTE_YOUR_ANTHROPIC_KEY_HERE"` — still a **placeholder**. The AI Builder will **not** use real Claude until Bryan replaces this with his real key.

- **thesoulvault.org** — **IS** in Railway custom domains but shows **"Waiting for DNS update"**. The domain's DNS is not pointing to Railway's servers.

- **theeyeisi.com** — **NOT** in Railway custom domains at all. It's in `CUSTOMSITE_DOMAIN_PROJECT_MAP` but Railway may not terminate TLS / accept the host until the domain is attached **and** DNS routes here. Same pattern for **jordanmaxwell.org** if not listed.

- **Calendar** shows **April 2026** — confirmed live. No prev/next buttons exist. The `currentMonth` state is hardcoded. **Must be fixed in source code.**

---

## STEP 1 — Bryan must do this (not Cursor): Set ANTHROPIC_API_KEY

1. Go to `console.anthropic.com` → Get API Keys → Create new key  
2. Go to Railway → CustomSite service → Variables → Raw Editor  
3. Find this line at the bottom:  
   `ANTHROPIC_API_KEY="PASTE_YOUR_ANTHROPIC_KEY_HERE"`  
4. Replace the value with your real key:  
   `ANTHROPIC_API_KEY="sk-ant-api03-..."`  
5. Click **Update Variables**  
6. Railway will redeploy automatically  

This single step enables the AI Builder. Do it before anything else.

---

## STEP 2 — DNS: Fix the 3 downed sites

The `CUSTOMSITE_DOMAIN_PROJECT_MAP` is correct. The issue is **DNS**. These domains need their DNS pointed at Railway.

### Option A (if you have Cloudflare access)

For each domain below, log into Cloudflare → DNS → add:

- **Type:** CNAME  
- **Name:** @ (apex) — *if your DNS provider allows apex CNAME; otherwise use A/ALIAS per Railway*  
- **Target:** `[your railway .up.railway.app URL]` — *use exact target from Railway “Show DNS records”*  
- **Proxy:** ON (orange cloud)  

**Domains to fix:**

- **thesoulvault.org** → already in Railway custom domains; fix DNS only  
- **theeyeisi.com** → needs **both** DNS **and** Railway custom domain entry (if your setup requires it)  
- **jordanmaxwell.org** → same as above  

### Option B (if Railway has domain slots)

Since you may have only a few domains in Railway (e.g. `thesoulvault.org`, `customsite.online`, `www.customsite.online`), you may have free slots. Add:

- `theeyeisi.com`  
- `www.theeyeisi.com`  
- `jordanmaxwell.org`  
- `www.jordanmaxwell.org`  

Then fix their DNS to point at Railway (click **Show DNS records** in Railway for the exact CNAME/A values).

For **thesoulvault.org** (already in Railway) — fix DNS at the registrar to match Railway’s required records.

---

## STEP 3 — Cursor: Fix the Calendar (1-line code fix)

Search the codebase for the Calendar component:

- `src/components/Calendar.jsx` OR `src/pages/Calendar.jsx`  
- OR search `src/` for `"April 2026"` or a `useState` that initializes to a fixed date  

**FIND** this pattern (exact pattern may vary):

```js
// BROKEN — one of these patterns:
const [currentMonth, setCurrentMonth] = useState(new Date('2026-04-01'));
const [currentMonth, setCurrentMonth] = useState(new Date(2026, 3, 1));
const [viewDate, setViewDate] = useState({ year: 2026, month: 3 });
const [month, setMonth] = useState(4); // 4 = April
```

**REPLACE WITH:**

```js
// FIXED — always initializes to actual current month
const [currentMonth, setCurrentMonth] = useState(() => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
});
```

**Also add** prev/next navigation buttons if they don't exist:

```jsx
<button
  type="button"
  onClick={() =>
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }
>
  ‹
</button>
<span>
  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
</span>
<button
  type="button"
  onClick={() =>
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }
>
  ›
</button>
```

---

## STEP 4 — Cursor: Add default tasks when project is created

**File:** `routes/admin.js` (or wherever `POST /api/admin/projects` is handled)

After the project **INSERT** succeeds:

```js
const DEFAULT_TASKS = [
  { title: 'Collect client brief & assets', priority: 'high' },
  { title: 'Build wireframe / site structure', priority: 'high' },
  { title: 'Build site in Studio', priority: 'high' },
  { title: 'Client review round 1', priority: 'medium' },
  { title: 'Apply client revisions', priority: 'medium' },
  { title: 'Set up custom domain & DNS', priority: 'medium' },
  { title: 'Final QA — mobile + desktop', priority: 'high' },
  { title: 'Launch & post-launch check-in', priority: 'high' },
];

await supabase.from('tasks').insert(
  DEFAULT_TASKS.map((t) => ({
    project_id: newProject.id,
    agency_id: agencyId,
    title: t.title,
    status: 'todo',
    priority: t.priority,
    created_at: new Date().toISOString(),
  }))
);
```

*(Adjust column names to match your Supabase `tasks` schema.)*

---

## STEP 5 — Cursor: Set `launched_at` when project is published

**File:** `routes/admin.js` or `routes/siteBuilder.js` — find the POST/PUT route that handles **Publish**.

After successful publish:

```js
await supabase
  .from('projects')
  .update({ launched_at: new Date().toISOString() })
  .eq('id', projectId);
```

This enables site analytics. Without it, projects may show **0** views indefinitely if analytics key off `launched_at`.

---

## STEP 6 — Cursor: Fix Notification Bell

The bell icon in the header exists but does nothing.

Find the component — search for `"notifications"` or the bell SVG in `src/`.

**Add endpoint first** — `routes/dashboard.js` or `routes/admin.js`:

```js
router.get('/notifications', requireAuth, async (req, res) => {
  const { agencyId } = req.auth;
  const notifications = [];

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: quietProjects } = await supabase
    .from('projects')
    .select('id, name, updated_at')
    .eq('agency_id', agencyId)
    .lt('updated_at', sevenDaysAgo)
    .neq('status', 'complete');

  (quietProjects || []).forEach((p) =>
    notifications.push({
      type: 'quiet',
      icon: '🔕',
      label: `${p.name} — no activity in 7+ days`,
      href: `#/projects/${p.id}`,
    })
  );

  res.json({ notifications });
});
```

**Then** wire the bell (use your existing `adminFetchJson` / auth pattern instead of raw `fetch` if that’s what the SPA uses):

```jsx
const [open, setOpen] = useState(false);
const [notifications, setNotifications] = useState([]);

useEffect(() => {
  adminFetchJson('/api/admin/notifications').then((r) => {
    if (r.ok && r.data?.notifications) setNotifications(r.data.notifications);
  });
}, []);

<button type="button" onClick={() => setOpen(!open)} className="relative">
  {/* bell icon */}
  {notifications.length > 0 && (
    <span className="badge">{notifications.length}</span>
  )}
</button>

{open && (
  <div className="dropdown">
    {notifications.length === 0 ? (
      <p>No alerts</p>
    ) : (
      notifications.map((n, i) => (
        <a key={i} href={n.href}>
          <span>{n.icon}</span> {n.label}
        </a>
      ))
    )}
  </div>
)}
```

---

## STEP 7 — Cursor: Rate limiting (security)

**File:** `server.js` — after the express import:

```js
const rateLimit = require('express-rate-limit');
```

After `express()` init:

```js
const contactLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use('/api/contact', contactLimiter);
app.use('/api/auth', authLimiter);
```

Install:

```bash
npm install express-rate-limit
```

---

## BRYAN — CRITICAL NOTICES

### 1. ustaxcode.com is SOLD

The domain `ustaxcode.com` is listed for sale on Afternic.com. Your US Tax Code project (`ustaxcode.org` — note **.org**, not .com) has 9 pages of site files saved but may be inaccessible publicly. Go to your domain registrar and verify you still own **ustaxcode.org**. If you meant `.com`, you need to re-buy it or switch to `.org` in project settings.

### 2. AI Builder will not work until you paste your real Anthropic API key

See Step 1. Without this, generation falls back when the key is missing/placeholder.

### 3. The downed sites (`theeyeisi.com`, `thesoulvault.org`, `jordanmaxwell.org`)

Are a **DNS** / **Railway networking** problem, not the map env var string. The domains need to be pointed at Railway (and attached in Railway where required). See Step 2. **Highest priority — client sites.**

### 4. Stripe is not connected

Settings → Billing → Connect Stripe. Without this, no invoices can be paid and billing shows $0 — configuration, not necessarily a code bug.

---

## SUMMARY TABLE

| Fix | Who | Effort | Impact |
|-----|-----|--------|--------|
| Add real `ANTHROPIC_API_KEY` | Bryan | 2 min | AI Builder works |
| Fix DNS for 3 downed sites | Bryan | 15 min | Client sites back online |
| Fix Calendar `currentMonth` | Cursor | 5 min | Calendar shows correct month |
| Add default tasks on project create | Cursor | 15 min | Projects start with workflow |
| Set `launched_at` on publish | Cursor | 5 min | Analytics start working |
| Build notification bell dropdown | Cursor | 1 hour | Admin has real alerts |
| Add rate limiting | Cursor | 10 min | Basic security |
| Connect Stripe | Bryan | 10 min | Billing system active |
| Notify Bryan about ustaxcode.com | Done | — | Domain may be lost |

---

## Session summary

- Verified Railway env vars — **`CUSTOMSITE_DOMAIN_PROJECT_MAP`** was set correctly with domains. **`ANTHROPIC_API_KEY`** still needs Bryan’s real key.  
- The three sites (`theeyeisi.com`, `thesoulvault.org`, `jordanmaxwell.org`) need **DNS** (and **Railway custom domains** where applicable); the routing map alone doesn’t fix public DNS.  
- **Cestui Que Vie** JS “syntax error” from an earlier audit was a **false positive** — code validates.  
- **Calendar** stuck on April 2026 with **no** navigation arrows — **code fix** required.  
- Tasks, notifications, analytics (`launched_at`), Stripe, rate limiting: **Cursor / backend** work, not browser-only.  

**Two things only Bryan can do quickly:** paste a real **Anthropic** key in Railway, and fix **DNS** / domain entries for the three sites — those unblock AI Builder and client visibility.

---

*Last updated: May 5 2026*

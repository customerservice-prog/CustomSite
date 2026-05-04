# Deploy Message Center assets (theeyeisi.com)

These files live as **site files** on CustomSite project **The Eye Is I** (`91e59663-81d5-4867-8f8d-59f3616b4203`) and are served from the CDN at **theeyeisi.com**.

## API

```
PUT https://customsite.online/api/admin/projects/91e59663-81d5-4867-8f8d-59f3616b4203/site/file
Authorization: Bearer <access_token>
Content-Type: application/json
```

Body:

```json
{
  "path": "inbox-app.js",
  "content": "<paste full file contents, escaped JSON string>"
}
```

- **Auth:** JWT from browser `localStorage` key `sb-awpmraducedwbabeunxl-auth-token` → parse JSON → `access_token`.
- **Refresh:** `POST https://customsite.online/api/auth/refresh` with `{ "refresh_token": "..." }` if the access token expires.

## Files to upload

| Path            | Repo mirror                    | Notes |
|-----------------|--------------------------------|-------|
| `inbox-app.js` | `sites/theeyeisi/inbox-app.js` | Message list UI, truncation, Top Source label. |

Optional: **`messages.html`** if you maintain CSS tweaks (e.g. `.stat-num--top-source`) in that file alongside the SPA shell.

## After upload

Hard-refresh the messages page (`Ctrl+Shift+R`) or bust cache via query string if your CDN caches aggressively.

## Security

Do **not** commit live JWTs or `SEED_AT` tokens. If production `inbox-app.js` requires a seeded token line, add it **only on the deployed file** after upload.

## Admin SPA (customsite.online)

Sidebar and **`#/messages-center`** ship with the repo: run `npm run build:admin` and deploy **`dist-admin/`** so the host serves the new bundle.

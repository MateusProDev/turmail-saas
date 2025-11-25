# Admin claim helper

This folder contains a small helper to set the Firebase custom claim `admin: true` for a user.

Usage (run from the repo root):

```
node ./scripts/setAdminClaim.js --uid <FIREBASE_UID> --admin true
```

Notes:
- The script uses `api/firebaseAdmin.js` to initialize the Admin SDK; ensure your server env vars or service account are available locally when running (for example, set `FIREBASE_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS`).
- After setting the claim the user must sign out and sign in again so the new ID token includes the claim.
- Prefer this approach for multi-admin SaaS: add multiple admin users by running the script for each admin account.

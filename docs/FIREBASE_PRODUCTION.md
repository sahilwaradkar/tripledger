# Production Firebase setup (TripLedger)

The app already uses Firebase Auth + Firestore. Production is mostly: **create a project in the console**, **paste config into env**, **deploy Firestore rules**.

## 1. Firebase Console (in your browser)

In [Firebase Console](https://console.firebase.google.com/):

1. **Create a project** (or open an existing one). Note the **Project ID** (e.g. `tripleger-prod`).
2. **Build → Firestore Database** → Create database → start in **production mode** (rules will be replaced when you deploy).
3. **Build → Authentication** → Sign-in method → enable **Email/Password**.
4. **Project settings (gear) → General** → **Your apps** → **Web** (`</>`):
   - Register app (nickname e.g. `TripLedger Web`).
   - Copy the `firebaseConfig` object values (apiKey, authDomain, projectId, etc.).

Optional but recommended:

- **Authentication → Settings → Authorized domains** — add your production domain (and `localhost` for local prod testing).

## 2. CLI login and link project (on your machine)

From the `travel_expense` folder:

```bash
npx firebase login
npx firebase use --add
```

Choose your production **Project ID** when prompted. That updates `firebase/.firebaserc`.

Deploy security rules:

```bash
npm run firebase:deploy-rules
```

## 3. Environment variables

### Option A — script (after `firebase login` + `firebase use`)

```bash
npm run firebase:sync-env
```

This writes `.env.local` from the linked Firebase web app SDK config and sets `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false`.

### Option B — manual

Copy `.env.production.example` to `.env.local` and fill in values from the console `firebaseConfig`:

- Set `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false` for production.

For **local dev with emulators**, use `.env.local.example` instead (`NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true`).

## 4. Run / deploy the Next.js app

Local against **production** Firebase:

```bash
npm run dev
```

Hosting (Vercel, etc.): add the same `NEXT_PUBLIC_*` variables in the host dashboard, then deploy the Next.js app. Firebase Hosting is optional; this repo deploys **rules only** via the Firebase CLI.

## 5. Verify

1. Sign up a new user in the app (production Auth).
2. Create a personal expense and a group — data should appear under Firestore in the console.
3. Confirm rules: non-members cannot read other users’ data; group admins manage roster/settings per `firebase/firestore.rules`.

## Troubleshooting

| Issue | Fix |
|--------|-----|
| `permission-denied` on Firestore | Run `npm run firebase:deploy-rules` |
| Auth works, Firestore fails | Enable Firestore in console; check project ID in `.env.local` |
| Email lookup for group invites empty | Users must sign in once so `userEmails/{email}` is written |
| Still hitting emulators | Set `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false` and restart `npm run dev` |

# TripLedger

Offline-first travel expense manager (personal + group splits) built with **Next.js**, **Firebase Auth**, and **Cloud Firestore**.

## Features

- Personal expenses with optional trip labels and categories
- Group trips with shareable invite links (`/g/[token]`)
- Guest participants (track a friend’s spend without them signing up)
- Balances and simplified settle-up suggestions
- Firestore offline persistence + installable PWA shell

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start Firebase emulators (Auth + Firestore):

   ```bash
   npm run emulators
   ```

3. In another terminal, run the app:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000), sign up, and use the app. Emulator UI: [http://localhost:4000](http://localhost:4000).

Copy `.env.local.example` to `.env.local` and set `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` for local emulators. For production, create a Firebase project, enable Email/Password auth and Firestore, deploy `firebase/firestore.rules`, and set your web app config in `.env.local`.

## Production Firebase

See **[docs/FIREBASE_PRODUCTION.md](docs/FIREBASE_PRODUCTION.md)** for the full checklist.

Quick path:

1. Create project in [Firebase Console](https://console.firebase.google.com) (Auth Email/Password + Firestore).
2. `npm run firebase:login` then `npm run firebase:use` (link project).
3. `npm run firebase:sync-env` (writes `.env.local` from your web app config).
4. `npm run firebase:deploy-rules`
5. `npm run dev` with `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false`

No payments or Stripe — offline sync is a core feature for all users.

# Firebase Hosting Migration

## What this migration deploys

This configuration deploys the current public ColorVerse experience to Firebase Hosting:

- `index.html`
- `create.html`
- `book-print-v2.html`
- the complete `public/` assets directory

Only those files are copied into `firebase-dist/`, so source code, environment examples, documentation, and server files are not exposed by Hosting.

## Firebase product selected

Use **Firebase Hosting (classic)** for this phase because the current published experience is a static multi-page site.

The Express server in `server.ts`, protected API routes, Gemini generation, Stripe, and Firebase Admin are not deployed by this Hosting configuration. Move those features later to Firebase App Hosting, Cloud Run, or Cloud Functions after their APIs are implemented and secrets are ready.

## First deployment

1. Create a dedicated Firebase project for ColorVerse, or deliberately select an existing project.
2. Install and sign in to the Firebase CLI:

   ```bash
   npm install -g firebase-tools
   firebase login
   ```

3. From the repository root, connect the repository to the Firebase project:

   ```bash
   firebase use --add
   ```

4. Build and test the Hosting bundle:

   ```bash
   npm run build:firebase
   firebase emulators:start --only hosting
   ```

5. Deploy:

   ```bash
   firebase deploy --only hosting
   ```

Firebase will publish the site on the project's `web.app` and `firebaseapp.com` domains.

## GitHub automatic deployment

After the first local setup, run:

```bash
firebase init hosting:github
```

Choose `Mohammed-3bgarino0-lgtm/ColorVerse`, allow previews for pull requests, and enable deployment to the live channel after merging into `main`. The Firebase CLI creates the service account, stores its key as a GitHub secret, and adds the required workflow files.

Do not commit service-account JSON files or API keys.

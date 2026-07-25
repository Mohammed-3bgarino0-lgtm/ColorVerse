# ColorVerse

ColorVerse is a bilingual Arabic and English AI-powered kids coloring book generator.

## Brand

- Approved logo: colorful planet with orbiting crayons.
- English wordmark: `ColorVerse`.
- Arabic wordmark: `عالم التلوين`.
- English font: Inter.
- Arabic font: Tajawal.
- Primary palette: orange, red, purple, blue, green, yellow, navy, and warm off-white.

## Requirements

- Node.js 20 or newer.
- Firebase project configuration.
- AI provider credentials configured on the server.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm start
```

## Environment

Copy `.env.example` to `.env` and add the required values. Never commit real secrets.

## Deployment

A `render.yaml` file and a multi-stage `Dockerfile` are included for production deployment.

## Documentation

- `docs/project/BRAND-SYSTEM.md`
- `docs/project/PROJECT-STRUCTURE.md`
- `PROJECT-UPDATE-SUMMARY.md`

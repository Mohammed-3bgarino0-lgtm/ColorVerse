import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storyApiRouter } from './src/server/story-api-router.js';
import { storyImageApiRouter } from './src/server/story-image-api-router.js';
import { storyImageReviewApiRouter } from './src/server/story-image-review-api-router.js';
import { googleDriveApiRouter } from './src/server/google-drive-api-router.js';
import { systemReadinessApiRouter } from './src/server/system-readiness-api-router.js';
import { driveWriteTrialGuard, liveAiTrialGuard } from './src/server/trial-mode-guard.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const generatedAssetDirectory = process.env.GENERATED_ASSET_DIR
  ? path.resolve(process.env.GENERATED_ASSET_DIR)
  : path.join(dirname, 'generated-assets');

app.use(express.json({ limit: '10mb' }));
app.use('/generated-assets', express.static(generatedAssetDirectory, {
  fallthrough: true,
  immutable: false,
  maxAge: '1h',
}));

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, service: 'colorverse', timestamp: new Date().toISOString() });
});

// Trial mode is safe by default: reads and demo data remain available, while
// paid AI requests and Drive writes stay blocked until explicitly enabled.
app.use('/api/stories/generate', liveAiTrialGuard);
app.use('/api/story-images/jobs', liveAiTrialGuard);
app.use('/api/story-images/regenerate', liveAiTrialGuard);
app.use('/api/drive/books', driveWriteTrialGuard);

app.use('/api/stories', storyApiRouter);
app.use('/api/story-images', storyImageReviewApiRouter);
app.use('/api/story-images', storyImageApiRouter);
app.use('/api/drive', googleDriveApiRouter);
app.use('/api/system', systemReadinessApiRouter);

app.post('/api/auth/google', async (request, response) => {
  const token = request.body?.token;
  if (!token || typeof token !== 'string') {
    return response.status(400).json({ error: 'A Firebase ID token is required.' });
  }

  try {
    const { adminAuth } = await import('./src/lib/firebase/admin.js');
    if (!adminAuth) return response.status(503).json({ error: 'Firebase Admin is not configured.' });
    const decoded = await adminAuth.verifyIdToken(token);
    return response.json({ uid: decoded.uid, email: decoded.email ?? null, name: decoded.name ?? null });
  } catch (error) {
    console.error('[auth/google]', error);
    return response.status(401).json({ error: 'Invalid or expired Firebase ID token.' });
  }
});

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(dirname, 'dist');
  app.use(express.static(dist));
  app.get('*', (_request, response) => response.sendFile(path.join(dist, 'index.html')));
} else {
  app.use('/public', express.static(path.join(dirname, 'public'), {
    fallthrough: true,
    immutable: false,
    maxAge: 0,
  }));
  const trialPages = [
    'system-readiness.html',
    'create.html',
    'create-ai-review.html',
    'image-review.html',
    'book-print-ai-review.html',
  ];
  for (const page of trialPages) {
    app.get(`/${page}`, (_request, response) => response.sendFile(path.join(dirname, page)));
  }
  app.get('/', (_request, response) => response.redirect('/system-readiness.html'));
}

app.listen(port, '0.0.0.0', () => {
  console.log(`ColorVerse server running on port ${port}`);
});

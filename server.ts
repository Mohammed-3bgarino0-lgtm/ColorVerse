import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storyApiRouter } from './src/server/story-api-router.js';
import { storyImageApiRouter } from './src/server/story-image-api-router.js';
import { storyImageReviewApiRouter } from './src/server/story-image-review-api-router.js';
import { googleDriveApiRouter } from './src/server/google-drive-api-router.js';

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

app.use('/api/stories', storyApiRouter);
app.use('/api/story-images', storyImageReviewApiRouter);
app.use('/api/story-images', storyImageApiRouter);
app.use('/api/drive', googleDriveApiRouter);

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
}

app.listen(port, '0.0.0.0', () => {
  console.log(`ColorVerse server running on port ${port}`);
});

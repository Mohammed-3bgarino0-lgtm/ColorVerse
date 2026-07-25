import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = Number(process.env.PORT || 3000);
const dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, service: 'colorverse', timestamp: new Date().toISOString() });
});

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

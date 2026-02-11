// ─── Malik Zaid — Express App ──────────────────────────────
// Shared between local server and Vercel serverless.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './api/routes.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));

const allowedOrigins = [
  process.env.PORTAL_URL || 'http://localhost:5173',
  process.env.BASE_URL,
  /\.vercel\.app$/,
];

app.use(cors({
  origin(origin, callback) {
    // Allow same-origin (no origin header) and server-to-server
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o =>
      o instanceof RegExp ? o.test(origin) : o === origin
    )) return callback(null, true);
    callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

app.use('/api', routes);

// Serve portal in production
const portalDist = path.join(__dirname, '..', 'portal', 'dist');
app.use(express.static(portalDist));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(portalDist, 'index.html'));
  }
});

export default app;

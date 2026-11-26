import dns from 'node:dns';
// Fix for MongoDB Atlas resolution issues in some environments (especially mobile hotspots)
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {
  console.warn('DNS: Could not set default result order:', e.message);
}
try {
  dns.setServers(['1.1.1.1', '8.8.8.8']);
} catch (e) {
  console.warn('DNS: Could not set custom DNS servers:', e.message);
}

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import syllabiRoutes from './routes/syllabi.js';
import aiRoutes from './routes/ai.js';

connectDB();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/syllabi', syllabiRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

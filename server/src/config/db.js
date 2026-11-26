import mongoose from 'mongoose';
import https from 'https';
import dns from 'dns';

// Force Google DNS to fix querySrv ENOTFOUND on mobile hotspots
dns.setServers(['8.8.8.8', '8.8.4.4']);

const getPublicIP = () => {
  return new Promise((resolve) => {
    https.get('https://api.ipify.org', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data.trim()));
    }).on('error', () => resolve('Unknown'));
  });
};

const connectWithRetry = async (uri, retryCount = 0) => {
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4 — fixes mobile hotspot IPv6/NAT64 issues
    });
    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
    console.log(`📁 Database: ${conn.connection.name}`);
  } catch (error) {
    const ip = await getPublicIP();
    console.error(`❌ MongoDB Connection Error (attempt ${retryCount + 1}):`, error.message);
    console.log(`🔍 Current Public IP: ${ip}`);
    console.log('💡 TIP: Go to cloud.mongodb.com → Network Access → Add your IP (or 0.0.0.0/0 for dev)');
    console.log('⏳ Retrying in 10 seconds...');
    setTimeout(() => connectWithRetry(uri, retryCount + 1), 10000);
  }
};

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not defined in .env');
    process.exit(1);
  }
  // Don't await — let server start while DB connects in background
  connectWithRetry(uri);
};

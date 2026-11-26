<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1Mg2_MKLXBZq4GKKNpXdK4b-hX5HjlGn6

## Run Locally

**Prerequisites:** Node.js, MongoDB (local or Atlas)

### 1. Install dependencies
```bash
npm install
cd server && npm install
```

### 2. Environment variables

**Frontend** – create `.env.local` in project root:
```
GEMINI_API_KEY=your_gemini_api_key
```

**Backend** – create `server/.env`:
```
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/smartsyllabus
JWT_SECRET=your-super-secret-jwt-key
```

For MongoDB Atlas, use your connection string as `MONGODB_URI`.

### 3. Run the app

In one terminal, start the backend:
```bash
npm run server
```

In another terminal, start the frontend:
```bash
npm run dev
```

The app runs at http://localhost:3000 and proxies API calls to http://localhost:4000.

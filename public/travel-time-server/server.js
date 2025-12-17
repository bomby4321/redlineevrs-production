// travel-time-server/src/server.js
import express from 'express';
import fetch from 'node-fetch'; // or just use native fetch if Node 18+
import dotenv from 'dotenv/lib/main';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.get('/travel-time', async (req, res) => {
  const { origin } = req.query;
  if (!origin) return res.status(400).json({ error: 'Origin is required' });

  const destination = 'Nashville International Airport, TN';
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
        origin
      )}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`
    );

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

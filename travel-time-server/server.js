import express from "express";
import fetch from "node-fetch";
import cors from "cors"; 

import dotenv from "dotenv";
import { scheduleBooking } from "./api/schedule-booking.js";

dotenv.config();
const app = express();
const PORT = 3001;

app.use(express.json());

// Enable CORS
app.use(cors());

app.get("/travel-time", async (req, res) => {
  const { origin, destination } = req.query;

  if (!origin || !destination) return res.status(400).json({ error: "Missing origin or destination" });

  const getCoords = async (address) => {
    const tryGeocode = async (query) => {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      const res = await fetch(url, { headers: { "User-Agent": "MyApp" } });
      const data = await res.json();
      return data[0] ? { lat: data[0].lat, lon: data[0].lon } : null;
    };

    // 1. Try full address
    let coords = await tryGeocode(address);
    if (coords) return coords;

    //console.log("⚠️ Nominatim could not geocode full address:", address);

    // 2. Try city + state
    const cityState = address.split(",").slice(-2).join(",").trim();
    coords = await tryGeocode(cityState);
    if (coords) return coords;

    //console.log("⚠️ Could not geocode city/state:", cityState);

    // 3. Try Zip
    const zipMatch = address.match(/\b\d{5}\b/);
    if (zipMatch) {
      coords = await tryGeocode(zipMatch[0]);
      if (coords) return coords;

      //console.log("⚠️ Could not geocode ZIP:", zipMatch[0]);
    }

    // 4. Fallback ()
    //console.log("⚠️ Using fallback Failed");

  };


  try {
    const orig = await getCoords(origin);
    const dest = await getCoords(destination);

    if (!orig || !dest) return res.status(400).json({ error: "Invalid addresses" });

    const routeRes = await fetch(
      `http://router.project-osrm.org/route/v1/driving/${orig.lon},${orig.lat};${dest.lon},${dest.lat}?overview=false`
    );
    const routeData = await routeRes.json();

    if (!routeData.routes || !routeData.routes[0]) return res.status(400).json({ error: "No route found" });

    const route = routeData.routes[0];

    const durationMinutes = Math.ceil(routeData.routes[0].duration / 60);
    const distanceMeters = route.distance;

    //console.log('distance: '+distanceMeters);

    res.json({ durationMinutes, distanceMeters });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// Scheduling route (AI-powered)
app.post("/schedule-booking", scheduleBooking);


// ---- Single listener ----
app.listen(PORT, "0.0.0.0", () =>
  console.log(`server running on http://localhost:${PORT}`)
);



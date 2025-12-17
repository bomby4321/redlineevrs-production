
const API_URL = import.meta.env.VITE_API_URL;


export const getTravelTime = async (origin, destination) => {


  //console.log("getTravelTime called with:", origin);
  try {
    const res = await fetch(
      `${API_URL}/travel-time?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`
    );
    const data = await res.json();
    return {
      durationMinutes: data.durationMinutes ?? 0,
      distanceMeters: data.distanceMeters ?? 0
    };
  } catch (error) {
    console.error("Error fetching travel time:", error);
    return { durationMinutes: 0, distanceMeters: 0 };
  }
};

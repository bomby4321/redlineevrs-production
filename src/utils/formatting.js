// utils/formatting.js

// -----------------------
// flight #
// -----------------------
export function normalizeFlightNumber(flight) {
  if (!flight) return "";
  // Remove anything that is not a letter or digit
  let cleaned = flight.replace(/[^a-zA-Z0-9]/g, "");
  // Uppercase the airline code letters
  return cleaned.toUpperCase();
}


// -----------------------
// PHONE
// -----------------------
export function formatPhone(value) {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
}

export function normalizePhone(value) {
  return value.replace(/\D/g, "");
}

// -----------------------
// DATE HELPERS
// -----------------------

/** Parse YYYY-MM-DD as LOCAL date (avoids UTC conversion) */
export function parseLocalYMD(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Format YYYY-MM-DD → MM/DD/YYYY without timezone shift */
export function formatDateDisplay(ymd) {
  if (!ymd) return "";
  const d = parseLocalYMD(ymd);
  return d.toLocaleDateString("en-US");
}

/** Format a Date → YYYY-MM-DD local */
export function formatLocalDate(date) {
  const d = new Date(date);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
}

// -----------------------
// TIME HELPERS
// -----------------------

/** Format HH:mm → h:mm AM/PM */
export function formatTimeDisplay(time24) {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

/** Format Date → HH:mm */
export function formatLocalTime(date) {
  const d = new Date(date);
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/* formatting minutes → hr/min */
export function formatDuration(minutes) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hrs > 0) {
    return `${hrs} hr${hrs > 1 ? "s" : ""} ${mins} min`;
  }
  return `${mins} min`;
}

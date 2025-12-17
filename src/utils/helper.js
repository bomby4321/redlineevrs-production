import { BUFFERMINUTES} from "./constants";

function parseLocalDateTime(str) {
  // str expected like "2025-12-12 14:00"
  const [datePart, timePart] = str.split(" ");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm);
}


export function subtractTime(freeBlocks, booked) {
  const results = [];

  freeBlocks.forEach(free => {
    // booked fully covers free block → remove
    if (booked.start <= free.start && booked.end >= free.end) return;

    // booked is inside free block → split into 2 free blocks
    if (booked.start > free.start && booked.end < free.end) {
      results.push({ start: free.start, end: booked.start });
      results.push({ start: booked.end, end: free.end });
      return;
    }

    // booked overlaps start of free block → trim start
    if (booked.start <= free.start && booked.end < free.end) {
      results.push({ start: booked.end, end: free.end });
      return;
    }

    // booked overlaps end of free block → trim end
    if (booked.start > free.start && booked.end >= free.end) {
      results.push({ start: free.start, end: booked.start });
      return;
    }

    // no overlap → keep block
    results.push(free);
  });

  return results;
}

export function findNextAvailableTime(requested, duration, unavailable) {


  let reqStart;

  // If requested is a string (e.g. "2025-12-12 14:00")
  if (typeof requested === "string") {
    reqStart = parseLocalDateTime(requested);
  }
  // If it's a Date object already
  else {
    reqStart = new Date(
      requested.getFullYear(),
      requested.getMonth(),
      requested.getDate(),
      requested.getHours(),
      requested.getMinutes()
    );
  }

  const reqEnd = new Date(reqStart.getTime() + duration * 60000);

  // Check for conflict
  const conflict = unavailable.some(b =>
    reqStart < b.end && reqEnd > b.start
  );

  if (!conflict) return { ok: true, alternatives: [] };

  // Compute alternative times
  const suggestions = [];

  unavailable.forEach(b => {
    // after existing trip
    suggestions.push(new Date(b.end.getTime() + BUFFERMINUTES * 60000));

    // before existing trip
    const before = new Date(b.start.getTime() - (duration + BUFFERMINUTES) * 60000);
    if (before > new Date()) suggestions.push(before);
  });

  suggestions.sort((a, b) => Math.abs(a - reqStart) - Math.abs(b - reqStart));

  return { ok: false, alternatives: suggestions.slice(0, 3) };
}

// Normalize text by trimming, lowering, removing periods
export function normalizeText(str) {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .replace(/\./g, "");
}

// Expand common abbreviations ("st" → "street")
export function normalizeStreetTypes(street) {
  if (!street) return "";

  // 1. Trim, lowercase, remove periods
  let s = street.trim().toLowerCase().replace(/\./g, "");

  // 2. Collapse multiple spaces into one
  s = s.replace(/\s+/g, " ");

  // 3. Define replacements
  const replacements = {
    // Street types
    "st": "street",
    "rd": "road",
    "dr": "drive",
    "ln": "lane",
    "blvd": "boulevard",
    "ave": "avenue",
    "cir": "circle",

    // Directionals
    "north east": "NE",
    "north west": "NW",
    "south east": "SE",
    "south west": "SW",
    "n": "N",
    "north": "N",
    "s": "S",
    "south": "S",
    "e": "E",
    "east": "E",
    "w": "W",
    "west": "W",
    "ne": "NE",
    "nw": "NW",
    "se": "SE",
    "sw": "SW",
  };

  // 4. Sort keys by length descending (longer phrases first)
  const sortedKeys = Object.keys(replacements).sort((a, b) => b.length - a.length);

  // 5. Replace using word boundaries
  sortedKeys.forEach((key) => {
    const regex = new RegExp(`\\b${key}\\b`, "gi");
    s = s.replace(regex, replacements[key]);
  });

  // 6. Remove extra spaces again just in case
  s = s.replace(/\s+/g, " ").trim();

  return s;
}


// Master address normalizer
export function normalizeAddress(addr) {
  return {
    street: normalizeStreetTypes(normalizeText(addr.street)),
    city: normalizeText(addr.city),
    state: normalizeText(addr.state),
    zip: normalizeText(addr.zip)
  };
}


// normalizes the phone number to remove added characters
export function normalizePhone(raw) {
  if (!raw) return null;

  // Remove everything except digits
  let cleaned = raw.replace(/\D/g, "");

  // Remove leading "1" if it's a US country code, e.g. 1xxxxxxxxxx
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    cleaned = cleaned.substring(1);
  }

  // Final validation: must be 10 digits
  if (cleaned.length !== 10) {
    return null; // or return cleaned anyway, up to you
  }

  return cleaned;
  
}



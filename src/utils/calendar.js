
import { fetchTrips } from "./api.js";
import { addMinutes, parseISO } from "date-fns";


const SERVICE_START_HOUR = 5;   // 5:00 AM
const SERVICE_END_HOUR = 22;    // 10:00 PM
const SLOT_MINUTES = 15;

const TRIP_DURATION_MIN = 90;  // base estimate
const BUFFER_MIN = 45;         // turnaround buffer


/* =========================
   HELPERS
========================= */
function overlaps(a, b) {
  return a.start < b.end && b.start < a.end;
}

/* =========================
   BLOCKED EVENTS
========================= */
export async function getBlockedEvents(dateStr) {
  const trips = await fetchTrips(dateStr);

  return trips.map(trip => {
    const start = parseISO(trip.pickup_datetime);
    const end = addMinutes(
      start,
      TRIP_DURATION_MIN + BUFFER_MIN
    );

    return {
      title: "Booked",
      start,
      end,
      resource: "blocked",
    };
  });
}

/* =========================
   SLOT GENERATION
========================= */

export function generateSlots(dateStr) {
  const base = new Date(dateStr + "T00:00:00");

  const start = new Date(base);
  start.setHours(SERVICE_START_HOUR, 0, 0, 0);

  const end = new Date(base);
  end.setHours(SERVICE_END_HOUR, 0, 0, 0);

  const slots = [];
  let current = start;

  while (current < end) {
    const slotEnd = addMinutes(current, SLOT_MINUTES);

    slots.push({
      start: new Date(current),
      end: slotEnd,
    });

    current = slotEnd;
  }

  return slots;
}

/* =========================
   AVAILABLE EVENTS
========================= */

export function getAvailableEvents(slots, blockedEvents) {
  return slots
    .filter(slot =>
      !blockedEvents.some(blocked => overlaps(slot, blocked))
    )
    .map(slot => ({
      title: "Available",
      start: slot.start,
      end: slot.end,
      resource: "available",
    }));
}

/* =========================
   PUBLIC API
========================= */

export async function buildCalendarEvents(dateStr) {
  const blockedEvents = await getBlockedEvents(dateStr);
  const slots = generateSlots(dateStr);
  const availableEvents = getAvailableEvents(slots, blockedEvents);

  return [...blockedEvents, ...availableEvents];
}









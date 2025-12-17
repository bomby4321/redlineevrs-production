import { getTravelTime } from './getTravelTime'; // if it's an API call
import { normalizeText, normalizePhone, normalizeAddress } from "./helper";
import { supabase } from "./client";
import { AIRPORT, BUFFERMINUTES} from "./constants";

export async function calculateTripDetails(origin, destination) {
  const { durationMinutes, distanceMeters } = await getTravelTime(origin, destination);

  const miles = +(distanceMeters / 1609.34).toFixed(1); // round to 1 decimal
  const cost = +(miles * 2).toFixed(2); // round to 2 decimals

  return {
    durationMinutes: durationMinutes + BUFFERMINUTES,   // travel + buffer
    rawDuration: durationMinutes,
    miles,
    cost: cost.toFixed(2),
  };
}


export async function computeTripDetails({ street, city, state, zip, selection }) {
  const customerAddress = `${street}, ${city}, ${state} ${zip}`;

  const formatAddress = ({ street, city, state, zip }) => `${street}, ${city}, ${state} ${zip}`;

  //const AIRPORT = "Nashville International Airport, TN";

  const origin = selection === "pickup" ? formatAddress(AIRPORT) : customerAddress;
  const destination = selection === "pickup" ? customerAddress : formatAddress(AIRPORT);

  const details = await calculateTripDetails(origin, destination);

  return {
    travelMinutes: details,
    expectedCost: details.cost,
  };
}

export async function loadUnavailableBlocks(pickupDate) {
  const response = await fetch(`/api/unavailable?date=${pickupDate}`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Failed to load unavailable blocks");
  }

  return await response.json();
}



export async function saveCustomer(customer) {
  const normalized = {
    name: normalizeText(customer.name),
    phone: normalizePhone(customer.phone),
    email: normalizeText(customer.email)
  };

  let orFilter = [];
  if (normalized.phone) orFilter.push(`phone.eq.${normalized.phone}`);
  if (normalized.email) orFilter.push(`email.eq.${normalized.email}`);

  let existing = null;

  if (orFilter.length > 0) {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .or(orFilter.join(","))
      .maybeSingle();

    if (error) throw error;
    existing = data;
  }

  // If customer exists, return it
  if (existing) return existing;

  // Otherwise, insert new customer
  const { data: inserted, error: insertError } = await supabase
    .from("customers")
    .insert([normalized])
    .select()
    .single();

  if (insertError) throw insertError;

  return inserted;
}


export async function fetchTrips(dateStr) {
  // Convert date to UTC boundaries
  const d = new Date(dateStr + "T00:00:00");
  const startUTC = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0));
  const endUTC = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59));

  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .gte("pickup_datetime", startUTC.toISOString())
    .lte("pickup_datetime", endUTC.toISOString())
    .eq("status", "pending");

  if (error) throw error;
  return data || [];
}

export async function saveAddress(addr, customerId) {
  const normalized = normalizeAddress(addr);

  // 1. Lookup fuzzy-matching existing address
  const { data: existing, error: lookupError } = await supabase
    .from("addresses")
    .select("id, street, city, state, zip")
    .eq("street", normalized.street)
    .eq("city", normalized.city)
    .eq("state", normalized.state)
    .eq("zip", normalized.zip)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (existing) {
    return existing;
  }

  // 2. Insert new address
  const { data, error } = await supabase
    .from("addresses")
    .insert([
      {
        customer_id: customerId,
        street: normalized.street,
        city: normalized.city,
        state: normalized.state,
        zip: normalized.zip
      }
    ])
    .select()
    .single();

  if (error) throw error;

  return data;
}


export async function saveTrip(details) {
  const { data, error } = await supabase
    .from("trips")
    .insert([
      {
        customer_id: details.customerId,
        pickup_address_id: details.pickupAddressId,
        dropoff_address_id: details.dropoffAddressId,
        pickup_datetime: details.pickupDateTime,
        duration_minutes: details.duration,
        cost: details.cost,
        status: "pending"
      }
    ])
    .select();

  if (error) throw error;
  return data[0];
}

export async function submitTrip(formData, selection, travelMinutes) {
  const {
    fullName,
    phone,
    email,
    street,
    city,
    usState,
    zip,
    pickupDate,
    pickupTime,
    expectedCost
  } = formData;

  if (!travelMinutes || !travelMinutes.durationMinutes) {
    throw new Error("travelMinutes is missing or invalid.");
  }

  // 1️⃣ Save customer
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert([{ name: fullName, phone, email }])
    .select()
    .single();

  if (customerError) throw customerError;

  // 2️⃣ Define airport address
  const AIRPORT = {
    street: "1 Terminal Dr",
    city: "Nashville",
    state: "TN",
    zip: "37214",
  };

  let pickupAddressObj, dropoffAddressObj;

  if (selection === "pickup") {
    // Pick up at airport → airport is pickup
    pickupAddressObj = AIRPORT;
    dropoffAddressObj = { street, city, state: usState, zip };
  } else {
    // Drop off at airport → customer is pickup
    pickupAddressObj = { street, city, state: usState, zip };
    dropoffAddressObj = AIRPORT;
  }

  // 3️⃣ Save addresses
  const { data: pickupAddress, error: pickupError } = await supabase
    .from("addresses")
    .insert([{ ...pickupAddressObj, customer_id: customer.id }])
    .select()
    .single();

  if (pickupError) throw pickupError;

  const { data: dropoffAddress, error: dropoffError } = await supabase
    .from("addresses")
    .insert([{ ...dropoffAddressObj, customer_id: customer.id }])
    .select()
    .single();

  if (dropoffError) throw dropoffError;

  // 4️⃣ Save trip
  const pickup_datetime = `${pickupDate} ${pickupTime}`;

  const tripData = {
    customer_id: customer.id,
    pickup_address_id: pickupAddress.id,
    dropoff_address_id: dropoffAddress.id,
    pickup_datetime,
    duration_minutes: travelMinutes.durationMinutes,
    cost: parseFloat(expectedCost)
  };

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .insert([tripData])
    .select()
    .single();

  if (tripError) throw tripError;

  return trip;
}

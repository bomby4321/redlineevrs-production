/*TO DO*/
/*
  
  
  ensure teh conflic portion runs and works to give the 2 options,
  echk the buttons work
  check logic works incase user picks new time
  check whats the best way to show other busy times so the user doesnt ahve to guess
    mybe show quantity of over lap time ... allow for some overalp
  ensure the date show matches date selected (-6 hr  could be affecting it due to time zone)

  check that adresses are not double loged, may not be using old logic since we moved tabs

  update email in terms and conition

  remove calendar, replace with check time in step 4, if it works, skip step 5,
    if there is a conflic, 
      show the blocked hrs, 
      show the 2 best time, 1 before and 1 after (take into acc past / previous drop off and pick up location to calculat time to get to customer)
      show clock to choose new time
  
  check for a way to prevent a bot or crawler to spam data (add a log in FB / apple id / google acc) / captcha
  deploy a stg / dev site 
  create a stg / dev back end

  check of a way to create back up of the tables + data ... incase some one tries to drop a table, not all is loss

  chek for security issues / hackers

  
  
  
 
  
  old / changed / removed

  when a user selects a pick up time, if the time and duration block off display the calendar , else skip the calendar and use the users set time
  if the user has to use the blocks of time in the calendar... make it easier to select specific times, apologize that the selected time causes conflicst with existing data
    may require adding a new drop down that only allows user to select times in the available block
    may require showing suggested times --> closes time to your selected time and reaching your destination would be ...
      unabile bloc - duation =start time
      unavil block end = start time

*/ 


import { useState, useEffect } from "react";
import logo from "./assets/logo.png";
import FloatingInput from "./components/FloatingInput";
import FloatingSelect from "./components/FloatingSelect";
import StateAutocomplete from "./components/StateAutocomplete";

import { getTravelTime } from "./utils/getTravelTime.js"; // helper function you define separately
import { subtractTime, findNextAvailableTime } from "./utils/helper.js";

import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import CustomToolbar from "./components/CustomToolbar";
import { buildCalendarEvents } from "./utils/calendar.js";

import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';

import { formatPhone, normalizeFlightNumber, formatDateDisplay, formatTimeDisplay, formatLocalDate, formatDuration } from "./utils/formatting";
import { STEPS, AIRPORT, US_STATES} from "./utils/constants";


import { calculateTripDetails, computeTripDetails, submitTrip, fetchTrips, saveCustomer, saveAddress, saveTrip } from './utils/api';

//import { saveCustomer, saveAddress, saveTrip } from "./supabase/api";

import StagingBanner from './StagingBanner';


const API_URL = import.meta.env.VITE_API_URL;


function App() {

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const formattedTomorrow = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

  const getInitialFormData = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      street: "",
      city: "",
      usState: "",
      zip: "",

      pickupDate: formattedTomorrow,
      pickupTime: "",
      newPickupDate: formattedTomorrow,
      newPickupTime: "",

      expectedCost: "",
      tripDuration: null,

      fullName: "",
      phone: "",
      email: "",
      flightNumber: "",

      passengerCount: 1,
      carryOnBags: 0,
      suitCases: 0,

      // Conflict / scheduling
      timeConflict: false,
      suggestedTimes: [],
      unavailableBlocks: [],

      // UI flags
      reviewEditStep: null,
      termsAccepted: true,
      showTerms: false,
      isSubmitting: false,
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());

/*
  const [formData, setFormData] = useState({
    street: "",
    city: "",
    usState: "",
    zip: "",
    pickupDate: formattedTomorrow,
    pickupTime: "",
    newPickupDate: formattedTomorrow,
    newPickupTime: "",
    expectedCost: "",
    tripDuration: "",
    fullName: "",
    phone: "",
    email: "",
    flightNumber: "",
    passengerCount: 1,
    carryOnBags: 0,
    suitCases: 0,

    // Step 8 items
    reviewEditStep: null,
    timeConflict: false,
    suggestedTimes: [],
    unavailableBlocks: [],
    termsAccepted: true,
    showTerms: false,
    isSubmitting: false,
  });*/

  const [step, setStep] = useState(1);
  const [selection, setSelection] = useState("select");
  const [loading, setLoading] = useState(false);
  //const [expectedCost, setExpectedCost] = useState("");
  const [travelMinutes, setTravelMinutes] = useState(null);
  const [calculatedArrivalTime, setCalculatedArrivalTime] = useState("");
  //const [unavailableBlocks, setUnavailableBlocks] = useState([]);
  //const [timeConflict, setTimeConflict] = useState(true);
  const [draftData, setDraftData] = useState({});

  const getTomorrowDateString = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  };

  const [currentDate, setCurrentDate] = useState(getTomorrowDateString());
  
// Handle moving to next step
const handleNext = () => {
  if (selection !== "select") {
    setStep(2);
  }
};

useEffect(() => {
  const { pickupDate, pickupTime } = formData;

  if (!pickupDate || !pickupTime || !travelMinutes) return;

  // Parse pickup time
  const [hours, minutes] = pickupTime.split(":").map(Number);

  // Create Date object with correct year/month/day
  const [year, month, day] = pickupDate.split("-").map(Number);
  const pickup = new Date(year, month - 1, day, hours, minutes); // month is 0-indexed

  // Add travel minutes
  const arrival = new Date(pickup.getTime() + travelMinutes.durationMinutes * 60000);

  // Format nicely
  const formatted = arrival.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
  setCalculatedArrivalTime(formatted);
}, [formData.pickupDate, formData.pickupTime, travelMinutes]);


useEffect(() => {
  async function loadUnavailable() {
    if (!formData.pickupDate) return;

    const trips = await fetchTrips(formData.pickupDate);

    setFormData(prev => ({
      ...prev,
      unavailableBlocks: trips.map(t => ({
        start: new Date(t.pickup_datetime),
        end: new Date(new Date(t.pickup_datetime).getTime() + t.duration_minutes * 60000),
      })),
    }));
  }

  loadUnavailable();
}, [formData.pickupDate]);


useEffect(() => {
  async function loadCalendar() {
    const calendarEvents = await buildCalendarEvents(currentDate);
    setEvents(calendarEvents);
    setSelectedEvent(null);
  }

  loadCalendar();
}, [currentDate]);


const handleAddressNext = async () => {

  setLoading(true);
  try {
    const { travelMinutes, expectedCost } = await computeTripDetails({
      street: formData.street,
      city: formData.city,
      state: formData.usState,
      zip: formData.zip,
      selection
    });

    setTravelMinutes(travelMinutes);
    setFormData(prev => ({ 
      ...prev, 
      expectedCost,
      tripDuration: travelMinutes.durationMinutes
    }));

    setStep(4);
  } finally {
    setLoading(false);
  }
};


async function handlePickupDateChange(newDate) {
  // First update pickup date
  setFormData(prev => ({ ...prev, pickupDate: newDate }));

  try {
    // Load booked trips for this date
    const data = await loadUnavailableBlocks(newDate);

    // Convert API records to start/end blocks
    const unavailableBlocks = data.map(t => ({
      start: new Date(t.pickup_datetime),
      end: new Date(
        new Date(t.pickup_datetime).getTime() +
        t.duration_minutes * 60000
      )
    }));

    // Save to formData
    setFormData(prev => ({
      ...prev,
      unavailableBlocks
    }));

  } catch (error) {
    console.error(error);
  }
}






const handleSubmit = async () => {
  setFormData(prev => ({ ...prev, isSubmitting: true }));
  try {
    // Merge calculated values with formData
    const combinedLocalDateTime = `${formData.pickupDate} ${formData.pickupTime}`;

    const submissionData = {
      ...formData,
      pickupDateTimeLocal: combinedLocalDateTime
    };

    const trip = await submitTrip(submissionData, selection, travelMinutes);

    alert("✅ Reservation Submitted!");

    // 🔥 RESET EVERYTHING
    setFormData(getInitialFormData());
    setTravelMinutes(null);
    setCalculatedArrivalTime(null);
    setSelection(null);
    setStep(1);

  } catch (err) {
    console.error(err);
    alert("❌ Error: " + err.message);
  } finally {
    setFormData(prev => ({ ...prev, isSubmitting: false }));
  }
};


// sends data to DB
/*
async function handleSubmit() {
  if (isSubmitting) return; // prevent multiple clicks
  setIsSubmitting(true);

  try {
    // -----------------------------
    // 1️⃣ Save customer
    // -----------------------------
    const customerData = {
      name: fullName,
      phone,
      email,
    };

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .insert([customerData])
      .select()
      .single();

    if (customerError) throw customerError;

    // -----------------------------
    // 2️⃣ Build address objects based on ride type
    // -----------------------------
    const AIRPORT = { street: "1 Terminal Dr", city: "Nashville", state: "TN", zip: "37214" };

    let pickupAddressObj, dropoffAddressObj;

    if (selection === "pickup") {
      // Pickup at airport → driver starts at airport
      pickupAddressObj = AIRPORT;
      dropoffAddressObj = { street, city, state: usState, zip };
    } else {
      // Dropoff at airport → pickup is customer address
      pickupAddressObj = { street, city, state: usState, zip };
      dropoffAddressObj = AIRPORT;
    }

    // -----------------------------
    // 3️⃣ Save addresses
    // -----------------------------
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

    // -----------------------------
    // 4️⃣ Save trip
    // -----------------------------
    const tripData = {
      customer_id: customer.id,
      pickup_address_id: pickupAddress.id,
      dropoff_address_id: dropoffAddress.id,
      pickup_datetime: `${pickupDate} ${pickupTime}`,
      duration_minutes: travelMinutes.durationMinutes,
      cost: parseFloat(expectedCost),
    };

    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .insert([tripData])
      .select()
      .single();

    if (tripError) {
      if (tripError.code === "23505") {
        alert("⚠️ This trip already exists!");
      } else {
        throw tripError;
      }
    } else {
      console.log("✅ Trip saved:", trip);
      alert("✅ Reservation Submitted!");
      // optionally reset form or go to confirmation step
      setStep(1); // or step 6/confirmation
    }

  } catch (err) {
    console.error("❌ Error saving reservation:", err);
    alert(`❌ Error: ${err.message ?? err}`);
  } finally {
    setIsSubmitting(false);
  }
}
*/




  return (
    
    <div className="app-container">
      <div className="card">
        {step === 1 && (
          <>
            <StagingBanner />
            <img src={logo} alt="Infamous EV Logo" className="mx-auto mb-6 w-32 h-auto" />
            <h1 className="text-4xl font-bold mb-6">Welcome</h1>
            <p className="text-lg mb-8">
              Schedule a ride to your destination with just a few taps.
            </p>
            
            <button
              className="btn btn-primary mx-auto"
              onClick={() => setStep(2)}
            >
              Book a Reservation
            </button>

          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-2xl font-bold mb-6">Book a Reservation ({step-1}/{STEPS})</h1>

            <h2 className="text-2xl font-semibold text-center">Choose an Option</h2>

            <div className="flex-1 flex items-center justify-center p-4">
              <select
                className="w-full p-4 text-lg border border-gray-300 rounded-lg shadow-sm focus:outline-none  bg-gray"
                value={selection}
                onChange={(e) => setSelection(e.target.value)}
              >
                <option value="select">Select an option</option>
                <option value="pickup">Pick up at airport</option>
                <option value="dropoff">Drop off at airport</option>
              </select>
            </div>
            <div className="w-full max-w-md mx-auto flex gap-4 mt-4">
              
              <button
                className="flex-1 py-3 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 transition"
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button
                className={`flex-1 py-3 rounded-lg text-white font-semibold transition ${
                  selection === "select"
                    ? "bg-gray-400 cursor-not-allowed text-gray-300"
                    : "bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white"
                }`}
                disabled={selection === "select"}
                onClick={() => setStep(3)} // later goes to Step 3
              >
                Next
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <div className="flex flex-col justify-between p-6 card w-full">
            {/* Header */}
            <h2 className="text-2xl font-bold text-center mb-6">
              {selection === "pickup" ? "Destination" : "Pickup Address"} ({step-1}/{STEPS})
            </h2>

            {/* Form Fields */}
            <div className="form-section">              
              <FloatingInput
                type="text"
                label="Street Address"
                placeholder="Street Address"
                value={formData.street}
                onChange={(e) =>setFormData((prev) => ({ ...prev, street: e.target.value }))}

              />

              <FloatingInput
                type="text"
                label="City"
                placeholder="City"
                value={formData.city}
                onChange={(e) =>setFormData((prev) => ({ ...prev, city: e.target.value }))}

              />

              <StateAutocomplete
                value={formData.usState}
                onChange={(val) =>
                  setFormData((prev) => ({ ...prev, usState: val }))
                }
              />

              <FloatingInput
                type="text"
                label="Zip Code"
                placeholder="Zip Code"
                value={formData.zip}
                onChange={(e) =>setFormData((prev) => ({ ...prev, zip: e.target.value }))}
                maxLength={5}

              />
            </div>

            {/* Buttons */}
           <div className="w-full max-w-md mx-auto flex gap-4 mt-4">
              

              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 transition"
              >
                Back
              </button>

              <button
                disabled={
                  !formData.street.trim() ||
                  !formData.city.trim() ||
                  !formData.usState ||
                  !/^\d{5}$/.test(formData.zip) // must be 5 digits
                }
                onClick={handleAddressNext} // later goes to Step 4}
                className={`flex-1 py-3 rounded-lg text-white font-semibold transition  ${
                  !formData.street.trim() || !formData.city.trim()  || !formData.usState || !/^\d{5}$/.test(formData.zip)
                    ? "bg-[var(--disabled-color)] cursor-not-allowed"
                    : "bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          
          <div className="flex flex-col justify-between p-6 card w-full">
            {/* Header */}
            <h2 className="text-2xl font-bold text-center mb-6">
              Date and Time Details ({step - 1}/{STEPS})
            </h2>

            {/* Form Fields */}
            <div className="form-section">

              <div className="bg-[var(--card-bg)] border border-gray-600 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-500">Expected Trip Duration</p>
                <p className="text-lg font-semibold">{formData.tripDuration ? formatDuration(formData.tripDuration) : "-"}</p>
              </div>

              <div className="bg-[var(--card-bg)] border border-gray-600 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-500">Estimated Cost</p>
                <p className="text-lg font-semibold">${formData.expectedCost}</p>
              </div>

              <FloatingInput
                type="text"
                label="Flight Number (Ex: DL101)"
                value={formData.flightNumber}
                onChange={(e) =>setFormData((prev) => ({ ...prev, flightNumber: normalizeFlightNumber(e.target.value) }))}
                className="w-full p-4 text-lg border border-gray-300 rounded-lg shadow-sm focus:outline-none"
              />

              <FloatingInput
                type="date"
                label="Pickup Date"
                value={formData.pickupDate || ""}
                min={new Date().toISOString().split("T")[0]}
                //onChange={(e) =>setFormData((prev) => ({ ...prev, pickupDate: e.target.value }))}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    pickupDate: e.target.value // <-- no conversion
                  }))
                }
                className="w-full p-4 text-lg border border-gray-300 rounded-lg shadow-sm focus:outline-none"
              />

              {/*<FloatingInput
                type="time"
                label="Pickup Time"
                value={formData.pickupTime || ""}
                onChange={(e) =>setFormData((prev) => ({ ...prev, pickupTime: e.target.value }))}
                className="w-full p-4 text-lg border border-gray-300 rounded-lg shadow-sm focus:outline-none"
              />

              

              <div className="bg-[var(--card-bg)] border border-gray-600 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-500">Estimated Arrival Time</p>
                <p className="text-lg font-semibold">{calculatedArrivalTime}</p>
              </div>*/}


            </div>
            
            {/* Buttons */}
            <div className="w-full max-w-md mx-auto flex gap-4 mt-4">
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 transition"
              >
                Back
              </button>

              <button
                className={`flex-1 py-3 rounded-lg text-white font-semibold transition ${
                  selection === "select"
                    ? "bg-gray-400 cursor-not-allowed text-gray-300"
                    : "bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white"
                }`}
                disabled={
                  !formData.flightNumber.trim() ||
                  !formData.pickupDate
                }
                onClick={() => setStep(6)} // later goes to Step 3
              >
                Next
              </button>

              {/*
              <button
                disabled={
                  !formData.pickupDate ||
                  !formData.pickupTime
                }
                 onClick={async () => {
                  if (!formData.pickupTime) return;

                  //const pickupDateTime = new Date(`${formData.pickupDate}T${formData.pickupTime}:00Z`);
                  const pickupDateTimeLocal = `${formData.pickupDate} ${formData.pickupTime}`;

                  const result = findNextAvailableTime(
                    pickupDateTimeLocal,
                    travelMinutes.durationMinutes,
                    formData.unavailableBlocks
                  );

                  if (result.ok) {
                    setFormData(prev => ({ ...prev, timeConflict: false }));
                    setStep(6);
                  } else {
                    setFormData(prev => ({
                      ...prev,
                      timeConflict: true,
                      suggestedTimes: result.alternatives
                    }));
                    setStep(5); // force stay on step 5
                  }
                }}
                className={`flex-1 py-3 rounded-lg text-white font-semibold transition ${
                  !formData.pickupDate ||
                  !formData.pickupTime
                    ? "bg-[var(--disabled-color)] cursor-not-allowed"
                    : "bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white"
                }`}
              >
                Next
              </button>
              */}
            </div>
          </div>
        )}

        {loading && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(4px)",
              zIndex: 9999
            }}
          >
            <div className="spinner"></div>
          </div>
        )}


        {step === 5 && (
          <div className="flex flex-col justify-between p-6 card w-full">
            <h2 className="text-2xl font-bold text-center mb-6">
              Date and Time Booking ({step - 1}/{STEPS})
            </h2>

            <div className="form-section">
              {localizer && Array.isArray(events) ? (
                <Calendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: 500 }}
                  views={["day"]}
                  defaultView="day"
                  date={new Date(currentDate + "T00:00:00")}
                  toolbar={true}
                  components={{
                    toolbar: CustomToolbar,
                  }}
                  step={15}
                  //timeslots={4}
                  selectable
                  onSelectEvent={(event) => {
                    if (event.resource === "available") {
                      setSelectedEvent(event);
                      setPickupTime(format(event.start, "HH:mm"));
                    }
                  }}
                  onNavigate={(newDate) => {
                    const dateStr =
                      newDate instanceof Date
                        ? newDate.toISOString().split("T")[0]
                        : newDate;
                    setCurrentDate(dateStr);
                  }}

                  /** ⭐ NEW — add colors + disable unavailable clicks */
                  eventPropGetter={(event) => {
                    if (event.resource === "blocked") {
                      return {
                        style: {
                          backgroundColor: "#d1d5db",     // Tailwind gray-300
                          opacity: 0.6,
                          pointerEvents: "none",         // ⛔ non-clickable
                          color: "#6b7280",              // gray-500 text
                          border: "1px solid #9ca3af",
                        },
                      };
                    }

                    if (event.resource === "available") {
                      return {
                        style: {
                          backgroundColor: "var(--accent-color)",      // your site’s accent
                          color: "#ffffff",
                          border: "1px solid var(--accent-hover)",     // darker accent
                          fontWeight: "600",
                        },
                      };
                    }

                    return {};
                  }}
                />

              ) : (
                <p className="text-center text-gray-400">Loading calendar...</p>
              )}
            </div>

            <div className="w-full max-w-md mx-auto flex gap-4 mt-4">
              <button
                onClick={() => setStep(4)}
                className="flex-1 py-3 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 transition"
              >
                Back
              </button>

              <button
                disabled={!selectedEvent}
                onClick={() => setStep(6)}
                className={`flex-1 py-3 rounded-lg text-white font-semibold transition ${
                  !selectedEvent
                    ? "bg-gray-400 cursor-not-allowed text-gray-300"
                    : "bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}

        

        {step === 6 && (
          <div className="flex flex-col justify-between p-6 card w-full">
            {/* Header */}
            <h2 className="text-2xl font-bold text-center mb-6">
              Flight Details ({step - 1}/{STEPS})
            </h2>

            {/* Form Fields */}
            <div className="form-section">

              

              <FloatingSelect
                type="number"
                label="Passenger Count"
                value={formData.passengerCount || 1}
                onChange={(e) =>setFormData((prev) => ({ ...prev, passengerCount: e.target.value }))}
                options={[...Array(4).keys()].map(n => ({ value: n + 1, label: n + 1 }))}
                className="w-full p-4 text-lg border border-gray-300 rounded-lg shadow-sm focus:outline-none"
              />

              <div className="grid grid-cols-2 gap-4">
                <FloatingSelect
                  type="number"
                  label="Carry-on"
                  value={formData.carryOnBags || 0}
                  onChange={(e) =>setFormData((prev) => ({ ...prev, carryOnBags: e.target.value }))}
                  options={[...Array(10).keys()].map((n) => ({ value: n, label: n }))}
                />
                <FloatingSelect
                  type="number"
                  label="Suitcases"
                  value={formData.suitCases || 0}
                  onChange={(e) =>setFormData((prev) => ({ ...prev, suitCases: e.target.value }))}
                  min={0}
                  options={[...Array(10).keys()].map((n) => ({ value: n, label: n }))}
                />
              </div>

              
            </div>

            {/* Buttons */}
            <div className="w-full max-w-md mx-auto flex gap-4 mt-4">
              <button
                onClick={() => setStep(5)}
                className="flex-1 py-3 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 transition"
              >
                Back
              </button>

              <button
                disabled={
                  
                  !formData.passengerCount ||
                  formData.carryOnBags === null || formData.carryOnBags === undefined ||
                  formData.suitCases === null || formData.suitCases === undefined 
                }
                onClick={() => setStep(7)}
                className={`flex-1 py-3 rounded-lg text-white font-semibold transition ${
                  !formData.flightNumber.trim() ||
                  !formData.passengerCount ||
                  formData.carryOnBags === null || formData.carryOnBags === undefined ||
                  formData.suitCases === null || formData.suitCases === undefined 
                    ? "bg-gray-400 cursor-not-allowed text-gray-300"
                    : "bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}


        {step === 7 && (
          <div className="flex flex-col justify-between p-6 card w-full">
            {/* Header */}
            <h2 className="text-2xl font-bold text-center mb-6">Contact Details ({step-1}/{STEPS})</h2>

            {/* Form Fields */}
            <div className="form-section">              {/*<label className="block text-left text-gray-700 mb-1">Full Name</label>*/}
              <FloatingInput
                  type="text"
                  label="Full Name"
                  value={formData.fullName}
                  onChange={(e) =>setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="w-full p-4 text-lg border border-gray-300 rounded-lg shadow-sm
                            focus:outline-none  "
              />

              <FloatingInput
                type="tel"
                label="Phone Number"
                value={formData.phone}
                onChange={(e) =>setFormData((prev) => ({ ...prev, phone: formatPhone(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg p-3 text-lg  focus:ring-blue-500 focus:outline-none"
              />

              <FloatingInput
                type="email"
                label="Email"
                value={formData.email}
                onChange={(e) =>setFormData((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full p-4 text-lg border border-gray-300 rounded-lg shadow-sm
                          focus:outline-none  "
              />
            </div>

            {/* Buttons */}
           <div className="w-full max-w-md mx-auto flex gap-4 mt-4">
              <button
                onClick={() => setStep(6)}
                className="flex-1 py-3 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 transition"
              >
                Back
              </button>
              <button
                disabled={
                  !formData.fullName.trim() ||
                  !formData.phone ||
                  !formData.email
                }
                onClick={() => setStep(8)} // later goes to Step 6

                  //alert(`Flight: ${flightNumber}, Passengers: ${passengerCount}, Bags: ${bagsCount}`)
                
                className={`flex-1 py-3 rounded-lg text-white font-semibold transition  ${
                  !formData.fullName.trim() || !formData.phone || !formData.email
                    ? "bg-gray-400 cursor-not-allowed text-gray-300"
                    : "bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white"
                }`}
              >
                Review
              </button>

              
            </div>
          </div> 
        )}

        {step === 8 && (
          <div className="flex flex-col justify-between p-6 card w-full">
            <h2 className="text-2xl font-bold text-center mb-6">Review Your Reservation</h2>

            <div className="space-y-6 text-left">

              {/* RIDE TYPE SECTION */}
              <div className="p-4 border border-gray-700 rounded-lg bg-gray-800">
                <h3 className="text-xl font-semibold mb-2">Ride Type</h3>

                {formData.reviewEditStep === "ride" ? (
                  <div className="space-y-2">

                    <select
                      value={formData.selection}
                      onChange={(e) =>
                        setFormData(prev => ({ ...prev, selection: e.target.value }))
                      }
                      className="w-full bg-gray-700 text-white rounded p-2"
                    >
                      <option value="pickup">Pick up at airport</option>
                      <option value="dropoff">Drop off at airport</option>
                    </select>

                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={() =>
                          setFormData(prev => ({ ...prev, reviewEditStep: null }))
                        }
                        className="flex-1 py-2 bg-gray-600 rounded hover:bg-gray-500"
                      >
                        Save
                      </button>
                      <button
                        onClick={() =>
                          setFormData(prev => ({ ...prev, reviewEditStep: null }))
                        }
                        className="flex-1 py-2 bg-gray-700 rounded hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-300 mb-2">
                      {formData.selection === "pickup"
                        ? "Pick up at airport"
                        : "Drop off at airport"}
                    </p>
                    <button
                      onClick={() =>
                        setFormData(prev => ({ ...prev, reviewEditStep: "ride" }))
                      }
                      className="text-sm text-[var(--accent-color)] hover:underline"
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>

              {/* ADDRESS SECTION */}
              <div className="p-4 border border-gray-700 rounded-lg bg-gray-800">
                <h3 className="text-xl font-semibold mb-2">
                  {formData.selection === "pickup" ? "Destination" : "Pickup Address"}
                </h3>

                {formData.reviewEditStep === "address" ? (
                  <div className="space-y-2">
                    <FloatingInput
                      type="text"
                      value={formData.street}
                      onChange={(e) =>
                        setFormData(prev => ({ ...prev, street: e.target.value }))
                      }
                      label="Street"
                    />

                    <FloatingInput
                      type="text"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData(prev => ({ ...prev, city: e.target.value }))
                      }
                      label="City"
                    />

                    <FloatingInput
                      type="text"
                      value={formData.usState}
                      onChange={(e) =>
                        setFormData(prev => ({ ...prev, usState: e.target.value }))
                      }
                      label="State"
                    />

                    <FloatingInput
                      type="text"
                      value={formData.zip}
                      onChange={(e) =>
                        setFormData(prev => ({ ...prev, zip: e.target.value }))
                      }
                      label="ZIP"
                    />

                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={() =>
                          setFormData(prev => ({ ...prev, reviewEditStep: null }))
                        }
                        className="flex-1 py-2 bg-gray-600 rounded hover:bg-gray-500"
                      >
                        Save
                      </button>
                      <button
                        onClick={() =>
                          setFormData(prev => ({ ...prev, reviewEditStep: null }))
                        }
                        className="flex-1 py-2 bg-gray-700 rounded hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-gray-300 space-y-1">
                      <p><strong>Street:</strong> {formData.street}</p>
                      <p><strong>City:</strong> {formData.city}</p>
                      <p><strong>State:</strong> {formData.usState}</p>
                      <p><strong>ZIP:</strong> {formData.zip}</p>
                    </div>
                    <button
                      onClick={() =>
                        setFormData(prev => ({ ...prev, reviewEditStep: "address" }))
                      }
                      className="text-sm text-[var(--accent-color)] hover:underline mt-2"
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>

              {/* DATE/TIME SECTION */}
              <div className="p-4 border border-gray-700 rounded-lg bg-gray-800">
                <h3 className="text-xl font-semibold mb-2">Date & Time</h3>

                {formData.reviewEditStep === "datetime" ? (
                  <div className="space-y-2">
                    <FloatingInput
                      type="date"
                      value={formData.pickupDate}
                      onChange={(e) =>
                        setFormData(prev => ({ ...prev, pickupDate: e.target.value }))
                      }
                      label="Pickup Date"
                    />

                    <FloatingInput
                      type="time"
                      value={formData.pickupTime}
                      onChange={(e) =>
                        setFormData(prev => ({ ...prev, pickupTime: e.target.value }))
                      }
                      label="Pickup Time"
                    />

                    <FloatingInput
                      type="text"
                      value={formData.tripDuration}
                      readOnly
                      label="Expected Travel Time (HH:MM)"
                    />

                    <FloatingInput
                      type="text"
                      value={formData.expectedCost}
                      readOnly
                      label="Expected Cost"
                    />

                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={() =>
                          setFormData(prev => ({ ...prev, reviewEditStep: null }))
                        }
                        className="flex-1 py-2 bg-gray-600 rounded hover:bg-gray-500"
                      >
                        Save
                      </button>
                      <button
                        onClick={() =>
                          setFormData(prev => ({ ...prev, reviewEditStep: null }))
                        }
                        className="flex-1 py-2 bg-gray-700 rounded hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-gray-300 space-y-1">
                      <p><strong>Pickup Date:</strong> {formData.pickupDate}</p>
                      <p><strong>Pickup Time:</strong> {formData.pickupTime}</p>
                      <p><strong>Expected Duration:</strong> {formData.tripDuration ? formatDuration(formData.tripDuration) : "-"}</p>
                      <p><strong>Expected Cost:</strong> ${formData.expectedCost}</p>
                    </div>

                    <button
                      onClick={() =>
                        setFormData(prev => ({ ...prev, reviewEditStep: "datetime" }))
                      }
                      className="text-sm text-[var(--accent-color)] hover:underline mt-2"
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>

              {/* FLIGHT SECTION */}
              <div className="p-4 border border-gray-700 rounded-lg bg-gray-800">
                <h3 className="text-xl font-semibold mb-2">Flight Details</h3>

                {formData.reviewEditStep === "flight" ? (
                  <div className="space-y-2">
                    <FloatingInput
                      type="text"
                      value={formData.flightNumber}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          flightNumber: normalizeFlightNumber(e.target.value)
                        }))
                      }
                      label="Flight Number"
                    />

                    <FloatingSelect
                      value={formData.passengerCount}
                      onChange={(e) =>
                        setFormData(prev => ({ ...prev, passengerCount: e.target.value }))
                      }
                      options={[...Array(4).keys()].map(n => ({ value: n + 1, label: n + 1 }))}
                      label="Passengers"
                    />

                    <FloatingSelect
                      value={formData.carryOnBags}
                      onChange={(e) =>
                        setFormData(prev => ({ ...prev, carryOnBags: e.target.value }))
                      }
                      options={[...Array(10).keys()].map(n => ({ value: n, label: n }))}
                      label="Carry-On"
                    />

                    <FloatingSelect
                      value={formData.suitCases}
                      onChange={(e) =>
                        setFormData(prev => ({ ...prev, suitCases: e.target.value }))
                      }
                      options={[...Array(10).keys()].map(n => ({ value: n, label: n }))}
                      label="Suit Cases"
                    />

                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={() =>
                          setFormData(prev => ({ ...prev, reviewEditStep: null }))
                        }
                        className="flex-1 py-2 bg-gray-600 rounded hover:bg-gray-500"
                      >
                        Save
                      </button>
                      <button
                        onClick={() =>
                          setFormData(prev => ({ ...prev, reviewEditStep: null }))
                        }
                        className="flex-1 py-2 bg-gray-700 rounded hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-gray-300 space-y-1">
                      <p><strong>Flight Number:</strong> {formData.flightNumber}</p>
                      <p><strong>Passengers:</strong> {formData.passengerCount}</p>
                      <p><strong>Carry-Ons:</strong> {formData.carryOnBags}</p>
                      <p><strong>Suit Cases:</strong> {formData.suitCases}</p>
                    </div>
                    <button
                      onClick={() =>
                        setFormData(prev => ({ ...prev, reviewEditStep: "flight" }))
                      }
                      className="text-sm text-[var(--accent-color)] hover:underline mt-2"
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>

              {/* CONTACT SECTION */}
              <div className="p-4 border border-gray-700 rounded-lg bg-gray-800">
                <h3 className="text-xl font-semibold mb-2">Contact Information</h3>

                {formData.reviewEditStep === "contact" ? (
                  <div className="space-y-2">
                    <FloatingInput
                      type="text"
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData(prev => ({ ...prev, fullName: e.target.value }))
                      }
                      label="Full Name"
                    />

                    <FloatingInput
                      type="text"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData(prev => ({ ...prev, phone: formatPhone(e.target.value) }))
                      }
                      label="Phone"
                    />

                    <FloatingInput
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData(prev => ({ ...prev, email: e.target.value }))
                      }
                      label="Email"
                    />

                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={() =>
                          setFormData(prev => ({ ...prev, reviewEditStep: null }))
                        }
                        className="flex-1 py-2 bg-gray-600 rounded hover:bg-gray-500"
                      >
                        Save
                      </button>
                      <button
                        onClick={() =>
                          setFormData(prev => ({ ...prev, reviewEditStep: null }))
                        }
                        className="flex-1 py-2 bg-gray-700 rounded hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-gray-300 space-y-1">
                      <p><strong>Full Name:</strong> {formData.fullName}</p>
                      <p><strong>Phone:</strong> {formData.phone}</p>
                      <p><strong>Email:</strong> {formData.email}</p>
                    </div>
                    <button
                      onClick={() =>
                        setFormData(prev => ({ ...prev, reviewEditStep: "contact" }))
                      }
                      className="text-sm text-[var(--accent-color)] hover:underline mt-2"
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>

              {/* TERMS SECTION */}
              <div className="flex items-start gap-2 mt-4">
                <input
                  type="checkbox"
                  id="terms"
                  checked={formData.termsAccepted}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, termsAccepted: e.target.checked }))
                  }
                  className="w-5 h-5 mt-1 accent-[var(--accent-color)]"
                />
                <label htmlFor="terms" className="text-gray-300 text-sm">
                  I agree to the{" "}
                  <span
                    className="text-[var(--accent-color)] hover:underline cursor-pointer"
                    onClick={() =>
                      setFormData(prev => ({ ...prev, showTerms: true }))
                    }
                  >
                    Terms & Conditions
                  </span>
                </label>
              </div>

              {/* TERMS MODAL */}
              {formData.showTerms && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                  <div className="bg-gray-800 text-gray-200 rounded-lg max-w-lg w-full p-6 overflow-y-auto max-h-[80vh]">
                    {/* Top bar: Title and Close button */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <h2 className="text-xl font-bold">Terms and Conditions for Rideshare Services</h2>
                        <p className="text-sm text-gray-400">Effective Date: October 31, 2025</p>
                      </div>
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, showTerms: false }))}
                        className="text-white bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] rounded px-2 py-1 text-lg font-bold"
                        aria-label="Close Terms & Conditions"
                      >
                        &times;
                      </button>
                    </div>

                    {/* Terms content */}
                    <div className="space-y-2 text-sm">
                      <p>These Terms and Conditions ("Terms") govern the use of rideshare services ("Services") provided by Redline EV LLC ("Redline EV," "we," "us," or "our") to individuals ("Riders," "you," or "your") booking transportation through our website, mobile application, or other platforms. By accessing, browsing, or using the Services, or by booking a ride, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree, you must not use the Services.</p>

                      <p><strong>1. Acceptance of Terms</strong><br />
                      These Terms form a legally binding agreement between you and the Company. We may update these Terms at any time by posting the revised version on our platform. Your continued use of the Services after such changes constitutes acceptance of the updated Terms. It is your responsibility to review these Terms periodically.</p>

                      <p><strong>2. Description of Services</strong><br />
                      The Services connect Riders with independent drivers ("Drivers") for point-to-point transportation, primarily to and from airports or other designated locations. We act as a technology platform to facilitate bookings, payments, and communications. The Company does not own, operate, or control the vehicles used in the Services, and we are not a common carrier. Services are provided on an "as-is" basis, subject to availability, and may be modified or discontinued at our discretion.</p>

                      <p><strong>3. Eligibility</strong><br />
                      You must be at least 18 years of age and legally competent to enter into contracts to use the Services. By using the Services, you represent that you meet these requirements. The Services are not available in jurisdictions where prohibited by law.</p>

                      <p><strong>4. Account Registration and Security</strong><br />
                      To book a ride, you must create an account ("Account") by providing accurate information, including your name, contact details, and payment method. You are responsible for maintaining the confidentiality of your Account credentials and for all activities occurring under your Account. Notify us immediately of any unauthorized use. We reserve the right to suspend or terminate your Account for any reason, including violations of these Terms.</p>

                      <p><strong>5. Booking and Payments</strong><br />
                      Booking Process: You may book rides via our platform by providing pickup location, drop-off details (e.g., airport), flight information, passenger count, and baggage details. Bookings are subject to confirmation and availability. We may require advance notice for airport transfers.<br />
                      Fees and Payments: All fares, fees, and charges ("Fees") are quoted at the time of booking and are non-refundable except as specified herein. Fees include base fare, time/distance surcharges, airport fees, and gratuities (if applicable). You authorize us to charge your payment method for all Fees, including cancellations or no-shows. All payments are processed securely through third-party providers.<br />
                      Taxes: You are responsible for any applicable taxes on Fees.</p>

                      <p><strong>6. Cancellations and No-Shows</strong><br />
                      Rider Cancellations: You may cancel a booking without penalty if done at least 5 minutes prior to the scheduled pickup time. Late cancellations may incur a fee up to the full fare.<br />
                      No-Shows: Failure to appear for a booked ride within 5 minutes of the scheduled pickup time may result in a no-show fee equivalent to the full fare.<br />
                      Company Cancellations: We may cancel bookings due to unforeseen circumstances (e.g., weather, vehicle unavailability) and will refund any prepaid Fees.</p>

                      <p><strong>7. Rider Responsibilities</strong><br />
                      Provide accurate booking information, including flight numbers for airport services to allow for adjustments due to delays. Arrive at the pickup location on time, prepared with any required identification. Comply with all applicable laws. Treat Drivers and vehicles with respect. For airport drop-offs, allow sufficient time for baggage handling.</p>

                      <p><strong>8. Prohibited Conduct</strong><br />
                      You agree not to: use the Services for illegal purposes, harass Drivers or other users, provide false information, or tamper with the platform.</p>

                      <p><strong>9. Liability and Insurance</strong><br />
                      Limitation of Liability: To the fullest extent permitted by law, the Company shall not be liable for any indirect, incidental, special, or consequential damages arising from the Services, including delays, cancellations, or injuries. Our total liability shall not exceed the Fees paid for the specific ride.<br />
                      Driver Insurance: Drivers are required to maintain commercial auto insurance covering passengers during rides. You are encouraged to review your personal insurance coverage.<br />
                      Assumption of Risk: Rides involve inherent risks, including traffic accidents. You assume all risks associated with using the Services.</p>

                      <p><strong>10. Privacy</strong><br />
                      Your privacy is important to us. Please review our Privacy Policy, incorporated herein by reference, for details on how we collect, use, and protect your personal information.</p>

                      <p><strong>11. Termination</strong><br />
                      We may terminate or suspend your access to the Services at any time, with or without notice, for any reason. Upon termination, all outstanding Fees become immediately due.</p>

                      <p><strong>12. Governing Law and Dispute Resolution</strong><br />
                      These Terms are governed by the laws of the State of Tennessee, without regard to conflict of laws principles. Any disputes arising from these Terms shall be resolved exclusively in the state or federal courts located in Nashville, Tennessee. You agree to waive any right to a jury trial or class action.</p>

                      <p><strong>13. Force Majeure</strong><br />
                      We shall not be liable for delays or failures due to events beyond our reasonable control, including acts of God, strikes, or pandemics.</p>

                      <p><strong>14. Miscellaneous</strong><br />
                      Entire Agreement: These Terms constitute the entire agreement between you and the Company.<br />
                      Severability: If any provision is held invalid, the remainder remains in effect.<br />
                      No Waiver: Our failure to enforce any right does not waive it.<br />
                      Contact Us: For questions, contact <a href="mailto:redlineevrs@gmail.com" className="text-[var(--accent-color)] hover:underline">redlineevrs@gmail.com.com</a>.</p>
                    </div>

                    {/* Close button at bottom */}
                    <div className="mt-4 text-right">
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, showTerms: false }))}
                        className="px-4 py-2 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] rounded"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}


              {/* Submit Buttons */}
              <div className="w-full max-w-md mx-auto flex gap-4 mt-6">
                <button
                  onClick={() => setStep(5)}
                  className="flex-1 py-3 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 transition"
                >
                  Back
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={formData.isSubmitting || !formData.termsAccepted}
                  className={`flex-1 py-3 rounded-lg text-white font-semibold transition ${
                    !formData.termsAccepted || formData.isSubmitting
                      ? "bg-[var(--disabled-color)] cursor-not-allowed"
                      : "bg-[var(--accent-color)] hover:bg-[var(--accent-hover)]"
                  }`}
                >
                  {formData.isSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>

            </div>
          </div>
        )}


        

        


        

      </div>
    </div>
  );
}

export default App;

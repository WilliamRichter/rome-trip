import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import {
  tripDays,
  staticPlaces,
  arrivals
 } from "./data/tripData";
import { SearchBox } from "@mapbox/search-js-react";
import "./styles.css";
import TripMap from "./components/TripMap";

const categorySymbols = {
  museum: "◆",
  food: "●",
  activity: "✦",
  drinks: "◉",
};

function App() {
  const [viewMode, setViewMode] = useState("overview");
  const [selectedDate, setSelectedDate] = useState("2026-12-30");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [manageMode, setManageMode] = useState(false);
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

  const [form, setForm] = useState({
    name: "",
    category: "activity",
    startTime: "",
    locationName: "",
    address: "",
    latitude: "",
    longitude: "",
  });
  const selectedDay = tripDays.find(
    (day) => day.date === selectedDate
  );

  const dayEvents = allEvents
    .filter((event) => event.date === selectedDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  function handleFormChange(event) {
  const { name, value } = event.target;

  setForm((current) => ({
    ...current,
    [name]: value,
  }));
}

async function handleAddEvent(event) {
  event.preventDefault();
  if (!form.latitude || !form.longitude) {
  alert("Please choose a place from the search suggestions.");
  return;
}

  const databaseEvent = {
    date: selectedDate,
    name: form.name,
    category: form.category,
    start_time: form.startTime,
    location_name: form.locationName,
    address: form.address,
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
  };

  const { data, error } = await supabase
    .from("events")
    .insert(databaseEvent)
    .select()
    .single();

  if (error) {
    console.error("Error adding event:", error);
    return;
  }

  const newEvent = {
    id: data.id,
    date: data.date,
    name: data.name,
    category: data.category,
    startTime: data.start_time,
    locationName: data.location_name,
    address: data.address,
    latitude: data.latitude,
    longitude: data.longitude,
  };

  setAllEvents((current) => [...current, newEvent]);

  setForm({
    name: "",
    category: "activity",
    startTime: "",
    locationName: "",
    latitude: "",
    longitude: "",
  });
}

async function handleDeleteEvent(id) {
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting event:", error);
    return;
  }

  setAllEvents((current) =>
    current.filter((event) => event.id !== id)
  );

  if (selectedEvent === id) {
    setSelectedEvent(null);
  }
}

useEffect(() => {
  async function loadEvents() {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error loading events:", error);
    } else {
      const formattedEvents = data.map((event) => ({
        id: event.id,
        date: event.date,
        startTime: event.start_time,
        name: event.name,
        category: event.category,
        locationName: event.location_name,
        address: event.address,
        latitude: event.latitude,
        longitude: event.longitude,
      }));

      setAllEvents(formattedEvents);
    }

    setLoading(false);
  }

  loadEvents();
}, []);

function handlePlaceSelected(result) {
  const feature = result.features?.[0];

  if (!feature) return;

  const [longitude, latitude] = feature.geometry.coordinates;

setForm((current) => ({
  ...current,
  locationName:
    feature.properties?.name ||
    "Selected place",

  address:
    feature.properties?.full_address ||
    feature.properties?.place_formatted ||
    "",

  latitude,
  longitude,
}));
}

function openDay(date) {
  setSelectedDate(date);
  setSelectedEvent(null);
  setManageMode(false);
  setViewMode("day");
}

  return (
    <div className="app">

      <header className="hero">
        <p className="eyebrow">FAMILY TRIP</p>

        <h1>ROMA</h1>

        <p className="trip-dates">
          29 DECEMBER 2026 — 3 JANUARY 2027
        </p>
      </header>
      {viewMode === "overview" ? (
  <main className="overview">
    <div className="overview-heading">
      <p className="eyebrow">THE STAY AT A GLANCE</p>
      <h2>29 December — 3 January</h2>
    </div>

    <div className="overview-days">
      {tripDays.map((day) => {
        const arrivalsForDay = arrivals.filter(
          (arrival) => arrival.date === day.date
        );

        const eventsForDay = allEvents.filter(
          (event) => event.date === day.date
        );

        return (
          <button
            key={day.date}
            className="overview-day-card"
            onClick={() => openDay(day.date)}
          >
            <div className="overview-date">
              <span>{day.weekday}</span>
              <strong>{day.shortDate}</strong>
            </div>

            <div className="overview-day-content">
              <div className="overview-owner">
                Hosted by{" "}
                <strong>{day.owners.join(" & ")}</strong>
              </div>

              {arrivalsForDay.map((arrival) => (
                <div
                  key={arrival.id}
                  className="overview-arrival"
                >
                  <span className="overview-time">
                    {arrival.time}
                  </span>

                  <div>
                    <strong>{arrival.people}</strong>
                    <div>{arrival.detail}</div>
                  </div>
                </div>
              ))}

              <div className="overview-event-count">
                {eventsForDay.length} activities planned
              </div>
            </div>

            <div className="overview-arrow">→</div>
          </button>
        );
      })}
    </div>
  </main>
) : (
  <>
    <div className="detail-navigation">
    <button
      className="back-button"
      onClick={() => setViewMode("overview")}
    >
      ← Back to overview
    </button>
  </div>
      <nav className="day-selector">
        {tripDays.map((day) => (
          <button
            key={day.date}
            className={
              selectedDate === day.date
                ? "day-button active"
                : "day-button"
            }
            onClick={() => {
              setSelectedDate(day.date);
              setSelectedEvent(null);
            }}
          >
            <span>{day.weekday}</span>
            <strong>{day.shortDate}</strong>
          </button>
        ))}
      </nav>

      <main className="content">

  <section className="itinerary-panel">


    <div className="day-header">
      <div>
        <p className="eyebrow">TODAY'S PLAN</p>

        <h2>
          {selectedDay.weekday} {selectedDay.shortDate}
        </h2>
      </div>

      <div className="owner">
        Hosted by{" "}
        <strong>
          {selectedDay.owners.join(" & ")}
        </strong>
      </div>
    </div>

    <div className="events">

      {dayEvents.length === 0 && (
        <div className="empty">
          Nothing planned yet.
        </div>
      )}

      {dayEvents.map((event) => (
        <div
          className={
            selectedEvent === event.id
              ? "event-card selected"
              : "event-card"
          }
          key={event.id}
          onClick={() => setSelectedEvent(event.id)}
        >

          <div className="event-time">
            {event.startTime}
          </div>

          <div className="event-symbol">
            {categorySymbols[event.category] || "○"}
          </div>

          <div className="event-details">
            <div className="category">
              {event.category}
            </div>

            <h3>{event.name}</h3>

            <p>{event.locationName}</p>
            {event.address && (
              <p className="event-address">
                {event.address}
              </p>
            )}

            {manageMode && (
              <button
                className="delete-button"
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation();
                  handleDeleteEvent(event.id);
                }}
              >
                Delete
              </button>
            )}
          </div>

        </div>
      ))}

    </div>
    <button
  className="manage-button"
  onClick={() => setManageMode((current) => !current)}
>
  {manageMode ? "Done managing" : "Manage this day"}
</button>
{manageMode && (
  <form className="event-form" onSubmit={handleAddEvent}>

    <h3>Add event</h3>

    <label>
      Name
      <input
        name="name"
        value={form.name}
        onChange={handleFormChange}
        required
      />
    </label>

    <label>
      Category
      <select
        name="category"
        value={form.category}
        onChange={handleFormChange}
      >
        <option value="activity">Activity</option>
        <option value="museum">Museum</option>
        <option value="food">Food</option>
        <option value="drinks">Drinks</option>
      </select>
    </label>

    <label>
      Start time
    <input
      type="text"
      name="startTime"
      value={form.startTime}
      onChange={handleFormChange}
      placeholder="e.g. 18:30"
      pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
      title="Enter time in 24-hour format, e.g. 18:30"
      required
    />
    </label>

    <label>
      Place

      <SearchBox
        accessToken={mapboxToken}
        value={form.locationName}
        onChange={(value) =>
          setForm((current) => ({
            ...current,
            locationName: value,
            latitude: "",
            longitude: "",
          }))
        }
        onRetrieve={handlePlaceSelected}
        placeholder="Search Rome..."
        options={{
          language: "en",
          country: "IT",

          // Restrict results to Rome
          bbox: [
            12.35,  // west
            41.78,  // south
            12.65,  // east
            42.02,  // north
          ],

          // Prioritize central Rome within that area
          proximity: {
            lng: 12.4964,
            lat: 41.9028,
          },

          limit: 6,
        }}
      />
    </label>

    {form.latitude && form.longitude && (
  <div className="place-confirmation">
    ✓ Location selected
  </div>
)}

    <button type="submit">
      Add event
    </button>

  </form>
)}
  </section>

  <section className="map-panel">
    <TripMap
  events={dayEvents}
  staticPlaces={staticPlaces}
  selectedEvent={selectedEvent}
  onSelectEvent={setSelectedEvent}
/>
  </section>

</main>
  </>
)}
    </div>
  );
}

export default App;
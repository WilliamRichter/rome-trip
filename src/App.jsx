import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { tripDays, staticPlaces, arrivals } from "./data/tripData";
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
  const [postcardFlipped, setPostcardFlipped] = useState(false);
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

  const [form, setForm] = useState({
    name: "",
    category: "activity",
    startTime: "",
    locationName: "",
    address: "",
    websiteUrl: "",
    latitude: "",
    longitude: "",
  });
  const selectedDay = tripDays.find((day) => day.date === selectedDate);

  const dayEvents = useMemo(() => {
    return allEvents
      .filter((event) => event.date === selectedDate)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [allEvents, selectedDate]);

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
      website_url: form.websiteUrl || null,
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
      websiteUrl: data.website_url,
      latitude: data.latitude,
      longitude: data.longitude,
    };

    setAllEvents((current) => [...current, newEvent]);

    setForm({
      name: "",
      category: "activity",
      startTime: "",
      locationName: "",
      address: "",
      websiteUrl: "",
      latitude: "",
      longitude: "",
    });
  }

  async function handleDeleteEvent(id) {
    const { error } = await supabase.from("events").delete().eq("id", id);

    if (error) {
      console.error("Error deleting event:", error);
      return;
    }

    setAllEvents((current) => current.filter((event) => event.id !== id));

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
          websiteUrl: event.website_url,
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
      locationName: feature.properties?.name || "Selected place",

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
  useEffect(() => {
    const tripStart = new Date("2026-12-30T00:00:00+01:00");

    function updateCountdown() {
      const now = new Date();
      const difference = tripStart - now;

      if (difference <= 0) {
        setCountdown({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
        });
        return;
      }

      setCountdown({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    }

    updateCountdown();

    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, []);
  return (
    <div className="app">
      {viewMode === "overview" ? (
        <main className="overview">
          <div className="postcard-intro-heading">All roads lead to...</div>
          <div
            className={`postcard ${postcardFlipped ? "flipped" : ""}`}
            onClick={() => setPostcardFlipped((current) => !current)}
          >
            <div className="postcard-inner">
              <div className="postcard-front">
                <img src="/images/rome-postcard.jpg" alt="Family in Rome" />

                <div className="postcard-front-title">ROMA 2026 / 2027</div>

                <div className="postcard-hint">Click if you dare!</div>
              </div>

              <div className="postcard-back">
                <div className="postcard-message">
                  <p className="postcard-opening">
                    ...or at least that's what they say.
                  </p>

                  <p>
                    They also say Rome wasn't built in a day. They say a lot of
                    things. You choose what to believe.
                  </p>

                  <p>
                    What is certain, however, is that from 30 December 2026 to 3
                    January 2027, the city of Rome will find itself confronted
                    with a previously unseen combination of individuals. Let's
                    call them{" "}
                    <span className="group-name">
                      Dieden Franco Richter & Friends
                    </span>{" "}
                    for now. And you, being a member of this group, are DEARLY
                    invited.
                  </p>

                  <p className="postcard-stats">
                    5 days. 11 people. 8 languages. 1 birthday.
                  </p>

                  <p>
                    Sounds like a lot? Fret not! Play around a bit with this
                    website, and I'm sure we'll all look back on this trip
                    fondly.
                  </p>

                  <p className="postcard-remember">
                    <strong>E RICORDATI:</strong>
                    <br />
                    Quando sei a Roma, fai come i romani!
                    <br />
                    Ti vedrò tra...
                  </p>

                  <div className="postcard-countdown">
                    <div className="countdown-numbers">
                      <div>
                        <strong>{countdown.days}</strong>
                        <span>days</span>
                      </div>

                      <div>
                        <strong>{countdown.hours}</strong>
                        <span>hours</span>
                      </div>

                      <div>
                        <strong>{countdown.minutes}</strong>
                        <span>min</span>
                      </div>

                      <div>
                        <strong>{countdown.seconds}</strong>
                        <span>sec</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="postcard-address">
                  <div className="postcard-stamp">
                    <img
                      src="/images/rome-stamp.png"
                      alt="Roma postage stamp"
                    />
                  </div>

                  <div className="invite-block">
                    <div className="invite-intro">
                      <span>THIS INVITATION IS</span>
                      <span>EXTENDED TO</span>
                    </div>

                    <div className="invite-recipient">
                      An Honorary Member of
                      <br />
                      Dieden Franco Richter & Friends
                    </div>

                    <div className="invite-divider">
                      <span>❧</span>
                    </div>

                    <div className="invite-destination">
                      <strong>Rome, Italy</strong>
                      <span>30 Dec 2026 — 3 Jan 2027</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <section className="overview-map-section">
            <div className="overview-map-heading">
              <p className="eyebrow">OUR ROME</p>
              <h2>Places we'll be visiting</h2>
            </div>

            <div className="overview-map">
              <TripMap
                events={allEvents}
                staticPlaces={staticPlaces}
                selectedEvent={null}
                overviewMode={true}
              />
            </div>
          </section>
          <div className="overview-heading">
            <p className="eyebrow">THE STAY AT A GLANCE</p>
            <h2>30 December — 3 January</h2>
          </div>

          <div className="overview-days">
            {tripDays.map((day) => {
              const arrivalsForDay = arrivals.filter(
                (arrival) => arrival.date === day.date,
              );

              const eventsForDay = allEvents.filter(
                (event) => event.date === day.date,
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
                    <div className="overview-description">
                      {day.description}
                    </div>

                    {day.showHost !== false && (
                      <div className="overview-owner">
                        Hosted by <strong>{day.owners.join(" & ")}</strong>
                      </div>
                    )}

                    {/* Logistics: arrivals / departures / good-to-know */}
                    {arrivalsForDay.map((arrival) => (
                      <div
                        key={arrival.id}
                        className="overview-item overview-logistics"
                      >
                        <span className="overview-time">{arrival.time}</span>

                        <div className="overview-item-content">
                          <strong>{arrival.people}</strong>
                          <span>{arrival.detail}</span>
                        </div>
                      </div>
                    ))}

                    {/* Planned activities from Supabase */}
                    {eventsForDay.map((event) => (
                      <div
                        key={event.id}
                        className="overview-item overview-activity"
                      >
                        <span className="overview-time">{event.startTime}</span>

                        <span className="overview-event-symbol">
                          {categorySymbols[event.category] || "○"}
                        </span>

                        <div className="overview-item-content">
                          <strong>{event.name}</strong>
                          <span>{event.locationName}</span>
                        </div>
                      </div>
                    ))}

                    {arrivalsForDay.length === 0 &&
                      eventsForDay.length === 0 && (
                        <div className="overview-empty">
                          Nothing planned yet.
                        </div>
                      )}
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
                  selectedDate === day.date ? "day-button active" : "day-button"
                }
                onClick={() => {
                  setSelectedDate(day.date);
                  setSelectedEvent(null);
                  setManageMode(false);
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

                {selectedDay.showHost !== false && (
                  <div className="owner">
                    Hosted by <strong>{selectedDay.owners.join(" & ")}</strong>
                  </div>
                )}
              </div>

              <div className="events">
                {dayEvents.length === 0 && (
                  <div className="empty">Nothing planned yet.</div>
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
                    <div className="event-time">{event.startTime}</div>

                    <div className="event-symbol">
                      {categorySymbols[event.category] || "○"}
                    </div>

                    <div className="event-details">
                      <div className="category">{event.category}</div>

                      <h3>{event.name}</h3>

                      <p>{event.locationName}</p>
                      {event.address && (
                        <p className="event-address">{event.address}</p>
                      )}

                      <div
                        className={`event-actions ${
                          event.websiteUrl ? "has-website" : "maps-only"
                        }`}
                      >
                        <a
                          className="event-link"
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            `${event.locationName} ${event.address || ""}`,
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(clickEvent) => clickEvent.stopPropagation()}
                        >
                          Open in Maps ↗
                        </a>

                        {event.websiteUrl && (
                          <a
                            className="event-link"
                            href={event.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(clickEvent) =>
                              clickEvent.stopPropagation()
                            }
                          >
                            Website ↗
                          </a>
                        )}
                      </div>
                    </div>
                    {manageMode && (
                      <button
                        className="delete-button"
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          handleDeleteEvent(event.id);
                        }}
                      >
                        Delete this activity
                      </button>
                    )}
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
                          12.35, // west
                          41.78, // south
                          12.65, // east
                          42.02, // north
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

                  <label>
                    Website <span className="optional">(optional)</span>
                    <input
                      type="url"
                      name="websiteUrl"
                      value={form.websiteUrl}
                      onChange={handleFormChange}
                      placeholder="https://..."
                    />
                  </label>

                  {form.latitude && form.longitude && (
                    <div className="place-confirmation">
                      ✓ Location selected
                    </div>
                  )}

                  <button type="submit">Add event</button>
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

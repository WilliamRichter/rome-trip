import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { tripDays, staticPlaces, arrivals } from "./data/tripData";
import { SearchBox } from "@mapbox/search-js-react";
import "./styles.css";
import TripMap from "./components/TripMap";
import { categorySymbols } from "./data/categories";

const SITE_PASSWORD = import.meta.env.VITE_SITE_PASSWORD || "rome2027";
const ACCESS_KEY = "diedenrichter-site-access";

function App() {
  const [viewMode, setViewMode] = useState("overview");
  const [selectedDate, setSelectedDate] = useState("2026-12-30");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postcardFlipped, setPostcardFlipped] = useState(false);
  const [gateFlipped, setGateFlipped] = useState(false);
  const [revealStarted, setRevealStarted] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (isLocalhost) {
      return false;
    }

    return window.localStorage.getItem(ACCESS_KEY) === SITE_PASSWORD;
  });
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showRevealTitle, setShowRevealTitle] = useState(false);
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [addActivityOpen, setAddActivityOpen] = useState(false);
  const [openEventMenu, setOpenEventMenu] = useState(null);

  const [editingEventId, setEditingEventId] = useState(null);
  const formRef = useRef(null);
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
  const dayInfo = arrivals.filter((arrival) => arrival.date === selectedDate);

  function handleUnlock(event) {
    event.preventDefault();

    if (passwordInput === SITE_PASSWORD) {
      const isLocalhost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

      if (!isLocalhost) {
        window.localStorage.setItem(ACCESS_KEY, SITE_PASSWORD);
      }

      setPasswordError("");
      setPasswordInput("");
      setShowRevealTitle(true);

      window.setTimeout(() => {
        setShowRevealTitle(false);
        setIsUnlocked(true);
      }, 6200);
      return;
    }

    setPasswordError("Incorrect password.");
  }

  function normalizePlaceText(value = "") {
    return value.toLowerCase().replace(/[’']/g, "").replace(/\s+/g, " ").trim();
  }

  function handleStaticPlaceSelected(place) {
    setForm((current) => ({
      ...current,
      locationName: place.name,
      address: place.address || "",
      latitude: place.latitude,
      longitude: place.longitude,
    }));
  }

  function getStaticPlaceScore(place, query = "") {
    const normalizedQuery = normalizePlaceText(query);
    const normalizedPlaceName = normalizePlaceText(place.name);
    const normalizedAddress = normalizePlaceText(place.address || "");

    if (!normalizedQuery) {
      return 0;
    }

    let score = 0;
    const queryWords = normalizedQuery.split(" ").filter(Boolean);

    if (normalizedPlaceName === normalizedQuery) score += 1000;
    if (normalizedAddress === normalizedQuery) score += 900;
    if (normalizedPlaceName.startsWith(normalizedQuery)) score += 500;
    if (normalizedAddress.startsWith(normalizedQuery)) score += 450;
    if (normalizedPlaceName.includes(normalizedQuery)) score += 300;
    if (normalizedAddress.includes(normalizedQuery)) score += 250;

    const matchingWords = queryWords.filter(
      (word) =>
        word.length > 1 &&
        (normalizedPlaceName.includes(word) ||
          normalizedAddress.includes(word)),
    ).length;

    if (matchingWords > 0) {
      score += matchingWords * 60;
    }

    if (
      queryWords.every(
        (word) => word.length > 1 && normalizedPlaceName.includes(word),
      )
    ) {
      score += 120;
    }

    if (
      queryWords.every(
        (word) => word.length > 1 && normalizedAddress.includes(word),
      )
    ) {
      score += 100;
    }

    return score;
  }

  function buildStaticPlaceSuggestions(query = "") {
    const normalizedQuery = normalizePlaceText(query);

    if (!normalizedQuery) {
      return [];
    }

    return staticPlaces
      .map((place) => ({
        place,
        score: getStaticPlaceScore(place, normalizedQuery),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ place }) => ({
        name: place.name,
        place_formatted: place.address || "Rome, Italy",
        full_address: place.address || place.name,
        address: place.address || "",
        feature_type: "poi",
        context: {},
        language: "en",
        maki: "marker",
        poi_category: ["lodging"],
        brand: "",
        brand_id: "",
        external_ids: {},
        metadata: {
          saved_place: true,
          saved_place_id: place.id,
        },
        _geometry: {
          type: "Point",
          coordinates: [place.longitude, place.latitude],
        },
      }))
      .slice(0, 5);
  }

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

    let data;
    let error;

    if (editingEventId) {
      const result = await supabase
        .from("events")
        .update(databaseEvent)
        .eq("id", editingEventId)
        .select()
        .single();

      data = result.data;
      error = result.error;
    } else {
      const result = await supabase
        .from("events")
        .insert(databaseEvent)
        .select()
        .single();

      data = result.data;
      error = result.error;
    }

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

    setAllEvents((current) => {
      if (editingEventId) {
        return current.map((event) =>
          event.id === editingEventId ? newEvent : event,
        );
      }

      return [...current, newEvent];
    });

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
    setEditingEventId(null);
    setSelectedEvent(data.id);
    setAddActivityOpen(false);
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

    const matchedStaticPlace = staticPlaces.find((place) => {
      const featureName = normalizePlaceText(feature.properties?.name || "");
      const featureAddress = normalizePlaceText(
        feature.properties?.full_address ||
          feature.properties?.place_formatted ||
          "",
      );
      const placeName = normalizePlaceText(place.name);
      const placeAddress = normalizePlaceText(place.address || "");

      return (
        featureName === placeName ||
        featureAddress === placeAddress ||
        featureName.includes(placeName) ||
        placeName.includes(featureName) ||
        featureAddress === placeAddress ||
        placeAddress.includes(featureAddress) ||
        featureAddress.includes(placeAddress)
      );
    });

    if (matchedStaticPlace) {
      handleStaticPlaceSelected(matchedStaticPlace);
      return;
    }

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
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });

    setSelectedDate(date);
    setSelectedEvent(null);
    setAddActivityOpen(false);
    setViewMode("day");
  }
  useEffect(() => {
    if (!addActivityOpen || !formRef.current) return;

    const timer = window.setTimeout(() => {
      formRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [addActivityOpen, editingEventId]);

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

  const revealPhrase = "All roads lead to...".split("");

  if (showRevealTitle) {
    return (
      <div className="private-gate private-gate-reveal-screen">
        <div className="private-gate-reveal-text" aria-live="polite">
          {revealPhrase.map((letter, index) => (
            <span
              key={`${letter}-${index}`}
              className={`private-gate-reveal-letter${letter === " " ? " is-space" : ""}`}
              style={{ animationDelay: `${index * 112}ms` }}
            >
              {letter === " " ? "\u00A0" : letter}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="private-gate">
        <div className="private-gate-card">
          <div className="private-gate-header">
            <span className="private-gate-kicker">Invitation</span>
            <h1>Enter password</h1>
          </div>

          <div className="private-gate-divider" aria-hidden="true" />

          <form onSubmit={handleUnlock} className="private-gate-form">
            <label htmlFor="site-password">Password</label>
            <input
              id="site-password"
              type="password"
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
            />

            {passwordError && (
              <p className="private-gate-error">{passwordError}</p>
            )}

            <button type="submit">Enter</button>
          </form>
        </div>
      </div>
    );
  }

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

                <div
                  className="postcard-hint"
                  aria-label="Turn the postcard over"
                >
                  Tap to turn
                </div>
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
                      Dieden Franco Richter &amp; Friends
                    </span>{" "}
                    for now. And you, being a member of this group, are DEARLY
                    invited.
                  </p>

                  <p className="postcard-stats">
                    5 days. 11 people. 8 languages. 1 birthday.
                  </p>

                  <p>
                    What a group! And in true Roman democratic fashion, everyone
                    has been assigned a day and with it, absolute authority over
                    what we do. Find your day below and add your activities once
                    you've decided how we'll spend it!
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
                      Dieden Franco Richter &amp; Friends
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
            <div className="overview-map-intro">
              <div className="overview-map-heading">
                <h2>Oh, the places we'll go!</h2>
              </div>
            </div>

            <div className="overview-map-frame">
              <div className="overview-map">
                <TripMap
                  events={allEvents}
                  staticPlaces={staticPlaces}
                  selectedEvent={null}
                  overviewMode={true}
                />
              </div>
            </div>
          </section>
          <div className="overview-heading">
            <p className="eyebrow">OUR STAY AT A GLANCE</p>
            <h2>30 December — 3 January</h2>
          </div>

          <div className="overview-days">
            {tripDays.map((day) => {
              const arrivalsForDay = arrivals.filter(
                (arrival) => arrival.date === day.date,
              );

              const eventsForDay = allEvents
                .filter((event) => event.date === day.date)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));

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
                        Hosted by{" "}
                        <strong>
                          {day.hostLabel ||
                            day.owners.map((owner) => owner.name).join(" & ")}
                        </strong>
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
                          <div className="overview-item-meta">
                            <span className="overview-tag overview-tag-logistics">
                              Info
                            </span>
                            <strong>{arrival.people}</strong>
                          </div>
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
                  setAddActivityOpen(false);
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
                  <p className="day-description">{selectedDay.description}</p>
                </div>

                {selectedDay.showHost !== false && (
                  <div className="day-hosts">
                    <div
                      className={`host-portraits hosts-${selectedDay.owners.length}`}
                    >
                      {selectedDay.owners.map((owner, index) => (
                        <img
                          key={owner.name}
                          src={owner.image}
                          alt={owner.name}
                          className={`host-portrait host-${index}`}
                        />
                      ))}
                    </div>

                    <div className="owner">
                      Hosted by{" "}
                      <strong>
                        {selectedDay.hostLabel ||
                          selectedDay.owners
                            .map((owner) => owner.name)
                            .join(" & ")}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="add-activity-button"
                onClick={() => setAddActivityOpen((current) => !current)}
              >
                {addActivityOpen ? "Cancel" : "+ Add activity"}
              </button>

              {dayInfo.length > 0 && (
                <div className="day-notes">
                  {dayInfo.map((info) => {
                    const mappedLocation = staticPlaces.find((place) => {
                      const detailText = info.detail.toLowerCase();
                      const placeName = place.name.toLowerCase();
                      const placeAddress = (place.address || "").toLowerCase();

                      return (
                        detailText.includes(placeName) ||
                        detailText.includes(placeAddress.split(",")[0].trim())
                      );
                    });

                    const infoMapsQuery = mappedLocation
                      ? `${mappedLocation.name} ${mappedLocation.address || ""}`
                      : info.detail;

                    return (
                      <div className="day-note" key={info.id}>
                        <div className="day-note-time">{info.time}</div>

                        <div className="day-note-body">
                          <div className="day-note-label">Info</div>
                          <div className="day-note-text">{info.people}</div>
                          <div className="day-note-detail">{info.detail}</div>

                          <div className="event-actions maps-only">
                            <a
                              className="event-link"
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                infoMapsQuery,
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(clickEvent) =>
                                clickEvent.stopPropagation()
                              }
                            >
                              Open in Maps ↗
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

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
                    <div className="event-menu-wrapper">
                      <button
                        type="button"
                        className="event-menu-button"
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();

                          setOpenEventMenu((current) =>
                            current === event.id ? null : event.id,
                          );
                        }}
                      >
                        •••
                      </button>

                      {openEventMenu === event.id && (
                        <div
                          className="event-menu"
                          onClick={(clickEvent) => clickEvent.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="event-menu-item"
                            onClick={() => {
                              setEditingEventId(event.id);

                              setForm({
                                name: event.name,
                                category: event.category,
                                startTime: event.startTime,
                                locationName: event.locationName,
                                address: event.address || "",
                                websiteUrl: event.websiteUrl || "",
                                latitude: event.latitude,
                                longitude: event.longitude,
                              });

                              setAddActivityOpen(true);
                              setOpenEventMenu(null);
                            }}
                          >
                            Edit activity
                          </button>

                          <button
                            type="button"
                            className="event-menu-item event-menu-delete"
                            onClick={() => {
                              const confirmed = window.confirm(
                                `Delete "${event.name}"?`,
                              );

                              if (confirmed) {
                                handleDeleteEvent(event.id);
                              }

                              setOpenEventMenu(null);
                            }}
                          >
                            Delete activity
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {addActivityOpen && (
                <form
                  ref={formRef}
                  className="event-form"
                  onSubmit={handleAddEvent}
                >
                  <h3>{editingEventId ? "Edit activity" : "Add activity"}</h3>

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
                      <option value="coffee">Coffee</option>
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
                      onChange={(value) => {
                        setForm((current) => ({
                          ...current,
                          locationName: value,
                          latitude: "",
                          longitude: "",
                        }));
                      }}
                      componentOptions={{
                        customSearch: async (text) => {
                          const matches = buildStaticPlaceSuggestions(text);
                          return matches;
                        },
                      }}
                      onRetrieve={(result) => {
                        const feature = result.features?.[0];

                        if (!feature) return;

                        const savedPlace = staticPlaces.find((place) => {
                          const sameName =
                            normalizePlaceText(place.name) ===
                            normalizePlaceText(feature.properties?.name || "");
                          const sameAddress =
                            normalizePlaceText(place.address || "") ===
                            normalizePlaceText(
                              feature.properties?.full_address ||
                                feature.properties?.place_formatted ||
                                "",
                            );

                          return sameName || sameAddress;
                        });

                        if (savedPlace) {
                          handleStaticPlaceSelected(savedPlace);
                          return;
                        }

                        handlePlaceSelected(result);
                      }}
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

                  <button type="submit">
                    {editingEventId ? "Save changes" : "Add activity"}
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

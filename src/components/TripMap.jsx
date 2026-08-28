import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { categorySymbols } from "../data/categories";

function createMapIcon(symbol) {
  return L.divIcon({
    className: "map-marker",
    html: `<div class="map-marker-inner">${symbol}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -22],
  });
}

function TripMap({
  events,
  staticPlaces,
  selectedEvent,
  onSelectEvent = null,
  overviewMode = false,
}) {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const eventLayer = useRef(null);
  const staticLayer = useRef(null);
  const markers = useRef({});
  const staticMarkers = useRef({});

  useEffect(() => {
    if (mapInstance.current) return;

    mapInstance.current = L.map(mapContainer.current).setView(
      [41.9028, 12.4964],
      13,
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(mapInstance.current);

    eventLayer.current = L.layerGroup().addTo(mapInstance.current);

    staticLayer.current = L.layerGroup().addTo(mapInstance.current);
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !eventLayer.current || !staticLayer.current) {
      return;
    }

    eventLayer.current.clearLayers();
    staticLayer.current.clearLayers();
    markers.current = {};
    staticMarkers.current = {};

    const bounds = [];

    const matchesStaticPlace = (
      place,
      latitude,
      longitude,
      locationName,
      address,
    ) => {
      const lat = Number(latitude);
      const lng = Number(longitude);

      const sameCoordinates =
        Math.abs(Number(place.latitude) - lat) < 0.0005 &&
        Math.abs(Number(place.longitude) - lng) < 0.0005;

      const samePlaceName =
        (place.name || "").trim().toLowerCase() ===
        (locationName || "").trim().toLowerCase();

      const sameAddress =
        (place.address || "").trim().toLowerCase() ===
        (address || "").trim().toLowerCase();

      return sameCoordinates || samePlaceName || sameAddress;
    };

    const isAccommodationLocation = (
      latitude,
      longitude,
      locationName,
      address,
    ) => {
      return staticPlaces.some((place) =>
        matchesStaticPlace(place, latitude, longitude, locationName, address),
      );
    };

    // Day-specific itinerary events
    events.forEach((event) => {
      if (
        isAccommodationLocation(
          event.latitude,
          event.longitude,
          event.locationName,
          event.address,
        )
      ) {
        return;
      }

      const symbol = categorySymbols[event.category] || "📍";

      const marker = L.marker([event.latitude, event.longitude], {
        icon: createMapIcon(symbol),
      });

      // Create readable date for this event
      const eventDate = new Date(`${event.date}T12:00:00`);

      const dayLabel = eventDate
        .toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
        })
        .toUpperCase();

      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${event.locationName} ${event.address || ""}`,
      )}`;

      const websiteLink = event.websiteUrl
        ? `
      <a
        href="${event.websiteUrl}"
        target="_blank"
        rel="noopener noreferrer"
      >
        Website ↗
      </a>
    `
        : "";

      // OVERVIEW MAP
      if (overviewMode) {
        marker.bindPopup(`
<div class="overview-map-popup">
  <strong>${event.locationName}</strong>

  <span class="overview-popup-date">
    ${dayLabel}
  </span>
</div>
    `);
      }

      // NORMAL DAY MAP
      else {
        marker.bindPopup(`
      <div class="map-popup">
        <strong>${event.name}</strong><br />
        ${event.startTime}<br />
        ${event.locationName}

        ${
          event.address
            ? `<br /><span class="map-popup-address">
                ${event.address}
              </span>`
            : ""
        }

        <div class="map-popup-actions">
          <a
            href="${mapsUrl}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in Maps ↗
          </a>

          ${websiteLink}
        </div>
      </div>
    `);
      }

      if (onSelectEvent) {
        marker.on("click", () => {
          onSelectEvent(event.id);
        });
      }

      marker.addTo(eventLayer.current);

      markers.current[event.id] = marker;

      bounds.push([event.latitude, event.longitude]);
    });

    // Static places such as accommodation
    staticPlaces.forEach((place) => {
      const symbol = place.type === "hotel" ? "🏨" : "🏠";
      const matchingEvents = events
        .filter((event) =>
          matchesStaticPlace(
            place,
            event.latitude,
            event.longitude,
            event.locationName,
            event.address,
          ),
        )
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      const marker = L.marker([place.latitude, place.longitude], {
        icon: createMapIcon(symbol),
      });

      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${place.name} ${place.address || ""}`,
      )}`;

      if (onSelectEvent && matchingEvents.length > 0) {
        marker.on("click", () => {
          onSelectEvent(matchingEvents[0].id);
        });
      }

      if (overviewMode) {
        marker.bindPopup(`
      <div class="overview-map-popup">
        <strong>${place.name}</strong>

        <span class="overview-popup-static">
          ${place.type}
        </span>
      </div>
    `);
      } else {
        const extraDetail = matchingEvents.length
          ? `<div class="map-popup-note"><strong>Also today:</strong><br />${matchingEvents
              .map(
                (event) =>
                  `${event.startTime} · ${event.name}${
                    event.locationName && event.locationName !== place.name
                      ? ` at ${event.locationName}`
                      : ""
                  }`,
              )
              .join("<br />")}</div>`
          : "";

        marker.bindPopup(`
      <div class="map-popup">
        <strong>${place.name}</strong>

        ${
          place.address
            ? `<br /><span class="map-popup-address">
                ${place.address}
              </span>`
            : ""
        }

        ${place.description ? `<br />${place.description}` : ""}

        ${extraDetail}

        <div class="map-popup-actions">
          <a
            href="${mapsUrl}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in Maps ↗
          </a>
        </div>
      </div>
    `);
      }

      staticMarkers.current[place.id] = marker;
      marker.addTo(staticLayer.current);
      bounds.push([place.latitude, place.longitude]);
    });

    if (bounds.length === 1) {
      mapInstance.current.setView(bounds[0], 15);
    } else if (bounds.length > 1) {
      mapInstance.current.fitBounds(bounds, {
        padding: [40, 40],
      });
    }
  }, [events, staticPlaces, onSelectEvent]);

  useEffect(() => {
    if (!selectedEvent) return;

    const eventMarker = markers.current[selectedEvent];

    if (eventMarker) {
      const position = eventMarker.getLatLng();

      mapInstance.current.flyTo(position, 16, {
        duration: 0.8,
      });

      eventMarker.openPopup();
      return;
    }

    const matchedEvent = events.find((event) => event.id === selectedEvent);

    if (!matchedEvent) return;

    const fallbackMarker = Object.values(staticMarkers.current).find(
      (marker) => {
        const { lat, lng } = marker.getLatLng();
        return (
          Math.abs(Number(lat) - Number(matchedEvent.latitude)) < 0.0005 &&
          Math.abs(Number(lng) - Number(matchedEvent.longitude)) < 0.0005
        );
      },
    );

    if (!fallbackMarker) return;

    mapInstance.current.flyTo(fallbackMarker.getLatLng(), 16, {
      duration: 0.8,
    });

    fallbackMarker.openPopup();
  }, [selectedEvent, events]);

  return <div ref={mapContainer} className="map" />;
}

export default TripMap;

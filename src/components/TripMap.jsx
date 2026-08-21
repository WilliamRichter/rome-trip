import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const hotelIcon = L.divIcon({
  className: "static-place-marker",
  html: `<div class="static-marker-icon">H</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -20],
});

const apartmentIcon = L.divIcon({
  className: "static-place-marker",
  html: `<div class="static-marker-icon">⌂</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -20],
});

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

    const bounds = [];

    // Day-specific itinerary events
    events.forEach((event) => {
      const marker = L.marker([event.latitude, event.longitude]);

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
      const icon = place.type === "hotel" ? hotelIcon : apartmentIcon;

      const marker = L.marker([place.latitude, place.longitude], { icon });

      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${place.name} ${place.address || ""}`,
      )}`;

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

      marker.addTo(staticLayer.current);
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

    const marker = markers.current[selectedEvent];

    if (!marker) return;

    const position = marker.getLatLng();

    mapInstance.current.flyTo(position, 16, {
      duration: 0.8,
    });

    marker.openPopup();
  }, [selectedEvent]);

  return <div ref={mapContainer} className="map" />;
}

export default TripMap;

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function TripMap({
  events,
  selectedEvent,
  onSelectEvent,
}) {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const markerLayer = useRef(null);
  const markers = useRef({});

  useEffect(() => {
    if (mapInstance.current) return;

    mapInstance.current = L.map(mapContainer.current).setView(
      [41.9028, 12.4964],
      13
    );

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: "&copy; OpenStreetMap contributors",
      }
    ).addTo(mapInstance.current);

    markerLayer.current = L.layerGroup().addTo(
      mapInstance.current
    );
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !markerLayer.current) return;

    markerLayer.current.clearLayers();
    markers.current = {};

    if (events.length === 0) {
      mapInstance.current.setView(
        [41.9028, 12.4964],
        13
      );
      return;
    }

    const bounds = [];

    events.forEach((event) => {
      const marker = L.marker([
        event.latitude,
        event.longitude,
      ]);

      marker.bindPopup(`
        <strong>${event.name}</strong><br />
        ${event.startTime}<br />
        ${event.locationName}
      `);

      marker.on("click", () => {
        onSelectEvent(event.id);
      });

      marker.addTo(markerLayer.current);

      markers.current[event.id] = marker;

      bounds.push([
        event.latitude,
        event.longitude,
      ]);
    });

    if (bounds.length === 1) {
      mapInstance.current.setView(bounds[0], 15);
    } else {
      mapInstance.current.fitBounds(bounds, {
        padding: [40, 40],
      });
    }
  }, [events, onSelectEvent]);

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
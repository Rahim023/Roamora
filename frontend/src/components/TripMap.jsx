import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { motion, useReducedMotion } from 'motion/react';
import L from 'leaflet';
import markerUrl from 'leaflet/dist/images/marker-icon.png';
import markerRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { popupPanelMotion } from './popupMotion.js';

const markerIcon = L.icon({
  iconUrl: markerUrl,
  iconRetinaUrl: markerRetinaUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapView({ stops, focusedStop }) {
  const map = useMap();

  useEffect(() => {
    if (focusedStop) {
      map.flyTo([focusedStop.latitude, focusedStop.longitude], 12);
    } else if (stops.length === 1) {
      map.setView([stops[0].latitude, stops[0].longitude], 10);
    } else {
      map.fitBounds(stops.map(({ latitude, longitude }) => [latitude, longitude]), { padding: [28, 28], maxZoom: 10 });
    }
  }, [map, stops, focusedStop]);

  return null;
}

export default function TripMap({ stops, focusedStop }) {
  const reduceMotion = useReducedMotion();
  const validStops = stops.filter((stop) => (
    Number.isFinite(stop.latitude) && Math.abs(stop.latitude) <= 90
    && Number.isFinite(stop.longitude) && Math.abs(stop.longitude) <= 180
  ));

  if (!validStops.length) {
    return <p className="muted-copy">Map stops are not available for this trip yet.</p>;
  }

  return (
    <div className="detail-map">
      <MapContainer center={[validStops[0].latitude, validStops[0].longitude]} zoom={8} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapView stops={validStops} focusedStop={focusedStop} />
        {validStops.map((stop, index) => (
          <Marker key={`${stop.day}-${stop.sequence}-${index}`} position={[stop.latitude, stop.longitude]} icon={markerIcon}>
            <Popup><motion.div {...popupPanelMotion(reduceMotion)}><strong>{stop.name}</strong><br />Day {stop.day}{stop.description && <><br />{stop.description}</>}</motion.div></Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

// src/VehicleMap.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import L from 'leaflet';
import AnimatedMarker from './components/AnimatedMarker.jsx';
import { haversine, fmtTime, fmtLatLng, fmtSpeed, fmtDist, bearing } from './utils.js';

const INITIAL_CENTER = [17.385044, 78.486671];

export default function VehicleMap() {
  const [points, setPoints] = useState([]);
  const [cumDist, setCumDist] = useState([]);
  const [timeStamps, setTimeStamps] = useState([]);
  const [totalDuration, setTotalDuration] = useState(0);

  // playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [scrub, setScrub] = useState(0);

  const startWallRef = useRef(0);
  const pausedAtRef = useRef(0);
  const rafRef = useRef(0);
  const [T, setT] = useState(0);

  // Load dummy route
  useEffect(() => {
    (async () => {
      const res = await fetch('/dummy-route.json');
      const raw = await res.json();
      const pts = raw.map(p => ({
        lat: p.latitude,
        lng: p.longitude,
        ts: p.timestamp ? new Date(p.timestamp).getTime() : null
      }));
      setPoints(pts);

      const cd = [0];
      for (let i = 1; i < pts.length; i++) cd[i] = cd[i - 1] + haversine(pts[i - 1], pts[i]);
      setCumDist(cd);

      let ts;
      if (pts.every(p => p.ts !== null)) {
        const t0 = pts[0].ts;
        ts = pts.map(p => p.ts - t0);
      } else {
        ts = pts.map((_, i) => i * 1000);
      }
      setTimeStamps(ts);
      setTotalDuration(ts[ts.length - 1] || 0);
    })();
  }, []);

  // playback animation loop
  useEffect(() => {
    if (!isPlaying) return;
    startWallRef.current = performance.now() - pausedAtRef.current;

    const loopFn = () => {
      const tNow = Math.min(totalDuration, (performance.now() - startWallRef.current) * speed);
      setT(tNow);
      setScrub(totalDuration ? tNow / totalDuration : 0);

      if (tNow >= totalDuration) {
        setIsPlaying(false);
        return;
      }
      rafRef.current = requestAnimationFrame(loopFn);
    };

    rafRef.current = requestAnimationFrame(loopFn);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, speed, totalDuration]);

  // handlers
  const play = () => { if (!isPlaying) setIsPlaying(true); };
  const pause = () => {
    if (!isPlaying) return;
    const elapsedWall = performance.now() - startWallRef.current;
    pausedAtRef.current = Math.min(totalDuration, elapsedWall * speed);
    setIsPlaying(false);
  };
  const reset = () => {
    cancelAnimationFrame(rafRef.current);
    setIsPlaying(false);
    pausedAtRef.current = 0;
    startWallRef.current = performance.now();
    setT(0);
    setScrub(0);
  };
  const onScrub = (e) => {
    const v = Number(e.target.value) / 1000;
    setScrub(v);
    const newT = totalDuration * v;
    pausedAtRef.current = newT;
    setT(newT);
  };

  const timeToSegment = (t) => {
    if (timeStamps.length < 2) return { i: 0, alpha: 0 };
    let i = 0;
    while (i < timeStamps.length - 2 && timeStamps[i + 1] <= t) i++;
    const t0 = timeStamps[i];
    const t1 = timeStamps[i + 1];
    const seg = Math.max(1, t1 - t0);
    const alpha = (t - t0) / seg;
    return { i, alpha };
  };

  const latlngs = useMemo(() => points.map(p => [p.lat, p.lng]), [points]);
  const { i, alpha } = timeToSegment(T);
  const A = points[i] || { lat: INITIAL_CENTER[0], lng: INITIAL_CENTER[1] };
  const B = points[i + 1] || A;
  const curLat = A.lat + (B.lat - A.lat) * alpha;
  const curLng = A.lng + (B.lng - A.lng) * alpha;

  const speedMps = useMemo(() => {
    if (!points[i] || !points[i + 1]) return 0;
    const d = haversine(points[i], points[i + 1]);
    const dt = Math.max(1, (timeStamps[i + 1] - timeStamps[i]) / 1000);
    return d / dt;
  }, [i, points, timeStamps]);

  const distCovered = useMemo(() => {
    if (!points[i]) return 0;
    const partial = haversine(points[i], { lat: curLat, lng: curLng });
    return (cumDist[i] || 0) + partial;
  }, [i, points, curLat, curLng, cumDist]);

  const tsDisplay = useMemo(() => {
    if (points.length && points.every(p => p.ts !== null)) {
      const base = points[0].ts;
      return new Date(base + T).toISOString();
    }
    return `+${fmtTime(T)}`;
  }, [points, T]);

  const lightUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const angle = bearing(A, B);
  const icon = L.divIcon({
    className: '',
    html: `<div style="transform: rotate(${angle}deg); transform-origin: center;">
             <img src="/car.svg" width="28" height="28" />
           </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  return (
    <div className="h-full w-full">
      <MapContainer center={INITIAL_CENTER} zoom={15} scrollWheelZoom className="h-full w-full">
        <TileLayer attribution="&copy; OpenStreetMap contributors" url={lightUrl} />

        {/* Full route (gray) */}
        {latlngs.length > 0 && (
          <Polyline
            pathOptions={{ color: '#16a34a', weight: 4, opacity: 0.9 }}
            positions={latlngs}
          />
        )}

        {/* Traveled route (blue) */}
        {latlngs.length > 0 && (
          <Polyline
            pathOptions={{ color: '#0ea5e9', weight: 5, opacity: 0.9 }}
            positions={[...latlngs.slice(0, i + 1), [curLat, curLng]]}
          />
        )}

        {/* Animated vehicle */}
        <AnimatedMarker
          position={[curLat, curLng]}
          icon={icon}
          duration={Math.max(250, (timeStamps[i + 1] - timeStamps[i]) / Math.max(0.25, speed))}
        />
      </MapContainer>

      {/* Status Panel */}
      {/* Simpler Status Panel (Reference Style) */}
<div className="absolute top-4 right-4 z-[1000] p-3 bg-white border border-slate-300 shadow-md rounded-lg w-[min(92vw,300px)] text-sm">
  <h2 className="text-base font-semibold mb-2 border-b border-slate-200 pb-1">
    Vehicle Status
  </h2>

  <p><span className="text-slate-500">Latitude:</span> {fmtLatLng(curLat)}</p>
  <p><span className="text-slate-500">Longitude:</span> {fmtLatLng(curLng)}</p>
  <p><span className="text-slate-500">Timestamp:</span> {tsDisplay}</p>
  <p><span className="text-slate-500">Elapsed:</span> {fmtTime(T)}</p>
  <p><span className="text-slate-500">Speed:</span> {fmtSpeed(speedMps)}</p>
  <p><span className="text-slate-500">Distance:</span> {fmtDist(distCovered)}</p>

  <div className="mt-3">
    <input
      type="range"
      min="0"
      max="1000"
      value={Math.round(scrub * 1000)}
      onChange={onScrub}
      className="w-full accent-sky-500"
    />
    <div className="flex justify-between text-xs text-slate-500 mt-1">
      <span>Start</span><span>End</span>
    </div>
  </div>

  <div className="mt-3 flex items-center gap-2">
    <button
      onClick={play}
      disabled={isPlaying}
      className="flex-1 px-3 py-1.5 bg-sky-600 text-white rounded-md hover:bg-sky-700 disabled:opacity-50"
    >
      Play
    </button>
    <button
      onClick={pause}
      disabled={!isPlaying}
      className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50"
    >
      Pause
    </button>
    <button
      onClick={reset}
      className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
    >
      Reset
    </button>
  </div>

  <div className="mt-3">
    <label>
      <span className="text-slate-500">Speed:</span>
      <select
        value={speed}
        onChange={(e) => setSpeed(Number(e.target.value))}
        className="ml-2 px-2 py-1 rounded border border-slate-300"
      >
        <option value="0.5">0.5×</option>
        <option value="1">1×</option>
        <option value="2">2×</option>
        <option value="4">4×</option>
      </select>
    </label>
  </div>
</div>

    </div>
  );
}

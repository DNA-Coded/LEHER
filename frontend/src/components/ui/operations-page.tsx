import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  Locate,
  RefreshCw,
  ArrowUpRight,
  Clock,
  Compass,
  Layers,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PROJECTION_LIST, PROJECTION_METADATA, type TimeZone } from '@/components/ui/landing-page';
import { predictOceanState } from '@/lib/api/oceanPredictionService';

const timeZoneMap: Record<TimeZone, { name: string; timeZone: string; offsetLabel: string }> = {
  IST: { name: 'IST (India Standard)', timeZone: 'Asia/Kolkata', offsetLabel: 'UTC+05:30' },
  UTC: { name: 'UTC / GMT (Universal)', timeZone: 'UTC', offsetLabel: 'UTC+00:00' },
  EST: { name: 'EST (US Eastern)', timeZone: 'America/New_York', offsetLabel: 'UTC-05:00' },
  PST: { name: 'PST (US Pacific)', timeZone: 'America/Los_Angeles', offsetLabel: 'UTC-08:00' },
  JST: { name: 'JST (Japan Standard)', timeZone: 'Asia/Tokyo', offsetLabel: 'UTC+09:00' },
  SGT: { name: 'SGT (Singapore)', timeZone: 'Asia/Singapore', offsetLabel: 'UTC+08:00' },
};

const LOCATION_PRESETS = [
  { label: 'Arabian Sea',    lat: 15.4,  lon: 71.2,  kind: 'SEA',     sst: '28.4°C', speed: '0.42 m/s' },
  { label: 'Bay of Bengal',  lat: 14.0,  lon: 86.5,  kind: 'BAY',     sst: '27.8°C', speed: '0.31 m/s' },
  { label: 'Gulf of Kutch',  lat: 22.5,  lon: 69.2,  kind: 'GULF',    sst: '27.1°C', speed: '0.68 m/s' },
  { label: 'Gulf of Mannar', lat: 8.8,   lon: 79.1,  kind: 'GULF',    sst: '29.3°C', speed: '0.45 m/s' },
  { label: 'Lakshadweep',    lat: 10.5,  lon: 72.6,  kind: 'ISLAND',  sst: '28.9°C', speed: '0.29 m/s' },
  { label: 'Andaman Sea',    lat: 11.7,  lon: 93.0,  kind: 'SEA',     sst: '28.2°C', speed: '0.35 m/s' },
  { label: 'Malacca Strait', lat: 3.5,   lon: 100.2, kind: 'STRAIT',  sst: '29.5°C', speed: '0.55 m/s' },
  { label: 'Gulf of Aden',   lat: 12.5,  lon: 48.0,  kind: 'GULF',    sst: '26.0°C', speed: '0.47 m/s' },
  { label: 'Gulf of Oman',   lat: 24.5,  lon: 58.5,  kind: 'GULF',    sst: '26.8°C', speed: '0.39 m/s' },
  { label: 'Somali Basin',   lat: 4.5,   lon: 51.0,  kind: 'BASIN',   sst: '25.6°C', speed: '0.82 m/s' },
  { label: 'Dondra Head',    lat: 5.8,   lon: 80.5,  kind: 'COAST',   sst: '29.0°C', speed: '0.41 m/s' },
  { label: 'Mozambique Ch.', lat: -18.0, lon: 41.0,  kind: 'CHANNEL', sst: '26.2°C', speed: '0.58 m/s' },
];

export default function OperationsPage() {
  const [params] = useState(() => {
    const search = new URLSearchParams(window.location.search);
    const lat = parseFloat(search.get('lat') || '15.4');
    const lon = parseFloat(search.get('lon') || '71.2');
    const depth = parseInt(search.get('depth') || '150', 10);
    return {
      lat: isNaN(lat) ? 15.4 : lat,
      lon: isNaN(lon) ? 71.2 : lon,
      depth: isNaN(depth) ? 150 : depth,
    };
  });

  // Find initial preset index
  const initPresetIdx = LOCATION_PRESETS.findIndex(
    (p) => Math.abs(p.lat - params.lat) < 0.1 && Math.abs(p.lon - params.lon) < 0.1
  );

  const [selectedPresetIdx, setSelectedPresetIdx] = useState(initPresetIdx >= 0 ? initPresetIdx : 0);
  const [inputLat, setInputLat] = useState<number>(params.lat);
  const [inputLon, setInputLon] = useState<number>(params.lon);
  const [workbenchDepth, setWorkbenchDepth] = useState<number>(params.depth);
  const [activeProjection, setActiveProjection] = useState<string>('concentric_region');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [selectedTimeZone, setSelectedTimeZone] = useState<TimeZone>('IST');
  const [realTimeClock, setRealTimeClock] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'parameters' | 'summary'>('parameters');

  const predictionResult = useMemo(
    () => predictOceanState(inputLat, inputLon, workbenchDepth),
    [inputLat, inputLon, workbenchDepth]
  );

  const riskStatus = predictionResult.summary.riskStatus === 'SAFE' ? 'SAFE'
    : predictionResult.summary.riskStatus === 'ADVISORY' ? 'CAUTION' : 'DANGER';

  const sendToEarthIframe = useCallback(
    (data: { action: string; projection?: string; latitude?: number; longitude?: number }) => {
      const iframes = document.querySelectorAll<HTMLIFrameElement>('iframe[title*="Earth"]');
      iframes.forEach((iframe) => {
        try { iframe.contentWindow?.postMessage(data, '*'); }
        catch (err) { console.warn('Unable to postMessage to Earth iframe', err); }
      });
    },
    []
  );

  useEffect(() => {
    const handleEarthMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'earth:location') {
        const lat = typeof e.data.latitude === 'number' ? e.data.latitude : 0;
        const lon = typeof e.data.longitude === 'number' ? e.data.longitude : 0;
        setInputLat(parseFloat(lat.toFixed(4)));
        setInputLon(parseFloat(lon.toFixed(4)));
      }
    };
    window.addEventListener('message', handleEarthMessage);
    return () => window.removeEventListener('message', handleEarthMessage);
  }, []);

  useEffect(() => {
    if (typeof inputLat === 'number' && typeof inputLon === 'number') {
      sendToEarthIframe({ action: 'setLocation', latitude: inputLat, longitude: inputLon });
    }
  }, [inputLat, inputLon, sendToEarthIframe]);

  const handlePredict = useCallback(() => {
    setIsPredicting(true);
    const targetUrl = `/depth-slice?lat=${inputLat}&lon=${inputLon}&depth=${workbenchDepth}`;
    setTimeout(() => {
      setIsPredicting(false);
      window.location.href = targetUrl;
    }, 280);
  }, [inputLat, inputLon, workbenchDepth]);

  const handleLocateMe = useCallback(() => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(4));
          const lon = parseFloat(pos.coords.longitude.toFixed(4));
          setInputLat(lat);
          setInputLon(lon);
          sendToEarthIframe({ action: 'locateMe' });
          setIsLocating(false);
        },
        () => {
          sendToEarthIframe({ action: 'locateMe' });
          setIsLocating(false);
        },
        { timeout: 6000 }
      );
    } else {
      sendToEarthIframe({ action: 'locateMe' });
      setIsLocating(false);
    }
  }, [sendToEarthIframe]);

  const handleSelectProjection = useCallback(
    (projKey: string) => {
      setActiveProjection(projKey);
      sendToEarthIframe({ action: 'setProjection', projection: projKey });
    },
    [sendToEarthIframe]
  );

  const handleSelectPreset = (idx: number) => {
    setSelectedPresetIdx(idx);
    setInputLat(LOCATION_PRESETS[idx].lat);
    setInputLon(LOCATION_PRESETS[idx].lon);
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      try {
        const options: Intl.DateTimeFormatOptions = {
          timeZone: timeZoneMap[selectedTimeZone].timeZone,
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
        };
        const formatter = new Intl.DateTimeFormat('en-CA', options);
        const formatted = formatter.format(now).replace(', ', ' ');
        setRealTimeClock(`${formatted} ${selectedTimeZone}`);
      } catch {
        setRealTimeClock(`${now.toISOString().substring(0, 19).replace('T', ' ')} ${selectedTimeZone}`);
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [selectedTimeZone]);

  const handleBackToHome = () => {
    if (window.history.length > 1 && window.opener) window.close();
    else window.location.href = '/';
  };

  const earthIframeUrl = useMemo(() => {
    const projName = activeProjection || 'concentric_region';
    return `/earth/index.html#current/ocean/surface/currents/overlay=ocean/${projName}`;
  }, [activeProjection]);

  const selectedPreset = LOCATION_PRESETS[selectedPresetIdx];

  // Risk color helper
  const riskColor = riskStatus === 'SAFE'
    ? 'rgb(var(--long))'
    : riskStatus === 'CAUTION'
    ? 'rgb(var(--warn))'
    : 'rgb(var(--short))';

  const riskBg = riskStatus === 'SAFE'
    ? 'rgb(var(--long) / 0.08)'
    : riskStatus === 'CAUTION'
    ? 'rgb(var(--warn) / 0.08)'
    : 'rgb(var(--short) / 0.08)';

  const RiskIcon = riskStatus === 'SAFE' ? CheckCircle : riskStatus === 'CAUTION' ? AlertTriangle : XCircle;

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden font-sans"
      style={{ backgroundColor: 'rgb(var(--canvas))', color: 'rgb(var(--ink))' }}
    >
      {/* ── TOPBAR ────────────────────────────────────────────── */}
      <header
        className="h-16 flex items-center justify-between gap-3 px-4 sm:px-6 shrink-0"
        style={{ backgroundColor: 'rgb(var(--surface))', borderBottom: '1px solid rgb(var(--hairline))' }}
      >
        {/* Left: Back + Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToHome}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs tnum cursor-pointer transition-all hover-lift"
            style={{ backgroundColor: 'rgb(var(--elevated))', color: 'rgb(var(--ink-muted))', border: '1px solid rgb(var(--hairline))' }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="h-4 w-px hidden sm:block" style={{ backgroundColor: 'rgb(var(--hairline))' }} />
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Leher" className="h-7 w-auto object-contain" style={{ filter: 'drop-shadow(0 0 6px rgb(var(--brand) / 0.4))' }} />
            <span className="font-display text-base hidden sm:block" style={{ color: 'rgb(var(--ink))' }}>Leher</span>
          </div>
        </div>

        {/* Center nav */}
        <div className="hidden lg:flex items-center gap-1 text-xs">
          {[
            { label: 'Home', href: '/' },
            { label: 'About', href: '/about' },
            { label: 'Platform', href: '/operations', active: true },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 rounded transition-colors relative"
              style={{
                color: item.active ? 'rgb(var(--ink))' : 'rgb(var(--ink-muted))',
                backgroundColor: item.active ? 'rgb(var(--elevated))' : 'transparent',
              }}
            >
              {item.label}
              {item.active && (
                <span className="absolute bottom-0 left-2 right-2 h-px rounded-full" style={{ backgroundColor: 'rgb(var(--brand))' }} />
              )}
            </a>
          ))}
        </div>

        {/* Right: Clock */}
        <div className="hidden md:flex items-center gap-2 tnum text-xs px-3 py-1.5 rounded" style={{ backgroundColor: 'rgb(var(--elevated))', color: 'rgb(var(--ink-muted))', border: '1px solid rgb(var(--hairline))' }}>
          <Clock className="w-3.5 h-3.5" style={{ color: 'rgb(var(--brand))' }} />
          <span>{realTimeClock}</span>
          <select
            value={selectedTimeZone}
            onChange={(e) => setSelectedTimeZone(e.target.value as TimeZone)}
            className="text-xs tnum rounded px-1.5 py-0.5 cursor-pointer focus:outline-none transition-colors"
            style={{ backgroundColor: 'rgb(var(--surface))', color: 'rgb(var(--ink))', border: '1px solid rgb(var(--hairline))' }}
          >
            {Object.entries(timeZoneMap).map(([tz, info]) => (
              <option key={tz} value={tz}>{tz} ({info.offsetLabel})</option>
            ))}
          </select>
        </div>
      </header>

      {/* ── LOCATION PRESET SELECTOR (like Helix market tabs) ─ */}
      <div
        className="shrink-0 flex gap-2 overflow-x-auto pb-0 px-4 sm:px-6 pt-3"
        style={{ backgroundColor: 'rgb(var(--surface))', borderBottom: '1px solid rgb(var(--hairline))' }}
      >
        {LOCATION_PRESETS.map((loc, idx) => {
          const active = idx === selectedPresetIdx;
          return (
            <button
              key={loc.label}
              onClick={() => handleSelectPreset(idx)}
              className="focus-ring flex min-w-[140px] flex-col items-start gap-1 rounded-t-xl px-4 py-3 text-left transition-colors cursor-pointer shrink-0"
              style={{
                border: '1px solid',
                borderBottom: 'none',
                borderColor: active ? 'rgb(var(--line))' : 'rgb(var(--hairline))',
                backgroundColor: active ? 'rgb(var(--elevated))' : 'rgb(var(--surface))',
              }}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-sm font-semibold tracking-tight" style={{ color: active ? 'rgb(var(--ink))' : 'rgb(var(--ink-muted))' }}>
                  {loc.label}
                </span>
                <span
                  className="tnum rounded px-1.5 py-0.5"
                  style={{
                    fontSize: '10px',
                    backgroundColor: active ? 'rgb(var(--elevated))' : 'rgb(var(--surface))',
                    color: 'rgb(var(--ink-faint))',
                    border: '1px solid rgb(var(--hairline))',
                  }}
                >
                  {loc.kind}
                </span>
              </div>
              <div className="flex w-full items-center justify-between">
                <span className="tnum text-sm" style={{ color: 'rgb(var(--ink-muted))' }}>{loc.sst}</span>
                <span className="tnum" style={{ fontSize: '0.6875rem', color: 'rgb(var(--long))' }}>
                  {loc.speed}
                </span>
              </div>
            </button>
          );
        })}
      </div>


      {/* ── MAIN GRID (mirrors Helix trade page lg:grid-cols-3) ─ */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">

        {/* LEFT 2/3: 3D Earth iframe (chart area) */}
        <div className="flex-1 lg:col-span-2 relative overflow-hidden" style={{ backgroundColor: '#040404' }}>
          <iframe
            key={activeProjection}
            src={earthIframeUrl}
            title="Leher Fullscreen 3D Earth"
            className="w-full h-full border-0 absolute inset-0"
            onLoad={() => sendToEarthIframe({ action: 'setLocation', latitude: inputLat, longitude: inputLon })}
          />

          {/* Floating coordinate HUD */}
          <div className="absolute bottom-4 left-4 right-4 lg:right-auto z-10 pointer-events-none">
            <div
              className="px-4 py-2 rounded-lg flex items-center gap-3 pointer-events-auto"
              style={{ backgroundColor: 'rgb(0 0 0 / 0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgb(255 255 255 / 0.08)' }}
            >
              <Compass className="w-4 h-4 shrink-0" style={{ color: 'rgb(var(--brand))' }} />
              <span className="tnum text-xs" style={{ color: 'rgb(var(--ink-muted))' }}>
                Target: <strong style={{ color: 'rgb(var(--ink))' }}>
                  {inputLat >= 0 ? `${inputLat}°N` : `${Math.abs(inputLat)}°S`}, {inputLon >= 0 ? `${inputLon}°E` : `${Math.abs(inputLon)}°W`}
                </strong> @ {workbenchDepth}m
              </span>
              <span className="hidden sm:inline text-xs" style={{ color: 'rgb(var(--brand))' }}>· Click map to inspect</span>
            </div>
          </div>

          {/* Tab bar below map (parameters / summary) */}
          <div
            className="absolute bottom-0 left-0 right-0 z-10 hidden lg:block"
            style={{ borderTop: '1px solid rgb(var(--hairline))' }}
          >
            <div className="flex" style={{ backgroundColor: 'rgb(var(--surface) / 0.95)', backdropFilter: 'blur(12px)' }}>
              {(['parameters', 'summary'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-5 py-3 text-xs font-medium transition-colors cursor-pointer capitalize"
                  style={{
                    color: activeTab === tab ? 'rgb(var(--ink))' : 'rgb(var(--ink-faint))',
                    borderBottom: activeTab === tab ? `2px solid rgb(var(--brand))` : '2px solid transparent',
                  }}
                >
                  {tab === 'parameters' ? 'Ocean Parameters' : 'Route Summary'}
                </button>
              ))}
            </div>

            {activeTab === 'parameters' && (
              <div className="p-4 grid grid-cols-3 gap-3 max-h-40 overflow-y-auto" style={{ backgroundColor: 'rgb(var(--surface) / 0.95)' }}>
                {Object.values(predictionResult.variables).slice(0, 6).map((v) => (
                  <div key={v.variable} className="flex justify-between items-center text-xs px-3 py-2 rounded" style={{ backgroundColor: 'rgb(var(--elevated))', border: '1px solid rgb(var(--hairline))' }}>
                    <span style={{ color: 'rgb(var(--ink-muted))' }}>{v.commonName}</span>
                    <span className="tnum font-bold ml-2" style={{ color: 'rgb(var(--ink))' }}>{v.formattedValue}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'summary' && (
              <div className="p-4 flex items-center gap-6" style={{ backgroundColor: 'rgb(var(--surface) / 0.95)' }}>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded tnum text-xs" style={{ backgroundColor: riskBg, color: riskColor, border: `1px solid ${riskColor.replace(')', ' / 0.25)')}` }}>
                  <RiskIcon className="w-4 h-4" />
                  <span className="font-bold">{riskStatus}</span>
                </div>
                <span className="text-xs" style={{ color: 'rgb(var(--ink-muted))' }}>
                  {predictionResult.location.regionName} · {predictionResult.summary.currentSpeedMs} m/s current · {workbenchDepth}m depth
                </span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT 1/3: Sticky Order-Ticket Panel */}
        <div
          className="w-full lg:w-80 xl:w-96 shrink-0 flex flex-col overflow-y-auto max-h-[50vh] lg:max-h-full z-20"
          style={{ backgroundColor: 'rgb(var(--surface))', borderLeft: '1px solid rgb(var(--hairline))' }}
        >
          {/* Panel header */}
          <div
            className="px-5 py-4 shrink-0 sticky top-0 z-10"
            style={{ backgroundColor: 'rgb(var(--surface))', borderBottom: '1px solid rgb(var(--hairline))' }}
          >
            <div className="flex justify-between items-center">
              <h3 className="eyebrow" style={{ color: 'rgb(var(--ink))' }}>Ocean Inspector</h3>
              <div className="flex items-center gap-1.5 tnum px-2.5 py-0.5 rounded-full" style={{ fontSize: '10px', color: 'rgb(var(--brand))', backgroundColor: 'rgb(var(--brand) / 0.08)', border: '1px solid rgb(var(--brand) / 0.25)' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse-soft" style={{ backgroundColor: 'rgb(var(--brand))' }} />
                <span>LIVE</span>
              </div>
            </div>
            <p className="text-xs mt-1" style={{ color: 'rgb(var(--ink-faint))' }}>{selectedPreset.label}</p>
          </div>

          {/* Controls */}
          <div className="flex-1 p-5 space-y-5">
            {/* Projection */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center" style={{ color: 'rgb(var(--ink-faint))', fontSize: '11px' }}>
                <span>Map Projection</span>
                <span className="tnum" style={{ color: 'rgb(var(--brand))', fontSize: '10px' }}>{PROJECTION_METADATA[activeProjection]?.split(' ')[0] || activeProjection}</span>
              </div>
              <div className="relative">
                <select
                  value={activeProjection}
                  onChange={(e) => handleSelectProjection(e.target.value)}
                  className="w-full text-xs tnum rounded px-3 py-2.5 appearance-none pr-8 cursor-pointer transition-all focus:outline-none"
                  style={{ backgroundColor: 'rgb(var(--elevated))', color: 'rgb(var(--ink))', border: '1px solid rgb(var(--hairline))' }}
                >
                  {PROJECTION_LIST.map((p) => (
                    <option key={p.key} value={p.key} style={{ backgroundColor: 'rgb(var(--surface))' }}>{p.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3" style={{ color: 'rgb(var(--ink-faint))' }}>
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Coordinates */}
            <div className="space-y-2">
              <div className="text-xs" style={{ color: 'rgb(var(--ink-faint))' }}>Coordinates</div>
              {[
                { label: 'Latitude', value: inputLat, setter: setInputLat, min: -90, max: 90, suffix: inputLat >= 0 ? '°N' : '°S' },
                { label: 'Longitude', value: inputLon, setter: setInputLon, min: -180, max: 180, suffix: inputLon >= 0 ? '°E' : '°W' },
              ].map((field) => (
                <div
                  key={field.label}
                  className="rounded px-3 py-2.5 flex items-center justify-between"
                  style={{ backgroundColor: 'rgb(var(--elevated))', border: '1px solid rgb(var(--hairline))' }}
                >
                  <span className="text-xs" style={{ color: 'rgb(var(--ink-muted))' }}>{field.label}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" step="0.01" min={field.min} max={field.max}
                      value={field.value}
                      onChange={(e) => field.setter(parseFloat(e.target.value) || 0)}
                      className="w-20 bg-transparent font-bold text-xs text-right focus:outline-none tnum"
                      style={{ color: 'rgb(var(--ink))' }}
                    />
                    <span className="tnum text-xs w-6 text-right" style={{ color: 'rgb(var(--ink-faint))' }}>{field.suffix}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* GPS Locate */}
            <button
              type="button" onClick={handleLocateMe} disabled={isLocating}
              className="w-full py-2.5 px-3 rounded text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 hover-lift"
              style={{ backgroundColor: 'rgb(var(--elevated))', color: 'rgb(var(--ink))', border: '1px solid rgb(var(--hairline))' }}
            >
              <Locate className={cn('w-3.5 h-3.5', isLocating && 'animate-spin')} style={{ color: 'rgb(var(--brand))' }} />
              <span>{isLocating ? 'Locating...' : 'Detect My Location'}</span>
            </button>

            {/* Depth slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center" style={{ color: 'rgb(var(--ink-faint))', fontSize: '11px' }}>
                <span>Analysis Depth</span>
                <span className="tnum font-bold px-2 py-0.5 rounded" style={{ color: 'rgb(var(--ink))', backgroundColor: 'rgb(var(--elevated))', border: '1px solid rgb(var(--hairline))' }}>{workbenchDepth}m</span>
              </div>
              <input
                type="range" min="0" max="2000" step="10" value={workbenchDepth}
                onChange={(e) => setWorkbenchDepth(Number(e.target.value))}
                className="w-full h-1 rounded appearance-none cursor-pointer"
                style={{ accentColor: 'rgb(var(--brand))' }}
              />
              <div className="grid grid-cols-6 gap-1">
                {[0, 50, 150, 500, 1000, 2000].map((d) => (
                  <button
                    key={d} type="button" onClick={() => setWorkbenchDepth(d)}
                    className="py-1 rounded cursor-pointer transition-all hover-lift"
                    style={{
                      fontSize: '10px',
                      fontFamily: 'var(--font-mono)',
                      backgroundColor: workbenchDepth === d ? 'rgb(var(--brand))' : 'rgb(var(--elevated))',
                      color: workbenchDepth === d ? '#000' : 'rgb(var(--ink-muted))',
                      border: `1px solid ${workbenchDepth === d ? 'rgb(var(--brand))' : 'rgb(var(--hairline))'}`,
                      fontWeight: workbenchDepth === d ? '700' : '400',
                    }}
                  >
                    {d === 0 ? '0m' : `${d}m`}
                  </button>
                ))}
              </div>
            </div>

            {/* Prediction data summary */}
            <div className="rounded p-4 space-y-2" style={{ backgroundColor: 'rgb(var(--elevated))', border: '1px solid rgb(var(--hairline))' }}>
              <div className="flex justify-between items-center pb-2" style={{ borderBottom: '1px solid rgb(var(--hairline))' }}>
                <span className="eyebrow" style={{ color: 'rgb(var(--ink))' }}>{predictionResult.location.regionName}</span>
                <div className="flex items-center gap-1.5 tnum px-2 py-0.5 rounded" style={{ fontSize: '10px', backgroundColor: riskBg, color: riskColor, border: `1px solid ${riskColor.replace(')', ' / 0.25)')}` }}>
                  <RiskIcon className="w-3 h-3" />
                  <span className="font-bold">{riskStatus}</span>
                </div>
              </div>
              {[
                { label: 'Current speed', value: `${predictionResult.summary.currentSpeedMs} m s⁻¹` },
                { label: 'Direction', value: `${predictionResult.summary.currentDirectionCompass} (${predictionResult.summary.currentDirectionDeg}°)` },
              ].map((row, i, arr) => (
                <div key={row.label} className={cn('flex justify-between text-xs pb-1.5', i < arr.length - 1 && 'border-b')} style={{ borderColor: 'rgb(var(--hairline))' }}>
                  <span style={{ color: 'rgb(var(--ink-muted))' }}>{row.label}</span>
                  <span className="tnum font-bold" style={{ color: 'rgb(var(--ink))' }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Primary CTA */}
            <button
              type="button" onClick={handlePredict} disabled={isPredicting}
              className="w-full py-3.5 px-4 rounded brand-fill glow-brand text-black font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-75 hover-lift"
            >
              {isPredicting ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /><span>Generating Depth Slice...</span></>
              ) : (
                <><span>Predict Ocean State & Open 3D Depth Slice</span><ArrowUpRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

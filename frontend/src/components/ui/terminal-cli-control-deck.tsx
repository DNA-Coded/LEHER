import React, { useState, useEffect, useRef, useCallback } from "react";
import { Terminal, Shield, Wifi, Play, Pause, Trash2, Send, Minimize2, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LogEntry {
  id: number;
  time: string;
  kind: "ok" | "run" | "warn" | "err";
  source: string;
  message: string;
}

const INITIAL_LOGS: LogEntry[] = [
  { id: 1, time: "15:42:01", kind: "ok", source: "INCOIS-NET", message: "Synchronized 18 deep-sea telemetry buoys across Arabian Sea" },
  { id: 2, time: "15:42:14", kind: "run", source: "BATHYMETRY", message: "Generating 150m isobath slice for 15.4000°N, 71.2000°E" },
  { id: 3, time: "15:42:28", kind: "ok", source: "CMEMS", message: "Copernicus ocean circulation physics re-interpolated (0.08° grid)" },
  { id: 4, time: "15:42:35", kind: "warn", source: "SURVEILLANCE", message: "Thermocline shear detected in sector 4B (gradient 0.14°C/m)" },
  { id: 5, time: "15:42:49", kind: "ok", source: "ACOUSTIC", message: "Sonar sound speed profile calibrated at 1535.4 m/s" },
];

const RANDOM_LOG_TEMPLATES = [
  { kind: "ok" as const, source: "BUOY-AR01", message: "Wave height nominal: 1.84m (swell period 8.2s)" },
  { kind: "run" as const, source: "ORBIT-SAT", message: "Jason-3 altimeter pass: sea surface height anomaly +0.24m" },
  { kind: "ok" as const, source: "HYDRO", message: "Geostrophic current vector calculated: 0.142 m/s @ 262° W" },
  { kind: "warn" as const, source: "MONSOON", message: "Surface wind shear increasing to 18 knots in central Bay of Bengal" },
  { kind: "ok" as const, source: "DEPTH-GRID", message: "Salinity profile stable at 35.95 PSU down to 500m depth" },
  { kind: "run" as const, source: "AI-INFER", message: "Predictive ocean state model convergence score: 99.4%" },
  { kind: "ok" as const, source: "CHL-A", message: "Chlorophyll photic zone absorption index normal at 0.034 mg/m³" },
];

export interface TerminalControlDeckProps {
  className?: string;
  onClose?: () => void;
  defaultOpen?: boolean;
}

export function TerminalControlDeck({
  className,
  onClose,
}: TerminalControlDeckProps) {
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [inputVal, setInputVal] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef<number>(6);

  const appendLog = useCallback((kind: "ok" | "run" | "warn" | "err", source: string, message: string) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    idCounter.current += 1;
    setLogs((prev) => [...prev.slice(-35), { id: idCounter.current, time: timeStr, kind, source, message }]);
  }, []);

  // Background stream simulation
  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      const template = RANDOM_LOG_TEMPLATES[Math.floor(Math.random() * RANDOM_LOG_TEMPLATES.length)];
      appendLog(template.kind, template.source, template.message);
    }, 3800);
    return () => clearInterval(interval);
  }, [isStreaming, appendLog]);

  // Auto-scroll to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = inputVal.trim().toLowerCase();
    if (!cmd) return;

    appendLog("run", "CLI-EXEC", `> ${inputVal}`);
    setInputVal("");

    if (cmd === "help") {
      appendLog("ok", "SYSTEM", "Available commands: status, buoys, bathymetry, clear, ping, strata");
    } else if (cmd === "status") {
      appendLog("ok", "STATUS", "Indian Ocean Telemetry: 18/18 Buoys ONLINE • Models NOMINAL • ML Latency 14ms");
    } else if (cmd === "buoys") {
      appendLog("ok", "BUOY-REG", "AR-01: 15.4°N, 71.2°E | BOB-04: 14.0°N, 86.5°E | EQ-02: 0.0°N, 80.5°E | S-IO: -25.0°S, 75.0°E");
    } else if (cmd === "clear") {
      setLogs([]);
    } else if (cmd === "ping") {
      appendLog("ok", "PONG", "Telemetry packet roundtrip latency: 18.2ms (Satellite Link OK)");
    } else if (cmd === "strata") {
      appendLog("ok", "STRATA", "13 vertical depth zones computed: Epipelagic (0-50m), Thermocline (50-200m), Mesopelagic (200-1000m), Abyss (>1000m)");
    } else {
      appendLog("warn", "SYNTAX", `Unknown command '${cmd}'. Type 'help' for command list.`);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-[#090909]/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden font-mono shadow-2xl transition-all",
        isExpanded ? "h-[500px]" : "h-[320px]",
        className
      )}
    >
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#141414] border-b border-[#222222] select-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-[11px] font-bold tracking-wider text-white flex items-center gap-1.5 ml-2">
            <Terminal className="w-3.5 h-3.5 text-[#dfc58d]" />
            LEHER TELEMETRY CLI DECK
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#dfc58d]/10 text-[#dfc58d] border border-[#dfc58d]/30">
            v2.4
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Play/Pause Live Feed */}
          <button
            onClick={() => setIsStreaming((prev) => !prev)}
            className="p-1 rounded text-[#888888] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title={isStreaming ? "Pause Live Feed" : "Resume Live Feed"}
          >
            {isStreaming ? <Pause className="w-3 h-3 text-cyan-400" /> : <Play className="w-3 h-3" />}
          </button>
          {/* Clear Logs */}
          <button
            onClick={() => setLogs([])}
            className="p-1 rounded text-[#888888] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Clear Console"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          {/* Expand/Collapse */}
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1 rounded text-[#888888] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title={isExpanded ? "Collapse Deck" : "Expand Deck"}
          >
            {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
          {/* Close button if provided */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded text-[#888888] hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer ml-1"
              title="Close Terminal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Output Body */}
      <div className="flex-1 p-3 overflow-y-auto space-y-1 text-xs select-text scrollbar-thin scrollbar-thumb-[#222222]">
        <div className="text-[10px] text-[#666666] border-b border-[#181818] pb-1.5 mb-2 flex justify-between">
          <span>INDIAN OCEAN REAL-TIME MARITIME FEED</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <Wifi className="w-2.5 h-2.5 animate-pulse" /> LIVE STREAM ACTIVE
          </span>
        </div>

        {logs.map((log) => {
          const kindColor =
            log.kind === "ok"
              ? "text-emerald-400"
              : log.kind === "warn"
              ? "text-yellow-400"
              : log.kind === "err"
              ? "text-red-400"
              : "text-cyan-400";

          return (
            <div key={log.id} className="flex items-start gap-2 leading-relaxed font-mono">
              <span className="text-[#555555] text-[10px] shrink-0">{log.time}</span>
              <span className={cn("text-[10px] font-bold px-1 rounded uppercase tracking-wider shrink-0 bg-white/5", kindColor)}>
                {log.source}
              </span>
              <span className="text-[#cccccc] text-[11px] break-all">{log.message}</span>
            </div>
          );
        })}
        <div ref={logEndRef} />
      </div>

      {/* Interactive Command Input Line */}
      <form onSubmit={handleCommand} className="flex items-center gap-2 px-3 py-2 bg-[#0d0d0d] border-t border-[#1f1f1f]">
        <span className="text-[#dfc58d] font-bold text-xs">leher@incois:~$</span>
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="type 'help', 'status', 'buoys', 'strata'..."
          className="flex-1 bg-transparent border-none text-xs text-white placeholder-[#555555] focus:outline-none font-mono"
        />
        <button
          type="submit"
          className="p-1 text-[#dfc58d] hover:text-white transition-colors cursor-pointer"
          title="Send command"
        >
          <Send className="w-3 h-3" />
        </button>
      </form>
    </div>
  );
}

export default TerminalControlDeck;

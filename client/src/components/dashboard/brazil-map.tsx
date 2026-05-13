import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { useEffect, useRef, useState } from "react";
import { RotateCcw, Move } from "lucide-react";

const geoUrl = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

const stateNameMap: Record<string, string> = {
  "Acre": "AC",
  "Alagoas": "AL",
  "Amazonas": "AM",
  "Amapá": "AP",
  "Bahia": "BA",
  "Ceará": "CE",
  "Distrito Federal": "DF",
  "Espírito Santo": "ES",
  "Goiás": "GO",
  "Maranhão": "MA",
  "Minas Gerais": "MG",
  "Mato Grosso do Sul": "MS",
  "Mato Grosso": "MT",
  "Pará": "PA",
  "Paraíba": "PB",
  "Pernambuco": "PE",
  "Piauí": "PI",
  "Paraná": "PR",
  "Rio de Janeiro": "RJ",
  "Rio Grande do Norte": "RN",
  "Rondônia": "RO",
  "Roraima": "RR",
  "Rio Grande do Sul": "RS",
  "Santa Catarina": "SC",
  "Sergipe": "SE",
  "São Paulo": "SP",
  "Tocantins": "TO",
};

const stateCenters: Record<string, [number, number]> = {
  "AC": [-70.5, -9.0],
  "AL": [-36.6, -9.5],
  "AM": [-64.5, -4.0],
  "AP": [-51.5, 1.5],
  "BA": [-41.5, -12.5],
  "CE": [-39.5, -5.5],
  "DF": [-47.9, -15.8],
  "ES": [-40.5, -19.5],
  "GO": [-49.5, -16.0],
  "MA": [-45.0, -5.0],
  "MG": [-44.5, -18.5],
  "MS": [-55.0, -21.0],
  "MT": [-56.0, -13.0],
  "PA": [-52.5, -4.0],
  "PB": [-36.5, -7.2],
  "PE": [-37.5, -8.5],
  "PI": [-42.5, -7.5],
  "PR": [-51.5, -25.0],
  "RJ": [-43.0, -22.5],
  "RN": [-36.5, -5.8],
  "RO": [-63.0, -11.0],
  "RR": [-61.0, 2.5],
  "RS": [-53.5, -30.0],
  "SC": [-50.5, -27.5],
  "SE": [-37.5, -10.5],
  "SP": [-48.5, -22.5],
  "TO": [-48.0, -10.0],
};

interface BrazilMapProps {
  data: { state: string; count: number }[];
}

const INITIAL_CENTER: [number, number] = [-54, -15];
const INITIAL_ZOOM = 1;

export function BrazilMap({ data }: BrazilMapProps) {
  const [hoveredState, setHoveredState] = useState<{ name: string; count: number; percentage: string } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: INITIAL_CENTER,
    zoom: INITIAL_ZOOM,
  });
  const [hint, setHint] = useState<"idle" | "moving" | "zooming">("idle");
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dataByState = data.reduce((acc, item) => {
    acc[item.state] = item.count;
    return acc;
  }, {} as Record<string, number>);

  const totalClients = data.reduce((sum, item) => sum + item.count, 0);
  const maxValue = Math.max(...data.map(d => d.count), 1);

  const colorScale = scaleLinear<string>()
    .domain([0, maxValue])
    .range(["#3b82f6", "#dc2626"]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const flashHint = (mode: "moving" | "zooming") => {
    setHint(mode);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint("idle"), 600);
  };

  useEffect(() => () => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
  }, []);

  const handleReset = () => {
    setPosition({ coordinates: INITIAL_CENTER, zoom: INITIAL_ZOOM });
    setHint("idle");
  };

  const hintLabel = hint === "moving" ? "Movendo..." : hint === "zooming" ? "Fazendo zoom..." : "Arraste e zoom";

  return (
    <div className="relative w-full h-full" onMouseMove={handleMouseMove}>
      <button
        type="button"
        onClick={handleReset}
        className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-md bg-[#243447] hover:bg-[#2a3a4a] border border-[#2a3a4a] px-2.5 py-1 text-xs text-cyan-300"
        data-testid="button-map-reset"
      >
        <RotateCcw className="w-3 h-3" />
        Reset
      </button>

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 750, center: INITIAL_CENTER }}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup
          center={position.coordinates}
          zoom={position.zoom}
          minZoom={1}
          maxZoom={8}
          onMoveStart={() => flashHint("moving")}
          onMove={({ zoom }) => {
            if (zoom !== position.zoom) flashHint("zooming");
          }}
          onMoveEnd={(pos) => {
            setPosition({ coordinates: pos.coordinates as [number, number], zoom: pos.zoom });
            setHint("idle");
          }}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const stateName = geo.properties.name;
                const stateCode = stateNameMap[stateName] || stateName;
                const count = dataByState[stateCode] || 0;
                const percentage = totalClients > 0 ? ((count / totalClients) * 100).toFixed(1) : "0.0";

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={count > 0 ? colorScale(count) : "#374151"}
                    stroke="#1f2937"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", fill: "#6366f1" },
                      pressed: { outline: "none" },
                    }}
                    onMouseEnter={() => {
                      setHoveredState({ name: stateName, count, percentage });
                    }}
                    onMouseLeave={() => {
                      setHoveredState(null);
                    }}
                  />
                );
              })
            }
          </Geographies>

          {Object.entries(stateCenters).map(([stateCode, coords]) => {
            const count = dataByState[stateCode] || 0;
            if (count <= 0) return null;
            const labelW = 30;
            const labelH = 26;
            return (
              <Marker key={stateCode} coordinates={coords}>
                <g style={{ pointerEvents: "none" }}>
                  <rect
                    x={-labelW / 2}
                    y={-labelH / 2}
                    width={labelW}
                    height={labelH}
                    rx={4}
                    fill="#1f2937"
                    opacity={0.9}
                  />
                  <text
                    textAnchor="middle"
                    y={-3}
                    style={{ fontSize: "9px", fontWeight: 700, fill: "#ffffff" }}
                  >
                    {stateCode}
                  </text>
                  <text
                    textAnchor="middle"
                    y={9}
                    style={{ fontSize: "10px", fontWeight: 700, fill: "#ffffff" }}
                  >
                    {count}
                  </text>
                </g>
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {hoveredState && (
        <div
          className="absolute bg-[#1a2a3a] border border-[#2a3a4a] rounded-lg p-3 shadow-lg pointer-events-none z-30"
          style={{
            left: Math.min(mousePos.x + 10, 240),
            top: Math.max(10, mousePos.y - 60),
          }}
        >
          <div className="text-xs font-semibold mb-1 text-slate-300">Clientes por Estado</div>
          <div className="text-sm text-white">
            {hoveredState.name}: <span className="font-medium">{hoveredState.count}</span> ({hoveredState.percentage}%)
          </div>
        </div>
      )}

      <div className="absolute left-3 bottom-3 z-20 flex items-center gap-2 rounded-md bg-[#243447]/90 border border-[#2a3a4a] px-2.5 py-1.5 text-xs text-slate-300">
        <Move className="w-3 h-3 text-cyan-300" />
        {hintLabel}
      </div>

      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex flex-col items-center gap-1 z-20">
        <span className="text-[10px] text-slate-400">Mais</span>
        <div
          className="w-2.5 h-20 rounded"
          style={{ background: "linear-gradient(to bottom, #dc2626, #3b82f6)" }}
        />
        <span className="text-[10px] text-slate-400">Menos</span>
      </div>
    </div>
  );
}

export { stateNameMap };

import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { useState } from "react";

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

export function BrazilMap({ data }: BrazilMapProps) {
  const [hoveredState, setHoveredState] = useState<{ name: string; count: number; percentage: string } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
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

  return (
    <div className="relative w-full h-full" onMouseMove={handleMouseMove}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 750,
          center: [-54, -15]
        }}
        style={{ width: "100%", height: "100%" }}
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
          return (
            <Marker key={stateCode} coordinates={coords}>
              <text
                textAnchor="middle"
                dominantBaseline="central"
                style={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  fill: "#ffffff",
                  pointerEvents: "none",
                  textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                }}
              >
                {count}
              </text>
            </Marker>
          );
        })}
      </ComposableMap>

      {hoveredState && (
        <div 
          className="absolute bg-background border border-border rounded-lg p-3 shadow-lg pointer-events-none z-50"
          style={{
            left: Math.min(mousePos.x + 10, 200),
            top: mousePos.y - 60,
          }}
        >
          <div className="text-sm font-semibold mb-1">Clientes por Estado</div>
          <div className="text-sm">
            {hoveredState.name}: <span className="font-medium">{hoveredState.count}</span> ({hoveredState.percentage}%)
          </div>
        </div>
      )}

      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col items-center gap-1">
        <span className="text-xs text-muted-foreground">Mais</span>
        <div 
          className="w-3 h-20 rounded"
          style={{
            background: `linear-gradient(to bottom, #dc2626, #3b82f6)`
          }}
        />
        <span className="text-xs text-muted-foreground">0</span>
      </div>
    </div>
  );
}

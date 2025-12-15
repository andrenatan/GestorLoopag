import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

interface BrazilMapProps {
  data: { state: string; count: number }[];
}

export function BrazilMap({ data }: BrazilMapProps) {
  const [tooltipContent, setTooltipContent] = useState<string>("");
  
  const dataByState = data.reduce((acc, item) => {
    acc[item.state] = item.count;
    return acc;
  }, {} as Record<string, number>);

  const maxValue = Math.max(...data.map(d => d.count), 1);

  const colorScale = scaleLinear<string>()
    .domain([0, maxValue])
    .range(["#3b82f6", "#dc2626"]);

  return (
    <div className="relative w-full h-full">
      <TooltipProvider>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 650,
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

                return (
                  <Tooltip key={geo.rsmKey}>
                    <TooltipTrigger asChild>
                      <Geography
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
                          setTooltipContent(`${stateName}: ${count} cliente${count !== 1 ? 's' : ''}`);
                        }}
                        onMouseLeave={() => {
                          setTooltipContent("");
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{stateName}: {count} cliente{count !== 1 ? 's' : ''}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </TooltipProvider>

      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col items-center gap-1">
        <span className="text-xs text-muted-foreground">Mais</span>
        <div 
          className="w-4 h-24 rounded"
          style={{
            background: `linear-gradient(to bottom, #dc2626, #3b82f6)`
          }}
        />
        <span className="text-xs text-muted-foreground">Menos</span>
        <div className="mt-2 text-xs text-center">
          <div className="text-foreground font-medium">{maxValue}</div>
          <div className="text-muted-foreground">0</div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import type { LatLng } from "@/lib/domain/types";

export interface MapStop {
  id: string;
  name: string;
  location: LatLng;
}

/**
 * MapLibre map of one plan's round trip: a black "home" pip at the origin, numbered amber pips at
 * each store in visit order, and a dashed amber itinerary line origin -> stores -> origin.
 *
 * Straight dashed segments (not road geometry): the optimizer uses an OSRM /table matrix, which
 * gives leg costs but not polylines, so the line shows the itinerary order rather than the exact
 * roads. maplibre-gl is imported dynamically so it never runs during SSR.
 */
export default function RouteMap({ origin, stops }: { origin: LatLng; stops: MapStop[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markersRef = useRef<import("maplibre-gl").Marker[]>([]);

  // Init once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      mapRef.current = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "© OpenStreetMap-bidragsytere",
            },
          },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
        center: [origin.lng, origin.lat],
        zoom: 9,
        attributionControl: { compact: true },
      });
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw markers + route whenever the plan changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      const map = mapRef.current;
      if (cancelled || !map) return;

      const draw = () => {
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];

        const addPip = (loc: LatLng, label: string, home: boolean, title: string) => {
          const el = document.createElement("div");
          el.className = `map-pip${home ? " home" : ""}`;
          el.textContent = label;
          el.title = title;
          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([loc.lng, loc.lat])
            .addTo(map);
          markersRef.current.push(marker);
        };

        addPip(origin, "H", true, "Hjem");
        stops.forEach((s, i) => addPip(s.location, String(i + 1), false, s.name));

        const coords: [number, number][] = [
          [origin.lng, origin.lat],
          ...stops.map((s) => [s.location.lng, s.location.lat] as [number, number]),
          [origin.lng, origin.lat],
        ];
        const geojson = {
          type: "Feature" as const,
          geometry: { type: "LineString" as const, coordinates: coords },
          properties: {},
        };
        const src = map.getSource("route") as import("maplibre-gl").GeoJSONSource | undefined;
        if (src) {
          src.setData(geojson);
        } else {
          map.addSource("route", { type: "geojson", data: geojson });
          map.addLayer({
            id: "route",
            type: "line",
            source: "route",
            paint: {
              "line-color": "#d9620a",
              "line-width": 3,
              "line-dasharray": [2, 1.5],
            },
          });
        }

        const lats = coords.map((c) => c[1]);
        const lngs = coords.map((c) => c[0]);
        map.fitBounds(
          [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          ],
          { padding: 48, maxZoom: 12, duration: 500 },
        );
      };

      if (map.isStyleLoaded()) draw();
      else map.once("load", draw);
    })();
    return () => {
      cancelled = true;
    };
  }, [origin, stops]);

  return <div className="map" ref={containerRef} />;
}

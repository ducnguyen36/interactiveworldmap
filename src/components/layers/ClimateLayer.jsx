import { GeoJSON } from 'react-leaflet';
import { useGeoData } from '../../hooks/useGeoData.js';
import { climateClass } from '../../lib/climate.js';

export default function ClimateLayer() {
  const { data } = useGeoData('/data/climate.geojson');
  if (!data) return null;

  return (
    <GeoJSON
      data={data}
      style={(f) => ({
        fillColor: climateClass(f.properties.CODE).color,
        fillOpacity: 0.5,
        weight: 0,
        interactive: false, // let clicks pass through to the country layer beneath
      })}
    />
  );
}

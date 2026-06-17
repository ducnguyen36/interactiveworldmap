import { useRef } from 'react';
import { GeoJSON } from 'react-leaflet';
import { useGeoData } from '../../hooks/useGeoData.js';
import { useSelection } from '../../context/SelectionContext.jsx';
import { climateClass } from '../../lib/climate.js';

export default function ClimateLayer() {
  const { data } = useGeoData('/data/climate.geojson');
  const { setSelected } = useSelection();
  const geoRef = useRef(null);
  const selectedRef = useRef(null);

  if (!data) return null;

  const style = (f) => ({
    fillColor: climateClass(f.properties.CODE).color,
    fillOpacity: 0.8,
    weight: 0,
    color: '#111111',
  });

  const onEachFeature = (feature, layer) => {
    layer.on({
      mouseover: (e) => { if (e.target !== selectedRef.current) e.target.setStyle({ weight: 1, color: '#333333' }); },
      mouseout: (e) => { if (e.target !== selectedRef.current) geoRef.current?.resetStyle(e.target); },
      click: (e) => {
        if (selectedRef.current && geoRef.current) geoRef.current.resetStyle(selectedRef.current);
        e.target.setStyle({ weight: 2, color: '#111111', fillOpacity: 0.9 });
        e.target.bringToFront();
        selectedRef.current = e.target;
        setSelected({ kind: 'climate', code: feature.properties.CODE });
      },
    });
  };

  return <GeoJSON ref={geoRef} data={data} style={style} onEachFeature={onEachFeature} />;
}

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import Map, { AttributionControl, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { LAYERS } from '../data/layers.js';
import { baseMapStyle, cssVar } from '../lib/mapStyle.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { useSelection } from '../context/SelectionContext.jsx';
import MapController from './MapController.jsx';

export default function MapView({ activeBaseId, activeOverlayIds }) {
  const { theme } = useTheme();
  const { selected, setSelected } = useSelection();
  const mapRef = useRef(null);
  const selectedFsRef = useRef(null); // { source, id } carrying the 'selected' feature-state
  const hoverFsRef = useRef(null);
  const [center, setCenter] = useState([0, 20]); // [lng, lat] for marker backside culling
  const mapStyle = useMemo(() => baseMapStyle(), []);

  const active = LAYERS.filter(
    (l) => (l.kind === 'base' && l.id === activeBaseId) ||
           (l.kind === 'overlay' && activeOverlayIds.has(l.id))
  );
  const interactiveLayerIds = active.flatMap((l) => l.interactiveLayerIds ?? []);

  // Ensure globe projection even if a runtime ignores the style's projection root.
  const handleLoad = useCallback((e) => {
    const map = e.target;
    if (map.setProjection) map.setProjection({ type: 'globe' });
  }, []);

  // Re-apply theme-sensitive paints when the theme flips.
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map || !map.isStyleLoaded?.()) return;
    map.setPaintProperty('background', 'background-color', cssVar('--map-ocean', '#cfe8f3'));
    const dark = theme === 'dark';
    if (map.getLayer('country-label-text')) {
      map.setPaintProperty('country-label-text', 'text-color', dark ? '#e5e7eb' : '#1f2933');
      map.setPaintProperty('country-label-text', 'text-halo-color', dark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.85)');
    }
  }, [theme]);

  // Clear the 'selected' feature-state when the selection is cleared (panel ×).
  useEffect(() => {
    if (!selected && selectedFsRef.current) {
      const map = mapRef.current?.getMap?.();
      if (map) { try { map.setFeatureState(selectedFsRef.current, { selected: false }); } catch { /* source gone */ } }
      selectedFsRef.current = null;
    }
  }, [selected]);

  const handleClick = useCallback((e) => {
    const feature = e.features && e.features[0];
    if (!feature) return;
    const owner = LAYERS.find((l) => (l.interactiveLayerIds ?? []).includes(feature.layer.id));
    if (!owner || !owner.selectFeature) return;
    const selection = owner.selectFeature(feature);
    if (!selection) return;
    const map = mapRef.current?.getMap?.();
    if (map) {
      if (selectedFsRef.current) { try { map.setFeatureState(selectedFsRef.current, { selected: false }); } catch { /* source gone */ } }
      if (feature.id !== undefined && feature.id !== null) {
        const fs = { source: feature.source, id: feature.id };
        map.setFeatureState(fs, { selected: true });
        selectedFsRef.current = fs;
      }
    }
    setSelected(selection);
  }, [setSelected]);

  // Desktop nicety: hover feature-state (touch devices simply never fire it).
  const handleMouseMove = useCallback((e) => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    const feature = e.features && e.features[0];
    if (hoverFsRef.current) {
      try { map.setFeatureState(hoverFsRef.current, { hover: false }); } catch { /* source gone */ }
      hoverFsRef.current = null;
    }
    if (feature && feature.id !== undefined && feature.id !== null) {
      const fs = { source: feature.source, id: feature.id };
      map.setFeatureState(fs, { hover: true });
      hoverFsRef.current = fs;
    }
  }, []);

  return (
    <Map
      ref={mapRef}
      initialViewState={{ longitude: 0, latitude: 20, zoom: 1.5 }}
      minZoom={1}
      maxZoom={7}
      mapStyle={mapStyle}
      interactiveLayerIds={interactiveLayerIds}
      onLoad={handleLoad}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMoveEnd={(e) => setCenter([e.viewState.longitude, e.viewState.latitude])}
      style={{ width: '100%', height: '100%' }}
      attributionControl={false}
    >
      <NavigationControl position="top-left" showCompass={false} />
      <AttributionControl position="bottom-right" compact customAttribution="Natural Earth · Köppen-Geiger · FAO · Wikipedia" />
      <MapController />
      {active.map((l) => l.component && <l.component key={l.id} center={center} />)}
    </Map>
  );
}

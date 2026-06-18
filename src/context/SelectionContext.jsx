import { createContext, useContext, useState, useMemo } from 'react';

const SelectionContext = createContext(null);

export function SelectionProvider({ children }) {
  // selected is null or a discriminated object: { kind: 'country'|'climate'|'current'|'volcano'|'commodity',
  // ...kind-specific fields, focus: { bounds } | { center: [lat, lng] } }.
  const [selected, setSelected] = useState(null);
  const value = useMemo(() => ({ selected, setSelected }), [selected]);
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error('useSelection must be used within SelectionProvider');
  return ctx;
}

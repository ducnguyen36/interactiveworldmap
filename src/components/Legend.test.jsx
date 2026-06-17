import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '../context/LanguageContext.jsx';
import Legend from './Legend.jsx';

function renderWith(ids) {
  return render(
    <LanguageProvider>
      <Legend activeOverlayIds={new Set(ids)} />
    </LanguageProvider>
  );
}

beforeEach(() => { localStorage.clear(); });

describe('Legend', () => {
  it('renders nothing when no overlays are active', () => {
    const { container } = renderWith([]);
    expect(container.firstChild).toBeNull();
  });
  it('renders a section for an active overlay', () => {
    renderWith(['currents']);
    expect(screen.getByText('Dòng biển nóng')).toBeInTheDocument();
    expect(screen.getByText('Dòng biển lạnh')).toBeInTheDocument();
  });
  it('renders agriculture commodity labels from the registry', () => {
    renderWith(['agriculture']);
    expect(screen.getByText('Lúa gạo')).toBeInTheDocument();
    expect(screen.getByText('Cà phê')).toBeInTheDocument();
  });
});

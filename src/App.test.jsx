import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App.jsx';

// MapLibre GL needs a real WebGL context; stub MapView for the smoke test.
vi.mock('./components/MapView.jsx', () => ({ default: () => <div data-testid="map" /> }));

beforeEach(() => { localStorage.clear(); });

describe('App', () => {
  it('renders header title and map without crashing', () => {
    render(<App />);
    expect(screen.getByText('Bản đồ Thế giới Tương tác')).toBeInTheDocument();
    expect(screen.getByTestId('map')).toBeInTheDocument();
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LanguageProvider, useLanguage } from './LanguageContext.jsx';

function Probe() {
  const { mode, setMode, tt } = useLanguage();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="title">{tt('app.title')}</span>
      <button onClick={() => setMode('dual')}>dual</button>
    </div>
  );
}

describe('LanguageContext', () => {
  it('defaults to vi and translates', () => {
    render(<LanguageProvider><Probe /></LanguageProvider>);
    expect(screen.getByTestId('mode').textContent).toBe('vi');
    expect(screen.getByTestId('title').textContent).toBe('Bản đồ Thế giới Tương tác');
  });
  it('joins both languages in dual mode', () => {
    render(<LanguageProvider><Probe /></LanguageProvider>);
    act(() => { screen.getByText('dual').click(); });
    expect(screen.getByTestId('title').textContent).toBe(
      'Bản đồ Thế giới Tương tác / Interactive World Map'
    );
  });
});

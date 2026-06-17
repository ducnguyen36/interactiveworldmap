import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageProvider } from '../context/LanguageContext.jsx';
import { ThemeProvider } from '../context/ThemeContext.jsx';
import Header from './Header.jsx';

function renderHeader() {
  return render(
    <ThemeProvider>
      <LanguageProvider>
        <Header />
      </LanguageProvider>
    </ThemeProvider>
  );
}

beforeEach(() => { localStorage.clear(); });

describe('Header language switcher', () => {
  it('renders three flag buttons', () => {
    renderHeader();
    expect(screen.getByLabelText('Tiếng Việt')).toBeInTheDocument();
    expect(screen.getByLabelText('English')).toBeInTheDocument();
    expect(screen.getByLabelText('Song ngữ')).toBeInTheDocument();
  });
  it('marks the active language and switches on click', () => {
    renderHeader();
    const vi = screen.getByLabelText('Tiếng Việt');
    const en = screen.getByLabelText('English');
    expect(vi).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(en);
    expect(en).toHaveAttribute('aria-pressed', 'true');
    expect(vi).toHaveAttribute('aria-pressed', 'false');
  });
});

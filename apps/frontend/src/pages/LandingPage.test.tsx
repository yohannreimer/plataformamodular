import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { LandingPage } from './LandingPage';

describe('LandingPage — Fluvia (default)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('renders Fluvia headline and CTA', () => {
    vi.stubGlobal('location', { hostname: 'fluvia.prymeiradigital.com.br' });
    render(<LandingPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/empresa não quebra/i);
    const ctaLinks = screen.getAllByRole('link', { name: /criar conta grátis/i });
    expect(ctaLinks.length).toBeGreaterThan(0);
    ctaLinks.forEach(link => expect(link).toHaveAttribute('href', '/'));
  });

  test('renders three pain cards', () => {
    vi.stubGlobal('location', { hostname: 'fluvia.prymeiradigital.com.br' });
    render(<LandingPage />);
    expect(screen.getByText(/dre chega semanas depois/i)).toBeInTheDocument();
    expect(screen.getByText(/fluxo de caixa no excel/i)).toBeInTheDocument();
    expect(screen.getByText(/decisões grandes no chute/i)).toBeInTheDocument();
  });
});

describe('LandingPage — Velio', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('renders Velio headline and CTA', () => {
    vi.stubGlobal('location', { hostname: 'velio.prymeiradigital.com.br' });
    render(<LandingPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/menos reunião/i);
    const ctaLinks = screen.getAllByRole('link', { name: /criar conta grátis/i });
    expect(ctaLinks.length).toBeGreaterThan(0);
  });

  test('renders before/after contrast', () => {
    vi.stubGlobal('location', { hostname: 'velio.prymeiradigital.com.br' });
    render(<LandingPage />);
    expect(screen.getByText(/antes/i)).toBeInTheDocument();
    expect(screen.getByText(/com velio/i)).toBeInTheDocument();
  });
});

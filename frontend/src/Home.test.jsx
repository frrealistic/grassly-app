import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from './pages/Home';
import { expect, test, describe, it } from 'vitest';

test('prikazuje naslov Grassly', () => {
  render(<Home />);
  const naslov = screen.getByText(/grassly/i);
  expect(naslov).toBeInTheDocument();
});


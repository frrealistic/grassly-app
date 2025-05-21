import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import { expect, test, describe, it } from 'vitest';

test('prikazuje naslov Grassly', () => {
  render(<App />);
  const naslov = screen.getByText(/grassly/i);
  expect(naslov).toBeInTheDocument();
});

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Home from './pages/Home'

describe('Home', () => {
  it('prikazuje naslov Grassly', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    )
    expect(screen.getByText('Grassly - Vaši travnjaci')).toBeInTheDocument()
  })
})


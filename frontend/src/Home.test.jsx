import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Home from './pages/Home'

describe('Home', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  it('prikazuje dobrodošlicu kada korisnik nije prijavljen', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    )
    expect(screen.getByText('Dobrodošli u Grassly!')).toBeInTheDocument()
    expect(screen.getByText('Prijavite se za korištenje aplikacije.')).toBeInTheDocument()
  })

  it('prikazuje naslov Grassly kada je korisnik prijavljen', () => {
    // Simulate logged in state
    localStorage.setItem('accessToken', 'dummy-token')
    
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    )
    expect(screen.getByText('Grassly - Vaši travnjaci')).toBeInTheDocument()
  })
})


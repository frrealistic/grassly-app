import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Home from './pages/Home'

describe('Home', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  it('shows welcome content when user is not logged in', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    )
    
    // Check for main elements in the welcome screen
    expect(screen.getByText('Grassly')).toBeInTheDocument()
    expect(screen.getByText('Management and monitoring of sports fields.')).toBeInTheDocument()
    expect(screen.getByText('Smart. Simple.')).toBeInTheDocument()
    expect(screen.getByText('Create Account')).toBeInTheDocument()
    
    // Check navigation links
    expect(screen.getByText('About')).toBeInTheDocument()
    expect(screen.getByText('Demo')).toBeInTheDocument()
    expect(screen.getByText('Contact')).toBeInTheDocument()
  })

  it('shows dashboard when user is logged in', () => {
    // Simulate logged in state
    localStorage.setItem('accessToken', 'dummy-token')
    
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    )
    
    // Check for dashboard elements
    expect(screen.getByText('Grassly - Your Sports Fields')).toBeInTheDocument()
    expect(screen.getByText('Logout')).toBeInTheDocument()
  })
})


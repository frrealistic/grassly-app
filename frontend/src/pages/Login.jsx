import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
    setSuccess('')
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      const res = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Greška')

      localStorage.setItem('accessToken', data.accessToken)
      setSuccess('Uspješno ste se prijavili!')
      setTimeout(() => {
        navigate('/')
      }, 1500)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      const res = await fetch('http://localhost:3000/api/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ name, email, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Greška')

      setSuccess('Registracija uspješna! Možete se prijaviti.')
      setMode('login')
      setEmail('')
      setPassword('')
      setName('')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
      <h2>{mode === 'login' ? 'Prijava' : 'Registracija'}</h2>
      {mode === 'login' ? (
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
          />
          <input
            type="password"
            placeholder="Lozinka"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
          />
          <button 
            type="submit"
            style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Prijavi se
          </button>
          {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}
          {success && <div style={{ color: 'green', marginTop: '10px' }}>{success}</div>}
        </form>
      ) : (
        <form onSubmit={handleRegister}>
          <input
            type="text"
            placeholder="Ime"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
          />
          <input
            type="password"
            placeholder="Lozinka"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
          />
          <button 
            type="submit"
            style={{ width: '100%', padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Registriraj se
          </button>
          {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}
          {success && <div style={{ color: 'green', marginTop: '10px' }}>{success}</div>}
        </form>
      )}

      <p style={{ marginTop: '1rem', textAlign: 'center' }}>
        {mode === 'login' ? (
          <>
            Nemaš račun?{' '}
            <button 
              type="button" 
              onClick={toggleMode}
              style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer' }}
            >
              Registriraj se
            </button>
          </>
        ) : (
          <>
            Već imaš račun?{' '}
            <button 
              type="button" 
              onClick={toggleMode}
              style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer' }}
            >
              Prijavi se
            </button>
          </>
        )}
      </p>
    </div>
  )
}

export default Login

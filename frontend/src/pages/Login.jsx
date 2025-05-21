import { useState } from 'react'

function Login() {
  const [mode, setMode] = useState('login')

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h2>{mode === 'login' ? 'Prijava' : 'Registracija'}</h2>

      {mode === 'login' ? (
        <form>
          <input type="email" placeholder="Email" /><br />
          <input type="password" placeholder="Lozinka" /><br />
          <button type="submit">Prijavi se</button>
        </form>
      ) : (
        <form>
          <input type="text" placeholder="Ime" /><br />
          <input type="email" placeholder="Email" /><br />
          <input type="password" placeholder="Lozinka" /><br />
          <button type="submit">Registriraj se</button>
        </form>
      )}

      <p style={{ marginTop: '1rem' }}>
        {mode === 'login' ? (
          <>
            Nemaš račun?{' '}
            <button onClick={toggleMode}>Registriraj se</button>
          </>
        ) : (
          <>
            Već imaš račun?{' '}
            <button onClick={toggleMode}>Prijavi se</button>
          </>
        )}
      </p>
    </div>
  )
}

export default Login

import { useNavigate } from 'react-router-dom';

export default function Home() {
  const isLoggedIn = !!localStorage.getItem('accessToken');
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!res.ok) throw new Error('Greška prilikom odjave');

      localStorage.removeItem('accessToken');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!isLoggedIn) {
    return (
      <div>
        <h1>Dobrodošli u Grassly!</h1>
        <p>Prijavite se za korištenje aplikacije.</p>
        <button onClick={() => navigate('/login')}>Prijavi se</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Grassly - Vaši travnjaci</h1>
        <button 
          onClick={handleLogout}
          style={{
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Odjavi se
        </button>
      </div>
      {/* Ovdje tvoj pravi app: popis travnjaka, plusić, itd. */}
    </div>
  );
}

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

      if (!res.ok) throw new Error('Error during logout');

      localStorage.removeItem('accessToken');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col">
      {/* HEADER */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-gray-100 max-w-7xl mx-auto w-full">
        <div className="font-bold text-2xl flex items-center gap-2">
          <span role="img" aria-label="logo">🌱</span> Grassly
        </div>
        <nav className="space-x-8">
          <a href="#about" className="hover:text-blue-600 transition">About</a>
          <a href="#features" className="hover:text-blue-600 transition">Demo</a>
          <a href="#contact" className="hover:text-blue-600 transition">Contact</a>
        </nav>
      </header>

      {/* HERO */}
      <section className="flex flex-1 flex-col md:flex-row items-center justify-center px-8 py-12 gap-12 max-w-7xl mx-auto w-full">
        <div className="max-w-md">
          <h1 className="text-4xl font-bold mb-4">Grassly</h1>
          <p className="text-gray-600 mb-8">
            Management and monitoring of sports fields.<br />
            Smart. Simple.
          </p>
          <button 
            className="bg-blue-600 text-white font-semibold px-8 py-3 rounded-xl shadow hover:bg-blue-700 transition"
            onClick={() => navigate('/login')}
          >
            Create Account
          </button>
        </div>
        <div className="hidden md:block">
          {/* We can add an illustration or image here later */}
          <div className="w-72 h-52 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400">
            (Image/Illustration)
          </div>
        </div>
      </section>
    </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Grassly - Your Sports Fields</h1>
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
          Logout
        </button>
      </div>
      {/* Your actual app here: list of fields, add button, etc. */}
    </div>
  );
}

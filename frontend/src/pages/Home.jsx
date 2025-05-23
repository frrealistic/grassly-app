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
      <div className="min-h-screen font-sans bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md z-50 border-b border-gray-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-2">
                <span className="text-3xl animate-bounce">🌱</span>
                <span className="font-bold text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Grassly
                </span>
              </div>
              <nav className="hidden md:flex items-center space-x-8">
                <a href="#about" className="text-gray-600 hover:text-blue-600 transition-colors duration-300">About</a>
                <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors duration-300">Demo</a>
                <a href="#contact" className="text-gray-600 hover:text-blue-600 transition-colors duration-300">Contact</a>
              </nav>
              {/* Hamburger menu za mobile */}
              <button className="md:hidden p-2 rounded-lg hover:bg-gray-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </header>
  
        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-16">
              <div className="max-w-xl text-center lg:text-left">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Smart Sports Field Management
                  </span>
                </h1>
                <p className="text-lg sm:text-xl text-gray-600 mb-8 leading-relaxed">
                  Transform how you manage and monitor sports fields with our innovative platform.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <button 
                    onClick={() => navigate('/register')}
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                  >
                    Kreiraj račun
                  </button>
                  <button 
                    onClick={() => navigate('/login')}
                    className="px-8 py-4 border-2 border-blue-600 text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-all duration-200"
                  >
                    Prijavi se
                  </button>
                </div>
              </div>
              <div className="relative w-full max-w-lg lg:max-w-none">
                <div className="relative w-full h-[400px] bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl shadow-2xl overflow-hidden">
                  {/* Ovde možeš staviti sliku, SVG, ilustraciju... */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-64 bg-white/90 rounded-full flex items-center justify-center shadow-inner animate-pulse">
                      <span className="text-7xl">🌱</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
  
        {/* Features Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Zašto Grassly?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Features ... */}
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

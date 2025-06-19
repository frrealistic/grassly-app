import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMapEvents, useMap, GeoJSON, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import osmtogeojson from 'osmtogeojson';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Map center component
function MapCenter({ center }) {
  const map = useMap();
  
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

// Add this new component to track map movement
function MapEvents({ onMove }) {
  const map = useMap();
  const lastCenterRef = useRef(null);
  
  useEffect(() => {
    const handleMove = () => {
      const center = map.getCenter();
      const newCenter = [center.lat, center.lng];
      
      // Only call onMove if the center has actually changed
      if (!lastCenterRef.current || 
          lastCenterRef.current[0] !== newCenter[0] || 
          lastCenterRef.current[1] !== newCenter[1]) {
        lastCenterRef.current = newCenter;
        onMove(newCenter);
      }
    };

    map.on('moveend', handleMove);
    return () => {
      map.off('moveend', handleMove);
    };
  }, [map, onMove]);
  
  return null;
}

// Add this new component to handle map clicks
function MapClickHandler({ onLocationSelect }) {
  const map = useMap();
  
  useEffect(() => {
    const handleClick = (e) => {
      onLocationSelect(e.latlng);
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [map, onLocationSelect]);
  
  return null;
}

// Add these new functions before the Home component
const getOverpassQuery = (lat, lon, radius = 1000) => `
  [out:json][timeout:25];
  (
    node["leisure"="pitch"](around:${radius},${lat},${lon});
    way["leisure"="pitch"](around:${radius},${lat},${lon});
    relation["leisure"="pitch"](around:${radius},${lat},${lon});
  );
  out body;
  >;
  out skel qt;
`;

const fetchPitches = async (lat, lon, radius = 1000) => {
  try {
    const query = getOverpassQuery(lat, lon, radius);
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
    });
    const data = await response.json();
    return osmtogeojson(data);
  } catch (error) {
    console.error('Error fetching pitches:', error);
    return null;
  }
};

// Add this new component for rendering GeoJSON
function PitchLayer({ data, onPitchSelect, selectedPitch }) {
  if (!data) return null;

  return (
    <GeoJSON 
      data={data} 
      style={feature => {
        // Highlight if selected
        if (
          selectedPitch &&
          feature.geometry.type === 'Polygon' &&
          selectedPitch.lat === getCoordinates(feature).lat &&
          selectedPitch.lng === getCoordinates(feature).lng
        ) {
          return {
            color: '#eab308', // yellow border
            weight: 4,
            fillColor: '#fde68a', // yellow fill
            fillOpacity: 0.4
          };
        }
        return {
          color: '#3388ff',
          weight: 2,
          fillColor: '#3388ff',
          fillOpacity: 0.2
        };
      }}
      pointToLayer={() => null}
      onEachFeature={(feature, layer) => {
        layer.on('click', () => {
          onPitchSelect({
            area: calculateArea(feature),
            ...getCoordinates(feature)
          });
        });
      }}
    />
  );
}

// Helper function to calculate area in square meters
function calculateArea(feature) {
  if (!feature.geometry || !feature.geometry.coordinates) return null;

  // For polygons, calculate the area
  if (feature.geometry.type === 'Polygon') {
    const coordinates = feature.geometry.coordinates[0];
    let area = 0;
    
    // Using the shoelace formula to calculate area
    for (let i = 0; i < coordinates.length - 1; i++) {
      area += coordinates[i][0] * coordinates[i + 1][1];
      area -= coordinates[i][1] * coordinates[i + 1][0];
    }
    
    // Convert to square meters (approximate)
    // 1 degree is approximately 111,111 meters at the equator
    const areaInSquareMeters = Math.abs(area) * 111111 * 111111;
    return Math.round(areaInSquareMeters);
  }
  
  return null;
}

// Helper function to get coordinates
function getCoordinates(feature) {
  if (!feature.geometry || !feature.geometry.coordinates) return {};

  if (feature.geometry.type === 'Polygon') {
    const coordinates = feature.geometry.coordinates[0];
    // Get the center point
    const center = coordinates.reduce(
      (acc, coord) => [acc[0] + coord[0], acc[1] + coord[1]],
      [0, 0]
    ).map(coord => coord / coordinates.length);

    // Get the bounds
    const bounds = coordinates.reduce(
      (acc, coord) => ({
        minLat: Math.min(acc.minLat, coord[1]),
        maxLat: Math.max(acc.maxLat, coord[1]),
        minLng: Math.min(acc.minLng, coord[0]),
        maxLng: Math.max(acc.maxLng, coord[0])
      }),
      { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 }
    );

    return {
      lat: center[1],
      lng: center[0],
      topLeftLat: bounds.maxLat,
      topLeftLng: bounds.minLng,
      bottomRightLat: bounds.minLat,
      bottomRightLng: bounds.maxLng
    };
  }

  return {};
}

export default function Home() {
  const isLoggedIn = !!localStorage.getItem('accessToken');
  const navigate = useNavigate();
  const [fields, setFields] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    area: '',
    lat: null,
    lng: null,
    topLeftLat: null,
    topLeftLng: null,
    bottomRightLat: null,
    bottomRightLng: null
  });
  const [mapCenter, setMapCenter] = useState([40.7128, -74.0060]); // Default center (New York)
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [initialMarkerPosition, setInitialMarkerPosition] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pitchData, setPitchData] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPitch, setSelectedPitch] = useState(null);

  useEffect(() => {
    if (isLoggedIn) {
      fetchFields();
    }
  }, [isLoggedIn]);

  const fetchFields = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.error('No access token found');
        return;
      }

      console.log('Attempting to fetch fields...');
      const res = await fetch('http://localhost:3000/api/fields', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      console.log('Response status:', res.status);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        console.error('Error response:', {
          status: res.status,
          statusText: res.statusText,
          data: errorData
        });
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Successfully fetched fields:', data);
      
      setFields(data);
    } catch (error) {
      console.error('Error fetching fields:', error);
      if (error.message.includes('401')) {
        console.log('Token might be invalid or expired');
        localStorage.removeItem('accessToken');
        navigate('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSelect = async (latlng) => {
    // Do NOT clear selectedPitch here
    console.log('Location selected:', latlng);
    setSelectedLocation(latlng);

    // Fetch nearby pitches
    const pitches = await fetchPitches(latlng.lat, latlng.lng);
    setPitchData(pitches);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&addressdetails=1&zoom=18`
      );
      const data = await response.json();
      console.log('Location data:', data);

      let formattedAddress = '';
      if (data.address) {
        const parts = [];
        if (data.address.road) parts.push(data.address.road);
        if (data.address.house_number) parts.push(data.address.house_number);
        if (data.address.city) parts.push(data.address.city);
        if (data.address.state) parts.push(data.address.state);
        if (data.address.country) parts.push(data.address.country);
        formattedAddress = parts.join(', ');
      } else {
        formattedAddress = data.display_name;
      }

      setFormData(prev => ({
        ...prev,
        location: formattedAddress,
        lat: latlng.lat,
        lng: latlng.lng,
        topLeftLat: latlng.lat + 0.001,
        topLeftLng: latlng.lng - 0.001,
        bottomRightLat: latlng.lat - 0.001,
        bottomRightLng: latlng.lng + 0.001
      }));
    } catch (error) {
      console.error('Error getting location name:', error);
      setFormData(prev => ({
        ...prev,
        location: `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`,
        lat: latlng.lat,
        lng: latlng.lng,
        topLeftLat: latlng.lat + 0.001,
        topLeftLng: latlng.lng - 0.001,
        bottomRightLat: latlng.lat - 0.001,
        bottomRightLng: latlng.lng + 0.001
      }));
    }
  };

  const handleAddFieldClick = () => {
    console.log('Add field button clicked');
    setShowAddFieldModal(true);
    setEditingField(null);
    setIsLocating(true);
    setLocationError(null);
    setInitialMarkerPosition(null);
    setSelectedLocation(null);
    setFormData({
      name: '',
      location: '',
      area: '',
      lat: null,
      lng: null,
      topLeftLat: null,
      topLeftLng: null,
      bottomRightLat: null,
      bottomRightLng: null
    });
    
    // Request user's location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Got user location:', position);
          const { latitude, longitude } = position.coords;
          const newPosition = [latitude, longitude];
          
          console.log('Setting new map center:', newPosition);
          // Update map center first with a reasonable zoom level
          setMapCenter(newPosition);
          
          // Then update other state
          setInitialMarkerPosition(newPosition);
          setSelectedLocation({ lat: latitude, lng: longitude });
          
          // Update form data with coordinates
          setFormData(prev => ({
            ...prev,
            lat: latitude,
            lng: longitude,
            topLeftLat: latitude + 0.001,
            topLeftLng: longitude - 0.001,
            bottomRightLat: latitude - 0.001,
            bottomRightLng: longitude + 0.001
          }));
          
          // Get address for the location
          handleLocationSelect({ lat: latitude, lng: longitude });
          setIsLocating(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          let errorMessage = 'Unable to get your location. ';
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Please allow location access in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage += 'Location request timed out. Please try again.';
              break;
            default:
              errorMessage += 'Please select a location manually.';
          }
          
          setLocationError(errorMessage);
          setIsLocating(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
      setIsLocating(false);
    }
  };

  const handleEditField = (field) => {
    setEditingField(field);
    setShowAddFieldModal(true);
    setFormData({
      name: field.name,
      location: field.location,
      area: field.size,
      lat: field.latitude,
      lng: field.longitude,
      topLeftLat: field.latitude + 0.001,
      topLeftLng: field.longitude - 0.001,
      bottomRightLat: field.latitude - 0.001,
      bottomRightLng: field.longitude + 0.001
    });
    setMapCenter([field.latitude, field.longitude]);
    setSelectedLocation({ lat: field.latitude, lng: field.longitude });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLocation) {
      alert('Please select a location on the map');
      return;
    }

    try {
      // Transform the data to match backend expectations
      const fieldData = {
        name: formData.name,
        location: formData.location,
        latitude: formData.lat,
        longitude: formData.lng,
        size: formData.area,
        surface_type: null
      };

      console.log('Sending field data:', fieldData);
      console.log('Auth token:', localStorage.getItem('accessToken'));

      const url = editingField 
        ? `http://localhost:3000/api/fields/${editingField.id}`
        : 'http://localhost:3000/api/fields';
      
      const method = editingField ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(fieldData)
      });

      const responseData = await res.json();
      console.log('Server response:', responseData);

      if (res.ok) {
        if (editingField) {
          setFields(prev => prev.map(field => 
            field.id === editingField.id ? { ...field, ...responseData } : field
          ));
        } else {
          setFields(prev => [...prev, responseData]);
        }
        setShowAddFieldModal(false);
        setFormData({
          name: '',
          location: '',
          area: '',
          lat: null,
          lng: null,
          topLeftLat: null,
          topLeftLng: null,
          bottomRightLat: null,
          bottomRightLng: null
        });
        setSelectedLocation(null);
        setPitchData(null);
        setEditingField(null);
      } else {
        console.error('Error response:', {
          status: res.status,
          statusText: res.statusText,
          data: responseData
        });
        
        if (res.status === 401) {
          alert('Your session has expired. Please log in again.');
          localStorage.removeItem('accessToken');
          navigate('/login');
        } else {
          alert(`Error ${editingField ? 'updating' : 'creating'} field: ${responseData.error}${responseData.details ? `\nDetails: ${responseData.details}` : ''}`);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      alert(`Error ${editingField ? 'updating' : 'creating'} field: ${error.message}`);
    }
  };

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

  // Add this new function to handle map movement
  const handleMapMove = (center) => {
    setMapCenter(center);
  };

  // Add this new function to search for fields
  const handleSearchFields = async () => {
    if (!mapCenter) {
      console.error('No map center available');
      return;
    }

    setIsSearching(true);
    // Reset previous search results
    setPitchData(null);
    setSelectedLocation(null);
    
    try {
      console.log('Starting search at:', mapCenter);
      const pitches = await fetchPitches(mapCenter[0], mapCenter[1]);
      console.log('Search complete. Found pitches:', pitches);
      
      if (pitches && pitches.features) {
        setPitchData(pitches);
        setSelectedLocation({ lat: mapCenter[0], lng: mapCenter[1] });
      } else {
        console.log('No pitches found in the area');
        setPitchData(null);
      }
    } catch (error) {
      console.error('Error searching fields:', error);
      alert('Error searching for fields. Please try again.');
    } finally {
      setIsSearching(false);
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
              {/* Mobile menu button */}
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </header>
  
        {/* Mobile menu */}
        <div 
          className={`fixed top-0 right-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex justify-end p-4">
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="px-6 py-4">
            <div className="space-y-6">
              <a 
                href="#about" 
                className="block text-lg text-gray-600 hover:text-blue-600 transition-colors duration-300"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                About
              </a>
              <a 
                href="#features" 
                className="block text-lg text-gray-600 hover:text-blue-600 transition-colors duration-300"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Demo
              </a>
              <a 
                href="#contact" 
                className="block text-lg text-gray-600 hover:text-blue-600 transition-colors duration-300"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Contact
              </a>
            </div>
          </nav>
        </div>
        {/* Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
  
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
                    onClick={() => navigate('/login')}
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                  >
                    Login/Register
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
              Why Choose Grassly?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Smart Monitoring */}
              <div className="group p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 mb-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl group-hover:scale-105 transition-transform duration-300">
                    📊
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-800">Smart Monitoring</h3>
                  <p className="text-sm text-gray-600">
                    Real-time field condition monitoring with advanced sensors and AI-powered analytics.
                  </p>
                </div>
              </div>

              {/* Weather Integration */}
              <div className="group p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 mb-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl group-hover:scale-105 transition-transform duration-300">
                    🌤️
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-800">Weather Integration</h3>
                  <p className="text-sm text-gray-600">
                    Smart weather forecasting and automated maintenance scheduling based on conditions.
                  </p>
                </div>
              </div>

              {/* Resource Optimization */}
              <div className="group p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 mb-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl group-hover:scale-105 transition-transform duration-300">
                    💧
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-800">Resource Optimization</h3>
                  <p className="text-sm text-gray-600">
                    Efficient water and resource management with smart irrigation systems.
                  </p>
                </div>
              </div>

              {/* Maintenance Tracking */}
              <div className="group p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 mb-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl group-hover:scale-105 transition-transform duration-300">
                    📝
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-800">Maintenance Tracking</h3>
                  <p className="text-sm text-gray-600">
                    Comprehensive maintenance logs and automated task scheduling.
                  </p>
                </div>
              </div>

              {/* Mobile Access */}
              <div className="group p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 mb-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl group-hover:scale-105 transition-transform duration-300">
                    📱
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-800">Mobile Access</h3>
                  <p className="text-sm text-gray-600">
                    Manage your fields on the go with our intuitive mobile application.
                  </p>
                </div>
              </div>

              {/* Data Analytics */}
              <div className="group p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 mb-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl group-hover:scale-105 transition-transform duration-300">
                    📈
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-800">Data Analytics</h3>
                  <p className="text-sm text-gray-600">
                    Detailed insights and reports to optimize field performance and maintenance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

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
            <button 
              onClick={handleLogout}
              className="px-4 py-2 text-red-600 hover:text-red-700 transition-colors duration-300"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : fields.length === 0 ? (
            <div className="text-center">
              <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">🏟️</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">No Fields Yet</h2>
                <p className="text-gray-600 mb-8">
                  Start by adding your first sports field to begin monitoring and managing it.
                </p>
                <button
                  onClick={handleAddFieldClick}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  Add Your First Field
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {fields.map(field => (
                  <div 
                    key={`field-${field.id}`} 
                    className="relative bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
                  >
                    {/* Edit button in the top right */}
                    <button
                      onClick={() => handleEditField(field)}
                      className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 transition z-10"
                      title="Edit field"
                      type="button"
                    >
                      <span className="text-xl">✏️</span>
                    </button>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">{field.name}</h3>
                    <p className="text-gray-600 mb-4">{field.location}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>Area: {field.size || 'Not specified'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Floating Add Button */}
              <button
                onClick={handleAddFieldClick}
                className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Field Modal */}
      {showAddFieldModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddFieldModal(false);
              setEditingField(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">
                {editingField ? 'Edit Field' : 'Add New Field'}
              </h3>
              <div className="flex items-center gap-2">
                {editingField && fields.some(f => f.id === editingField.id) && (
                  <button
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to delete this field? This action cannot be undone.')) {
                        try {
                          const fieldId = Number(editingField.id);
                          const res = await fetch(`http://localhost:3000/api/fields/${fieldId}`, {
                            method: 'DELETE',
                            headers: {
                              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                              'Content-Type': 'application/json'
                            }
                          });
                          if (res.ok) {
                            setFields(prev => prev.filter(field => field.id !== editingField.id));
                            setShowAddFieldModal(false);
                            setEditingField(null);
                          } else {
                            const data = await res.json();
                            alert(data.error || 'Failed to delete field.');
                          }
                        } catch (error) {
                          alert('Error deleting field.');
                        }
                      }
                    }}
                    className="p-2 rounded-full bg-red-100 hover:bg-red-200 transition text-red-600 text-xl flex items-center justify-center mr-2"
                    title="Delete field"
                    type="button"
                  >
                    <span role="img" aria-label="Delete">🗑️</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowAddFieldModal(false);
                    setEditingField(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {isLocating && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-600 flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Getting your location...
              </div>
            )}
            {locationError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
                {locationError}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Field Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                    placeholder="Enter field name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Area (in square meters)
                  </label>
                  <input
                    type="number"
                    value={formData.area}
                    onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                    placeholder="Enter field area"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    readOnly
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50"
                    placeholder="Select location on map"
                  />
                </div>
              </div>
              
              <div className="relative h-[400px] w-full rounded-xl overflow-hidden border border-gray-200">
                <MapContainer
                  center={mapCenter}
                  zoom={18}
                  style={{ height: '100%', width: '100%' }}
                  className="z-0"
                  zoomControl={true}
                >
                  <TileLayer
                    url="https://tile.openstreetmap.de/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    maxZoom={19}
                    minZoom={3}
                  />
                  <MapCenter center={mapCenter} />
                  <MapEvents onMove={handleMapMove} />
                  <MapClickHandler onLocationSelect={handleLocationSelect} />
                  {selectedLocation && pitchData && (
                    <PitchLayer 
                      data={pitchData} 
                      onPitchSelect={pitchData => {
                        setSelectedPitch(pitchData);
                        setFormData(prev => ({
                          ...prev,
                          area: pitchData.area,
                          lat: pitchData.lat,
                          lng: pitchData.lng,
                          topLeftLat: pitchData.topLeftLat,
                          topLeftLng: pitchData.topLeftLng,
                          bottomRightLat: pitchData.bottomRightLat,
                          bottomRightLng: pitchData.bottomRightLng,
                        }));
                      }}
                    />
                  )}
                  {selectedPitch && selectedPitch.lat && selectedPitch.lng && (
                    <Marker position={[selectedPitch.lat, selectedPitch.lng]} />
                  )}
                </MapContainer>
                {/* Search Button */}
                <button
                  type="button"
                  onClick={() => {
                    console.log('Search button clicked. Current map center:', mapCenter);
                    handleSearchFields();
                  }}
                  disabled={isSearching}
                  className="absolute top-4 right-4 px-4 py-2 bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 z-[1000]"
                >
                  {isSearching ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span>Search Fields</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  {editingField ? 'Update Field' : 'Add Field'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

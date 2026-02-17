import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
})

const currency = cents => `₱${(cents / 100).toFixed(2)}`

const formatDuration = (minutes) => {
  const minutesValue = Number(minutes)
  if (!Number.isFinite(minutesValue)) {
    return 'Price'
  }
  if (minutesValue < 60) {
    return `${minutesValue}m`
  }
  const hours = Math.floor(minutesValue / 60)
  const mins = minutesValue % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

const Home = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const [services, setServices] = useState([])
  const [stylists, setStylists] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [servicesRes, stylistsRes] = await Promise.all([
        api.get('/services'),
        api.get('/stylists'),
      ])
      setServices(servicesRes.data || [])
      // Only show active stylists
      setStylists((stylistsRes.data || []).filter(s => s.active))
    } catch (e) {
      console.error('Failed to load data:', e)
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-white">
      {/* Header/Navigation - Dark Blue */}
      <nav className="bg-[#1e3a8a] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold flex items-center gap-2">
                <span className="text-yellow-400"></span>

              </span>
            </div>
           
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="md:hidden px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-sm"
            >
              Menu
            </button>
          </div>
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-white/10 pb-4 pt-3 space-y-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  navigate('/book')
                }}
                className="w-full text-left text-white hover:text-gray-200 text-sm font-medium transition"
              >
                Book Appointment
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  navigate('/stylists')
                }}
                className="w-full text-left text-white hover:text-gray-200 text-sm font-medium transition"
              >
                Stylists
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  navigate('/services')
                }}
                className="w-full text-left text-white hover:text-gray-200 text-sm font-medium transition"
              >
                Services
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  navigate('/my-appointments')
                }}
                className="w-full text-left text-white hover:text-gray-200 text-sm font-medium transition"
              >
                My Appointments
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section - Dark Blue */}
      <section className="bg-[#1e3a8a] text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Welcome to Kaye's Hair Salon and Spa
          </h1>
          <p className="text-xl text-gray-200 mb-10 max-w-2xl mx-auto">
            Your trusted beauty destination. Experience premium hair, nail, and beauty services with our expert stylists.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/book')}
              className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition"
            >
              Book Appointment
            </button>
            <button
              onClick={() => navigate('/services')}
              className="w-full sm:w-auto px-8 py-3 bg-white text-[#3b2f2a] hover:bg-[#f7f1ec] font-semibold rounded border border-gray-300 transition"
            >
              View Services
            </button>
          </div>
        </div>
      </section>

      {/* Our Services Section - White Background */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Services</h2>
            <p className="text-lg text-[#8f7a6f] max-w-2xl mx-auto">
              Discover our wide range of beauty and wellness services designed to make you look and feel your best.
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-[#9b857a]">Loading services...</div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {services.slice(0, 6).map((service) => (
                  <div
                    key={service.id}
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl hover:ring-2 hover:ring-blue-200"
                  >
                    {service.image ? (
                      <img
                        src={`http://localhost:8000/${service.image}`}
                        alt={service.name}
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.nextSibling.style.display = 'flex'
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-full h-48 ${service.image ? 'hidden' : 'flex'} items-center justify-center bg-[#f7f1ec] text-gray-400`}
                    >
                      No Image
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2">{service.name}</h3>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-[#8f7a6f]">
                          {formatDuration(service.duration_minutes)}
                        </span>
                        <span className="text-lg font-bold text-green-600">
                          {currency(service.price_cents)}
                        </span>
                      </div>
                      <button
                        onClick={() => navigate(`/book?services=${service.id}`)}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {services.length > 6 && (
                <div className="text-center">
                  <button
                    onClick={() => navigate('/services')}
                    className="px-6 py-2 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 rounded font-medium transition"
                  >
                    View All Services
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Our Expert Stylists Section - White Background */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Expert Stylists</h2>
            <p className="text-lg text-[#8f7a6f] max-w-2xl mx-auto">
              Meet our talented team of professional stylists dedicated to bringing out your best look.
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-[#9b857a]">Loading stylists...</div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {stylists.slice(0, 4).map((stylist) => (
                  <div
                    key={stylist.id}
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl hover:ring-2 hover:ring-blue-200"
                  >
                    {stylist.image ? (
                      <img
                        src={`http://localhost:8000/${stylist.image}`}
                        alt={stylist.name}
                        className="w-full h-64 object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.nextSibling.style.display = 'flex'
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-full h-64 ${stylist.image ? 'hidden' : 'flex'} items-center justify-center bg-gray-200 text-gray-400`}
                    >
                      No Image
                    </div>
                    <div className="p-4 text-center">
                      <h3 className="font-semibold text-lg mb-2">{stylist.name}</h3>
                      <p className="text-sm text-[#8f7a6f] mb-4 min-h-[2.5rem]">
                        Professional Stylist
                      </p>
                      <button
                        onClick={() => navigate('/book')}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition"
                      >
                        Book with {stylist.name.split(' ')[0]}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {stylists.length > 4 && (
                <div className="text-center">
                  <button
                    onClick={() => navigate('/stylists')}
                    className="px-6 py-2 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 rounded font-medium transition"
                  >
                    View All Stylists
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-gray-400 text-sm text-center md:text-left">
              2nd Floor, Governor Perdices Street, Dumaguete City, Philippines, 6200
            </div>
            <div className="text-[#9b857a] text-sm">(c) 2024 Kaye's Hair Salon and Spa. All rights reserved.</div>
          </div>
        </div>
      </footer>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1e3a8a] border-t border-blue-700 px-4 py-3 z-50">
        <div className="flex items-center justify-around">
          <button
            onClick={() => navigate('/')}
            className="flex flex-col items-center text-white"
          >
            <span className="text-xl">🏠</span>
            <span className="text-xs mt-1">Home</span>
          </button>
          <button
            onClick={() => navigate('/book')}
            className="flex flex-col items-center text-gray-300 hover:text-white transition"
          >
            <span className="text-xl">📅</span>
            <span className="text-xs mt-1">Book</span>
          </button>
          <button
            onClick={() => navigate('/my-appointments')}
            className="flex flex-col items-center text-gray-300 hover:text-white transition"
          >
            <span className="text-xl">📋</span>
            <span className="text-xs mt-1">Appointments</span>
          </button>
          <button
            onClick={() => navigate('/services')}
            className="flex flex-col items-center text-gray-300 hover:text-white transition"
          >
            <span className="text-xl">💅</span>
            <span className="text-xs mt-1">Services</span>
          </button>
          <button
            onClick={() => navigate('/stylists')}
            className="flex flex-col items-center text-gray-300 hover:text-white transition"
          >
            <span className="text-xl">💇</span>
            <span className="text-xs mt-1">Stylists</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Home


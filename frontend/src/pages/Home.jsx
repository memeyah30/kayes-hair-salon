import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import heroMainImage from '../assets/landing-hero-main.jpg'
import heroSecondaryImage from '../assets/landing-hero-secondary.jpg'

const currency = (cents) => `P${(cents / 100).toFixed(2)}`

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

const imageUrl = (path) => (path ? `http://localhost:8000/${path}` : null)
const heroImages = {
  primary: heroMainImage,
  secondary: heroSecondaryImage,
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
      setStylists((stylistsRes.data || []).filter((s) => s.active))
    } catch (e) {
      console.error('Failed to load data:', e)
    } finally {
      setLoading(false)
    }
  }

  const scrollToSection = (id) => {
    const target = document.getElementById(id)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    setMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-[#f4edff] text-[#2f245a]">
      <header className="relative overflow-hidden bg-[radial-gradient(circle_at_20%_20%,#8a78ff_0%,#6e62df_35%,#5a49c4_65%,#4a3ba7_100%)] text-white">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_80%_10%,#d9c8ff_0%,transparent_45%),radial-gradient(circle_at_20%_85%,#c5b3ff_0%,transparent_35%)]" />
        <div className="absolute -bottom-24 left-0 right-0 h-56 bg-[radial-gradient(ellipse_at_center,#cdbdff_0%,#f4edff_70%)] opacity-80" />

        <nav className="relative z-20 max-w-7xl mx-auto px-4 md:px-8 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 sm:gap-3 text-lg sm:text-2xl md:text-[2rem] font-semibold tracking-tight hover:opacity-90 transition min-w-0"
            >
              <span className="h-12 w-12 md:h-14 md:w-14 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="Kaye's Hair Salon logo" className="h-10 w-10 md:h-12 md:w-12 object-contain" />
              </span>
              <span className="truncate">Kaye&apos;s Hair Salon and Spa</span>
            </button>

            <div className="hidden md:flex items-center gap-7 text-lg">
              <button onClick={() => scrollToSection('services')} className="hover:text-[#f1e8ff] transition">Our Services</button>
              <button onClick={() => scrollToSection('about')} className="hover:text-[#f1e8ff] transition">About Us</button>
              <button onClick={() => scrollToSection('contact')} className="hover:text-[#f1e8ff] transition">Contact</button>
              <button
                onClick={() => navigate('/manage-booking/start')}
                className="px-4 py-2 rounded-2xl border border-white/40 bg-white/15 hover:bg-white/25 transition"
                title="Manage My Booking"
              >
                Manage
              </button>
            </div>

            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden px-3 py-2 rounded-xl border border-white/35 bg-white/10 hover:bg-white/20"
            >
              Menu
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden mt-4 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm p-4 space-y-2">
              <button
                onClick={() => scrollToSection('services')}
                className="block w-full text-left py-2 px-2 rounded hover:bg-white/15"
              >
                Our Services
              </button>
              <button
                onClick={() => scrollToSection('about')}
                className="block w-full text-left py-2 px-2 rounded hover:bg-white/15"
              >
                About Us
              </button>
              <button
                onClick={() => scrollToSection('contact')}
                className="block w-full text-left py-2 px-2 rounded hover:bg-white/15"
              >
                Contact
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  navigate('/manage-booking/start')
                }}
                className="block w-full text-left py-2 px-2 rounded hover:bg-white/15"
              >
                Manage My Booking
              </button>
            </div>
          )}
        </nav>

        <section className="relative z-20 max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-24 md:pb-28">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-[clamp(2rem,8vw,4.5rem)] leading-[1.05] font-semibold tracking-tight mb-6">
                Welcome to Kaye&apos;s<br />Hair Salon and Spa
              </h1>
              <p className="text-base sm:text-xl md:text-2xl text-[#eee8ff] mb-8 max-w-2xl">
                Your trusted beauty destination. Experience premium hair, nail, and beauty services with our expert stylists.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => navigate('/book')}
                  className="tap-safe px-8 py-3 rounded-xl bg-gradient-to-r from-[#7d63ff] to-[#5f47e7] hover:from-[#8a73ff] hover:to-[#6d57ee] shadow-lg shadow-[#2d1f7a]/40 transition font-semibold text-lg"
                >
                  Book Appointment
                </button>
                <button
                  onClick={() => navigate('/manage-booking/start')}
                  className="tap-safe px-8 py-3 rounded-xl border border-white/50 bg-white/20 hover:bg-white/30 transition font-semibold text-lg"
                >
                  Manage My Booking
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-3xl p-2 md:p-3 bg-white/35 backdrop-blur-sm border border-white/40 shadow-2xl">
                <div className="rounded-[1.3rem] overflow-hidden h-[300px] md:h-[360px] bg-[#efe8ff]">
                  {heroImages.primary ? (
                    <img src={heroImages.primary} alt="Salon hero" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#5a49c4] text-lg font-medium">
                      Salon Image
                    </div>
                  )}
                </div>
              </div>
              <div className="absolute -bottom-14 right-0 w-[72%] rounded-2xl p-2 bg-white/40 border border-white/40 shadow-xl">
                <div className="rounded-xl overflow-hidden h-36 md:h-44 bg-[#efe8ff]">
                  {heroImages.secondary ? (
                    <img src={heroImages.secondary} alt="Salon preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#5a49c4] text-sm font-medium">
                      Service Preview
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </header>

      <main className="relative z-10 -mt-4">
        <section id="services" className="px-4 md:px-8 py-14 md:py-20 bg-[radial-gradient(circle_at_20%_10%,#efe7ff_0%,#f6f1ff_55%,#f3ecff_100%)]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10 md:mb-12">
              <h2 className="text-[clamp(1.85rem,7vw,3.75rem)] font-semibold mb-4 text-[#2f245a]">Our Services</h2>
              <p className="max-w-3xl mx-auto text-lg md:text-xl text-[#6b5b95]">
                Discover our wide range of beauty and wellness services designed to make you look and feel your best.
              </p>
            </div>

            {loading ? (
              <div className="text-center py-16 text-[#6b5b95] text-lg">Loading services...</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {services.slice(0, 6).map((service) => (
                    <div
                      key={service.id}
                      className="rounded-2xl border border-[#d8cbff] bg-white/85 shadow-[0_12px_28px_rgba(70,45,130,0.12)] overflow-hidden transition hover:-translate-y-1.5 hover:shadow-[0_18px_32px_rgba(70,45,130,0.2)]"
                    >
                      {service.image ? (
                        <img
                          src={imageUrl(service.image)}
                          alt={service.name}
                          className="w-full h-44 object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextSibling.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-full h-44 ${service.image ? 'hidden' : 'flex'} items-center justify-center bg-[#efe8ff] text-[#6b5b95] font-medium`}
                      >
                        No Image
                      </div>

                      <div className="p-4">
                        <div className="text-3xl md:text-[2rem] font-semibold text-[#2f245a] mb-2">{service.name}</div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-[#6b5b95]">{formatDuration(service.duration_minutes)}</div>
                          <div className="text-4xl font-bold text-[#11914a]">{currency(service.price_cents)}</div>
                        </div>
                        <button
                          onClick={() => navigate(`/book?services=${service.id}`)}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#5f7dff] to-[#405ae1] text-white font-semibold hover:from-[#6b88ff] hover:to-[#4b66ea] transition"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {services.length > 6 && (
                  <div className="text-center mt-10">
                    <button
                      onClick={() => navigate('/services')}
                      className="px-8 py-3 rounded-xl border border-[#bca8ff] text-[#4a3ba7] bg-white/70 hover:bg-white transition text-lg"
                    >
                      View All Services
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <section id="stylists" className="px-4 md:px-8 py-16 bg-[radial-gradient(circle_at_80%_10%,#ece3ff_0%,#f7f2ff_60%,#f4edff_100%)]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10 md:mb-12">
              <h2 className="text-[clamp(1.85rem,7vw,3.75rem)] font-semibold mb-4 text-[#2f245a]">Our Expert Stylists</h2>
              <p className="max-w-3xl mx-auto text-lg md:text-xl text-[#6b5b95]">
                Meet our talented and professional stylists dedicated to bringing out your best look.
              </p>
            </div>

            {loading ? (
              <div className="text-center py-16 text-[#6b5b95] text-lg">Loading stylists...</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                  {stylists.slice(0, 4).map((stylist) => (
                    <div
                      key={stylist.id}
                      className="rounded-2xl border border-[#dcd0ff] bg-white/90 shadow-[0_10px_24px_rgba(70,45,130,0.12)] p-4 transition hover:-translate-y-1 hover:shadow-[0_16px_28px_rgba(70,45,130,0.2)]"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-16 w-16 rounded-xl overflow-hidden bg-[#ece4ff]">
                          {stylist.image ? (
                            <img
                              src={imageUrl(stylist.image)}
                              alt={stylist.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none'
                                e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-xs text-[#6b5b95]">No Image</div>'
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-[#6b5b95]">No Image</div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-[#2f245a] leading-tight">{stylist.name}</h3>
                          <p className="text-sm text-[#7f6aa8]">Senior Stylist</p>
                        </div>
                      </div>
                      <p className="text-sm text-[#6b5b95] mb-4 min-h-[3.3rem]">
                        Professional and customer-focused service for your best style.
                      </p>
                    <button
                      onClick={() => navigate('/book')}
                      className="tap-safe w-full py-2.5 rounded-xl bg-gradient-to-r from-[#5f7dff] to-[#405ae1] text-white font-semibold hover:from-[#6b88ff] hover:to-[#4b66ea] transition"
                    >
                      Book with {stylist.name.split(' ')[0]}
                    </button>
                    </div>
                  ))}
                </div>

                {stylists.length > 4 && (
                  <div className="text-center mt-10">
                    <button
                      onClick={() => navigate('/stylists')}
                      className="px-8 py-3 rounded-xl border border-[#bca8ff] text-[#4a3ba7] bg-white/70 hover:bg-white transition text-lg"
                    >
                      View All Stylists
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <section id="about" className="px-4 md:px-8 py-14 bg-white">
          <div className="max-w-6xl mx-auto rounded-3xl border border-[#e8ddff] bg-[linear-gradient(135deg,#ffffff_0%,#f8f2ff_100%)] p-8 md:p-12">
            <h2 className="text-4xl md:text-5xl font-semibold text-[#2f245a] mb-4">About Us</h2>
            <p className="text-lg md:text-xl text-[#5f4f8f] leading-relaxed">
              Kaye&apos;s Hair Salon and Spa delivers modern beauty services with professional care. We focus on clean styling,
              quality products, and a comfortable experience for every customer.
            </p>
          </div>
        </section>

        <section id="contact" className="px-4 md:px-8 py-14 bg-white">
          <div className="max-w-6xl mx-auto rounded-3xl border border-[#e8ddff] bg-[#f8f3ff] p-8 md:p-12 text-center">
            <h2 className="text-4xl md:text-5xl font-semibold text-[#2f245a] mb-3">Contact</h2>
            <p className="text-lg md:text-xl text-[#5f4f8f] mb-6">
              2nd Floor, Governor Perdices Street, Dumaguete City, Philippines, 6200
            </p>
          </div>
        </section>
      </main>

      <footer className="bg-[#2f245a] text-[#ddd2ff] py-6 px-4 pb-24 md:pb-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-sm">
          <div>Kaye&apos;s Hair Salon and Spa</div>
          <div>(c) 2024 All rights reserved.</div>
        </div>
      </footer>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#2f245a]/95 border-t border-[#6f5fd3] px-3 py-2 z-50 backdrop-blur-sm">
        <div className="flex items-center justify-around text-xs">
          <button onClick={() => navigate('/')} className="text-white px-2 py-1 rounded hover:bg-white/10">Home</button>
          <button onClick={() => navigate('/book')} className="text-[#d2c6ff] hover:text-white px-2 py-1 rounded hover:bg-white/10">Book</button>
          <button onClick={() => navigate('/manage-booking/start')} className="text-[#d2c6ff] hover:text-white px-2 py-1 rounded hover:bg-white/10">Manage</button>
          <button onClick={() => navigate('/services')} className="text-[#d2c6ff] hover:text-white px-2 py-1 rounded hover:bg-white/10">Services</button>
          <button onClick={() => navigate('/stylists')} className="text-[#d2c6ff] hover:text-white px-2 py-1 rounded hover:bg-white/10">Stylists</button>
        </div>
      </div>
    </div>
  )
}

export default Home

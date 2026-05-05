import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { resolveAssetUrl } from '../utils/runtime'
import HowToBookSection from '../components/HowToBookSection'
import LandingFooter from '../components/LandingFooter'
import './HomeHero.css'

const currency = (cents) => `PHP ${(Number(cents || 0) / 100).toFixed(2)}`

const imageUrl = (path) => {
  return resolveAssetUrl(path)
}

const asArray = (value) => (Array.isArray(value) ? value : [])

const parsePriceCents = (centsValue, pesoValue) => {
  if (centsValue !== null && typeof centsValue !== 'undefined' && centsValue !== '') {
    const asCents = Number(centsValue)
    return Number.isFinite(asCents) ? Math.round(asCents) : null
  }
  if (pesoValue !== null && typeof pesoValue !== 'undefined' && pesoValue !== '') {
    const asPesos = Number(pesoValue)
    return Number.isFinite(asPesos) ? Math.round(asPesos * 100) : null
  }
  return null
}

const normalizeCategory = (value) => String(value || '').trim().toLowerCase()

const detectVariantGender = (variant) => {
  const gender = normalizeCategory(variant?.gender)
  if (gender === 'men' || gender === 'women') return gender

  const name = String(variant?.variant_name || variant?.name || '').toLowerCase()
  if (/(^|\b)(men|male|gentleman|gents)(\b|$)/.test(name)) return 'men'
  if (/(^|\b)(women|female|ladies|lady)(\b|$)/.test(name)) return 'women'
  return 'unisex'
}

const buildServiceDescription = (service) => {
  const description = String(service?.description || '').trim()
  if (description) return description

  const tag = String(service?.specialization_tag || '').replace(/[-_]+/g, ' ').trim()
  if (tag) return `Specialized ${tag} service tailored for your style.`

  return 'Professional salon care personalized to your needs.'
}

const getNameAudienceHints = (service) => {
  const text = `${service?.name || ''} ${service?.specialization_tag || ''}`.toLowerCase()
  const menHint = /(^|\b)(men|male|gentleman|gents|barber|beard|fade)(\b|$)/.test(text)
  const womenHint = /(^|\b)(women|female|ladies|lady)(\b|$)/.test(text)
  return { menHint, womenHint }
}

const normalizeServiceName = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const MEN_EXCLUDED_SERVICE_PATTERNS = [
  /\bregular rebond\b.*\bcellophane\b/,
  /\bpedicure gel\b/,
  /\bpremium rebonding\b/,
  /\bmanicure gel\b/,
  /\bhot oil\b/,
  /\bsemidilino\b/,
  /\bloreal mask treatment\b/,
  /\bhair and makeup\b/,
  /\bhair makeup\b/,
]

const isWomenOnlyServiceByRule = (service) => {
  const normalizedName = normalizeServiceName(service?.name)
  if (!normalizedName) return false
  return MEN_EXCLUDED_SERVICE_PATTERNS.some((pattern) => pattern.test(normalizedName))
}

const deriveServiceCategory = (service, variants) => {
  const explicitCategory = normalizeCategory(service?.category)
  if (['women', 'men', 'nails', 'treatments'].includes(explicitCategory)) return explicitCategory

  const text = `${service?.name || ''} ${service?.specialization_tag || ''}`.toLowerCase()
  if (/(nail|manicure|pedicure|acrylic|gel)/.test(text)) return 'nails'
  if (/(rebond|keratin|treatment|spa|perm|botox|cellophane|therapy|color|relax)/.test(text)) return 'treatments'
  if (/(men|male|gentleman|barber|fade|beard)/.test(text)) return 'men'
  if (/(women|female|ladies|lady)/.test(text)) return 'women'

  const genders = new Set((variants || []).map((variant) => detectVariantGender(variant)))
  if (genders.has('women') && !genders.has('men')) return 'women'
  if (genders.has('men') && !genders.has('women')) return 'men'
  return 'treatments'
}

const deriveServiceAudiences = (service, variants) => {
  if (isWomenOnlyServiceByRule(service)) {
    return { men: false, women: true }
  }

  const genders = new Set((variants || []).map((variant) => variant.gender))
  const hasMen = genders.has('men')
  const hasWomen = genders.has('women')
  const hasUnisex = genders.has('unisex')
  const { menHint, womenHint } = getNameAudienceHints(service)

  if (hasMen || hasWomen) {
    return {
      men: hasMen || hasUnisex,
      women: hasWomen || hasUnisex,
    }
  }

  if (hasUnisex) {
    return {
      men: true,
      women: true,
    }
  }

  if (menHint || womenHint) {
    return {
      men: menHint,
      women: womenHint,
    }
  }

  // Services without explicit gender markers are treated as available to both.
  return { men: true, women: true }
}

const summarizeServicePricing = (service, variants) => {
  const toRangeLabel = (prices = []) => {
    if (!prices.length) return null
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    return minPrice === maxPrice ? currency(minPrice) : `${currency(minPrice)} - ${currency(maxPrice)}`
  }

  const activeVariants = (variants || []).filter((variant) => {
    if (typeof variant?.is_active === 'undefined' || variant?.is_active === null) return true
    return Boolean(variant.is_active)
  })

  const variantPrices = activeVariants
    .map((variant) => ({
      id: variant.id,
      name: variant.variant_name || variant.name || 'Option',
      priceCents: parsePriceCents(variant.price_cents, variant.price),
      durationMinutes: Number(variant.duration_minutes || service?.base_duration || service?.duration_minutes || 0) || null,
      gender: detectVariantGender(variant),
    }))
    .filter((variant) => Number.isFinite(variant.priceCents))

  const basePrice = parsePriceCents(
    service?.base_price_cents ?? service?.price_cents,
    service?.base_price ?? service?.price
  )

  if (variantPrices.length > 1) {
    const allPrices = variantPrices.map((variant) => variant.priceCents)

    const byGender = {
      men: variantPrices.filter((variant) => variant.gender === 'men').map((variant) => variant.priceCents),
      women: variantPrices.filter((variant) => variant.gender === 'women').map((variant) => variant.priceCents),
    }

    const menRange = toRangeLabel(byGender.men)
    const womenRange = toRangeLabel(byGender.women)
    const allRange = toRangeLabel(allPrices)
    const genderLines = []
    if (menRange) genderLines.push(`Men: ${menRange}`)
    if (womenRange) genderLines.push(`Women: ${womenRange}`)

    return {
      variants: variantPrices,
      headline: allRange || 'Price upon consultation',
      sublines: genderLines,
      genderRanges: {
        men: menRange,
        women: womenRange,
      },
      ctaLabel: 'View Options',
    }
  }

  if (variantPrices.length === 1) {
    const singleVariant = variantPrices[0]
    return {
      variants: variantPrices,
      headline: currency(singleVariant.priceCents),
      sublines: [],
      genderRanges: {
        men: singleVariant.gender === 'men' ? currency(singleVariant.priceCents) : null,
        women: singleVariant.gender === 'women' ? currency(singleVariant.priceCents) : null,
      },
      ctaLabel: 'Book Now',
    }
  }

  if (Number.isFinite(basePrice)) {
    return {
      variants: [],
      headline: `Starting at ${currency(basePrice)}`,
      sublines: [],
      genderRanges: {
        men: null,
        women: null,
      },
      ctaLabel: 'Book Now',
    }
  }

  return {
    variants: [],
    headline: 'Price upon consultation',
    sublines: [],
    genderRanges: {
      men: null,
      women: null,
    },
    ctaLabel: 'Book Now',
  }
}

const Home = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const [services, setServices] = useState([])
  const [stylists, setStylists] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const activeServiceCategory = 'all'
  const [isServiceOptionsOpen, setIsServiceOptionsOpen] = useState(false)
  const [optionsService, setOptionsService] = useState(null)
  const [optionsGender, setOptionsGender] = useState('')
  const [selectedOptionVariantId, setSelectedOptionVariantId] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [servicesRes, stylistsRes, ratingsRes] = await Promise.all([
        api.get('/services'),
        api.get('/stylists'),
        api.get('/ratings?paginate=true&per_page=20')
      ])
      setServices(asArray(servicesRes?.data))
      setStylists(asArray(stylistsRes?.data).filter((s) => s?.active))
      
      const ratingsData = ratingsRes?.data?.data || asArray(ratingsRes?.data)
      const positiveReviews = ratingsData.filter(r => r.rating >= 4 && r.comment && r.comment.trim() !== '')
      setReviews(positiveReviews.slice(0, 6))
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

  const preparedServices = useMemo(() => {
    return asArray(services).map((service) => {
      const pricing = summarizeServicePricing(service, service?.variants || [])
      return {
        ...service,
        _category: deriveServiceCategory(service, pricing.variants),
        _audiences: deriveServiceAudiences(service, pricing.variants),
        _description: buildServiceDescription(service),
        _pricing: pricing,
      }
    })
  }, [services])

  const filteredServices = useMemo(() => {
    if (activeServiceCategory === 'all') return preparedServices
    if (activeServiceCategory === 'men' || activeServiceCategory === 'women') {
      return preparedServices.filter((service) => service?._audiences?.[activeServiceCategory])
    }
    return preparedServices.filter((service) => service._category === activeServiceCategory)
  }, [activeServiceCategory, preparedServices])

  const resolveCardPrice = (service) => {
    const pricing = service?._pricing
    if (!pricing) return { headline: 'Price upon consultation', sublines: [] }

    if (activeServiceCategory === 'men' || activeServiceCategory === 'women') {
      const audienceRange = pricing?.genderRanges?.[activeServiceCategory]
      if (audienceRange) {
        return {
          headline: audienceRange,
          sublines: [],
        }
      }
    }

    return {
      headline: pricing.headline,
      sublines: pricing.sublines || [],
    }
  }

  const previewServices = useMemo(() => filteredServices.slice(0, 6), [filteredServices])

  const handleViewAllServices = () => {
    if (activeServiceCategory === 'all') {
      navigate('/services')
      return
    }
    navigate(`/services?category=${encodeURIComponent(activeServiceCategory)}`)
  }

  const modalGenderChoices = useMemo(() => {
    const variants = optionsService?._pricing?.variants || []
    const hasWomen = variants.some((variant) => variant.gender === 'women')
    const hasMen = variants.some((variant) => variant.gender === 'men')
    const choices = []
    if (hasWomen) choices.push('women')
    if (hasMen) choices.push('men')
    return choices
  }, [optionsService])

  const visibleModalVariants = useMemo(() => {
    const variants = optionsService?._pricing?.variants || []
    if (!optionsGender) return variants
    return variants.filter((variant) => variant.gender === optionsGender || variant.gender === 'unisex')
  }, [optionsGender, optionsService])

  const selectedModalVariant = useMemo(() => {
    return visibleModalVariants.find((variant) => String(variant.id) === String(selectedOptionVariantId)) || null
  }, [selectedOptionVariantId, visibleModalVariants])

  useEffect(() => {
    if (!isServiceOptionsOpen) return
    const variantStillVisible = visibleModalVariants.some((variant) => String(variant.id) === String(selectedOptionVariantId))
    if (!variantStillVisible) {
      setSelectedOptionVariantId(visibleModalVariants[0] ? String(visibleModalVariants[0].id) : '')
    }
  }, [isServiceOptionsOpen, selectedOptionVariantId, visibleModalVariants])

  useEffect(() => {
    if (!isServiceOptionsOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isServiceOptionsOpen])

  useEffect(() => {
    if (!isServiceOptionsOpen) return
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeServiceOptions()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isServiceOptionsOpen])

  const closeServiceOptions = () => {
    setIsServiceOptionsOpen(false)
    setOptionsService(null)
    setOptionsGender('')
    setSelectedOptionVariantId('')
  }

  const openServiceOptions = (service) => {
    if (!service?._pricing) return

    if (service._pricing.variants.length <= 1) {
      const singleVariant = service._pricing.variants[0]
      const variantQuery = singleVariant ? `&variant_id=${singleVariant.id}` : ''
      navigate(`/book?fresh=1&services=${service.id}${variantQuery}`)
      return
    }

    setOptionsService(service)
    setIsServiceOptionsOpen(true)
    const genders = service._pricing.variants.reduce((acc, variant) => {
      if (variant.gender === 'women' && !acc.includes('women')) acc.push('women')
      if (variant.gender === 'men' && !acc.includes('men')) acc.push('men')
      return acc
    }, [])
    const preferredGender = (activeServiceCategory === 'men' || activeServiceCategory === 'women')
      ? activeServiceCategory
      : ''
    const initialGender = preferredGender && genders.includes(preferredGender)
      ? preferredGender
      : (genders[0] || '')
    setOptionsGender(initialGender)
    const initialVariants = initialGender
      ? service._pricing.variants.filter((variant) => variant.gender === initialGender || variant.gender === 'unisex')
      : service._pricing.variants
    setSelectedOptionVariantId(initialVariants[0] ? String(initialVariants[0].id) : '')
  }

  const handleContinueBooking = () => {
    if (!optionsService) return
    const variantQuery = selectedModalVariant ? `&variant_id=${selectedModalVariant.id}` : ''
    navigate(`/book?fresh=1&services=${optionsService.id}${variantQuery}`)
    closeServiceOptions()
  }

  const handleManageBooking = () => {
    setMobileMenuOpen(false)
    navigate('/customer')
  }

  const heroBackgroundImage = `url(${imageUrl('hero-salon-interior.png')})`

  return (
    <div className="min-h-screen bg-[#f4edff] text-[#2f245a]">
      <header
        className="home-hero text-white"
        style={{ '--hero-bg-image': heroBackgroundImage }}
      >
        <div className="home-hero__media" aria-hidden="true"></div>
        <div className="home-hero__overlay" aria-hidden="true"></div>

        <nav className="home-hero__nav relative z-20 w-full px-4 md:px-8 lg:px-12 pt-5 pb-3">
          <div className="home-hero__nav-shell flex items-center justify-between gap-3">
            <button
              onClick={() => navigate('/')}
              className="home-hero__brand inline-flex items-center gap-2 sm:gap-3 text-lg sm:text-2xl md:text-[2rem] font-semibold tracking-tight hover:opacity-95 transition min-w-0"
            >
              <span className="home-hero__brand-mark h-12 w-12 md:h-14 md:w-14 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="Kaye's Hair Salon logo" className="h-10 w-10 md:h-12 md:w-12 object-contain" />
              </span>
              <span className="truncate">Kaye&apos;s Hair Salon and Spa</span>
            </button>

            <div className="hidden md:flex items-center gap-7 text-lg">
              <button onClick={() => scrollToSection('services')} className="home-hero__link transition">Our Services</button>
              <button onClick={() => scrollToSection('about')} className="home-hero__link transition">About Us</button>
              <button onClick={() => scrollToSection('reviews')} className="home-hero__link transition">Reviews</button>
              <button onClick={() => scrollToSection('contact')} className="home-hero__link transition">Contact</button>
            </div>

            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="home-hero__menu-btn md:hidden px-3 py-2 rounded-xl border border-white/35 bg-white/10 hover:bg-white/20"
            >
              Menu
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="home-hero__mobile-menu md:hidden mt-4 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm p-4 space-y-2">
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
                onClick={() => scrollToSection('reviews')}
                className="block w-full text-left py-2 px-2 rounded hover:bg-white/15"
              >
                Reviews
              </button>
              <button
                onClick={() => scrollToSection('contact')}
                className="block w-full text-left py-2 px-2 rounded hover:bg-white/15"
              >
                Contact
              </button>
            </div>
          )}
        </nav>

        <section className="home-hero__content-wrap relative z-20 px-4 md:px-8 pb-14">
          <div className="home-hero__content max-w-4xl mx-auto text-center">
            <h1 className="home-hero__title">
              Book Your Salon Appointment Online
            </h1>
            <p className="home-hero__subtitle">
              Enjoy premium hair, nail, and beauty services with professional stylists.
            </p>
            <div className="home-hero__actions flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/book?fresh=1')}
                className="home-hero__btn home-hero__btn--primary tap-safe"
              >
                Book Appointment
              </button>
              <button
                onClick={handleManageBooking}
                className="home-hero__btn home-hero__btn--secondary tap-safe"
              >
                Manage My Booking
              </button>
            </div>
          </div>
        </section>
      </header>

      <main className="relative z-10 -mt-4">
        <HowToBookSection />

        <section
          id="services"
          className="home-section home-section--services px-4 md:px-8 py-14 md:py-20 bg-[radial-gradient(circle_at_20%_10%,#efe7ff_0%,#f6f1ff_55%,#f3ecff_100%)]"
        >
          <div className="max-w-7xl mx-auto">
            <div className="home-section__intro text-center mb-8 md:mb-10">
              <h2 className="text-[clamp(1.85rem,7vw,3.75rem)] font-semibold mb-4 text-[#2f245a]">Our Services</h2>
              <p className="max-w-3xl mx-auto text-lg md:text-xl text-[#6b5b95]">
                Discover premium salon services with clear pricing and quick options tailored to your needs.
              </p>
            </div>

            {loading ? (
              <div className="text-center py-16 text-[#6b5b95] text-lg">Loading services...</div>
            ) : filteredServices.length === 0 ? (
              <div className="text-center py-16 text-[#6b5b95] text-lg">No services available in this category yet.</div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6">
                  {previewServices.map((service) => {
                  const serviceImage = service.image_url || service.image
                  const cardPrice = resolveCardPrice(service)
                  return (
                    <article
                      key={service.id}
                      className="home-service-card group flex flex-col h-full rounded-3xl border border-[#d8cbff] bg-white shadow-[0_12px_28px_rgba(70,45,130,0.12)] overflow-hidden transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_34px_rgba(70,45,130,0.2)]"
                    >
                      <div className="w-full h-32 sm:h-40 md:h-48 shrink-0 overflow-hidden relative">
                        {serviceImage ? (
                          <img
                            src={imageUrl(serviceImage)}
                            alt={service.name}
                            className="absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:scale-110"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none'
                              const fallback = event.currentTarget.nextSibling
                              if (fallback) fallback.style.display = 'flex'
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-full h-full absolute inset-0 ${serviceImage ? 'hidden' : 'flex'} items-center justify-center bg-[#ede5ff] text-[#6b5b95] text-sm font-medium`}
                        >
                          Service Image
                        </div>
                      </div>

                      <div className="p-3 sm:p-4 md:p-6 flex flex-col flex-1">
                        <h3 className="text-sm sm:text-base md:text-xl font-semibold text-[#2f245a] truncate">{service.name}</h3>
                        <div className="mt-2 md:mt-4 min-h-[56px] md:min-h-[72px]">
                          <p className="text-xs sm:text-sm md:text-lg font-semibold text-[#453493]">{cardPrice.headline}</p>
                          <div className="space-y-1 mt-1">
                            {cardPrice.sublines.slice(0, 2).map((line) => (
                              <p key={`${service.id}-${line}`} className="text-[10px] sm:text-xs text-[#7b6ba8]">
                                {line}
                              </p>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => openServiceOptions(service)}
                          className="mt-auto tap-safe w-full rounded-lg md:rounded-xl bg-gradient-to-r from-[#6f5cff] to-[#4b3bd6] text-white text-xs sm:text-sm md:text-base font-semibold py-2 md:py-2.5 hover:from-[#7f6dff] hover:to-[#5b4ae1] transition"
                        >
                          {service._pricing.ctaLabel}
                        </button>
                      </div>
                    </article>
                  )
                  })}
                </div>

                <div className="text-center mt-8">
                  <button
                    type="button"
                    onClick={handleViewAllServices}
                    className="tap-safe px-8 py-3 rounded-xl border border-[#bca8ff] text-[#4a3ba7] bg-white/85 hover:bg-white transition font-medium"
                  >
                    View All Services
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {isServiceOptionsOpen && optionsService && (
          <div
            className="fixed inset-0 z-[120] bg-[#1f153f]/60 backdrop-blur-[1px] px-4 py-6 md:py-8"
            onClick={closeServiceOptions}
          >
            <div
              className="max-w-3xl mx-auto h-full flex items-center justify-center"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="w-full max-h-[90vh] overflow-y-auto rounded-3xl border border-[#d8cbff] bg-white shadow-[0_20px_42px_rgba(58,40,126,0.28)]">
                <div className="p-5 md:p-6 border-b border-[#eee6ff] flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-semibold text-[#2f245a]">{optionsService.name}</h3>
                    <p className="text-sm text-[#7a6aa7] mt-1">{optionsService._description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeServiceOptions}
                    className="h-10 w-10 rounded-full border border-[#d8cbff] text-[#5a4a89] hover:bg-[#f5f0ff] transition"
                    aria-label="Close service options"
                  >
                    ×
                  </button>
                </div>

                <div className="p-5 md:p-6">
                  <div className="rounded-2xl overflow-hidden border border-[#ece3ff] bg-[#f8f4ff] mb-5">
                    {optionsService.image_url || optionsService.image ? (
                      <img
                        src={imageUrl(optionsService.image_url || optionsService.image)}
                        alt={optionsService.name}
                        className="w-full h-40 object-cover"
                      />
                    ) : (
                      <div className="w-full h-40 flex items-center justify-center text-[#6b5b95] text-sm">
                        Service Image
                      </div>
                    )}
                  </div>

                  {modalGenderChoices.length > 0 && (
                    <div className="mb-5">
                      <p className="text-sm font-medium text-[#4d3f7e] mb-2">Choose gender</p>
                      <div className="flex flex-wrap gap-2">
                        {modalGenderChoices.map((gender) => (
                          <button
                            key={gender}
                            type="button"
                            onClick={() => setOptionsGender(gender)}
                            className={`px-4 py-2 rounded-full border text-sm font-medium transition ${
                              optionsGender === gender
                                ? 'bg-[#6f5cff] border-[#6f5cff] text-white'
                                : 'bg-white border-[#d8cbff] text-[#5a4a89] hover:bg-[#f5f0ff]'
                            }`}
                          >
                            {gender === 'women' ? 'Women' : 'Men'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {visibleModalVariants.map((variant) => {
                      const isSelected = String(variant.id) === String(selectedOptionVariantId)
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => setSelectedOptionVariantId(String(variant.id))}
                          className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                            isSelected
                              ? 'border-[#6f5cff] bg-[#f3f0ff]'
                              : 'border-[#e6dcff] bg-white hover:bg-[#faf7ff]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-[#2f245a] truncate">{variant.name}</p>
                              <p className="text-xs text-[#7b6ba8] mt-1">
                                {variant.durationMinutes ? `${variant.durationMinutes} min` : 'Duration varies'}
                              </p>
                            </div>
                            <p className="font-semibold text-[#3f2f86]">{currency(variant.priceCents)}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t border-[#eee6ff] px-5 md:px-6 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-sm text-[#5a4a89]">
                      <p className="font-medium">Selected option</p>
                      <p>
                        {selectedModalVariant ? `${selectedModalVariant.name} - ${currency(selectedModalVariant.priceCents)}` : 'Please choose a variant'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleContinueBooking}
                      disabled={!selectedModalVariant}
                      className={`tap-safe px-5 py-2.5 rounded-xl font-semibold text-white transition ${
                        selectedModalVariant
                          ? 'bg-gradient-to-r from-[#6f5cff] to-[#4b3bd6] hover:from-[#7f6dff] hover:to-[#5b4ae1]'
                          : 'bg-[#c8bdf3] cursor-not-allowed'
                      }`}
                    >
                      Continue Booking
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {reviews.length > 0 && (
          <section id="reviews" className="home-section px-4 md:px-8 py-10 md:py-16 bg-[#faf7ff]">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-3xl md:text-5xl font-semibold text-[#2f245a] mb-4">What Our Clients Say</h2>
                <p className="text-[#6b5b95] text-lg">Real reviews from our wonderful customers.</p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-white p-6 rounded-2xl shadow-[0_8px_20px_rgba(70,45,130,0.06)] border border-[#ece3ff] flex flex-col h-full">
                    <div className="flex items-center gap-1 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={`text-xl ${star <= review.rating ? 'text-amber-400' : 'text-gray-200'}`}>
                          ★
                        </span>
                      ))}
                    </div>
                    <p className="text-[#5f4f8f] italic flex-1 mb-6">&quot;{review.comment}&quot;</p>
                    <div className="flex items-center gap-3 mt-auto">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#d8ccff] to-[#bca8ff] flex items-center justify-center text-[#4a3ba7] font-bold">
                        {review.customer_name ? review.customer_name.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div>
                        <p className="font-semibold text-[#2f245a] text-sm">{review.customer_name || 'Customer'}</p>
                        <p className="text-xs text-[#8f7ea6]">
                          {new Date(review.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section id="about" className="home-section px-4 md:px-8 py-8 md:py-14 bg-white">
          <div className="max-w-6xl mx-auto rounded-2xl md:rounded-3xl border border-[#e8ddff] bg-[linear-gradient(135deg,#ffffff_0%,#f8f2ff_100%)] p-5 md:p-12">
            <h2 className="text-2xl md:text-5xl font-semibold text-[#2f245a] mb-3 md:mb-4">About Us</h2>
            <div className="space-y-3 md:space-y-4 text-sm md:text-xl text-[#5f4f8f] leading-relaxed">
              <p>
                Kaye&apos;s Hair Salon and Spa is dedicated to helping every client feel confident, refreshed, and cared for
                through modern beauty services delivered with consistency and professionalism. From hair styling and color
                treatments to nail care and personalized salon services, we focus on creating results that match your
                lifestyle while making each visit comfortable, clean, and relaxing from start to finish.
              </p>
              <p>
                Our team values quality products, attentive service, and a welcoming experience for every customer who
                walks through our doors. Whether you are preparing for a special occasion or simply taking time for routine
                self-care, we aim to provide reliable salon care, thoughtful recommendations, and a smooth booking
                experience that makes it easy to return with confidence.
              </p>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter onScrollToSection={scrollToSection} />
    </div>
  )
}

export default Home

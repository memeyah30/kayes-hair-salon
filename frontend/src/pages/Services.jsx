import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../utils/api'
import { resolveAssetUrl } from '../utils/runtime'

const AUDIENCE_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'men', label: 'Men' },
  { key: 'women', label: 'Women' },
]

const currency = (cents) => `PHP ${(Number(cents || 0) / 100).toFixed(2)}`

const imageUrl = (path) => {
  return resolveAssetUrl(path)
}

const normalizeText = (value) => String(value || '').trim().toLowerCase()

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

const detectVariantGender = (variant) => {
  const explicitGender = normalizeText(variant?.gender)
  if (explicitGender === 'men' || explicitGender === 'women') return explicitGender

  const name = normalizeText(variant?.variant_name || variant?.name)
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

const deriveServiceAudiences = (service, variants) => {
  if (isWomenOnlyServiceByRule(service)) {
    return { men: false, women: true }
  }

  const genders = new Set((variants || []).map((variant) => variant.gender))
  const hasMen = genders.has('men')
  const hasWomen = genders.has('women')
  const hasUnisex = genders.has('unisex')

  const { menHint, womenHint } = getNameAudienceHints(service)

  // Audience rules:
  // - Explicit gender variants are honored.
  // - Unisex options are available to both audiences.
  // - Services with no gender signal default to both audiences.
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

  return {
    men: true,
    women: true,
  }
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
    const menPrices = variantPrices.filter((variant) => variant.gender === 'men').map((variant) => variant.priceCents)
    const womenPrices = variantPrices.filter((variant) => variant.gender === 'women').map((variant) => variant.priceCents)

    const menRange = toRangeLabel(menPrices)
    const womenRange = toRangeLabel(womenPrices)
    const allRange = toRangeLabel(allPrices)

    const sublines = []
    if (menRange) sublines.push(`Men: ${menRange}`)
    if (womenRange) sublines.push(`Women: ${womenRange}`)

    return {
      variants: variantPrices,
      headline: allRange || 'Price upon consultation',
      sublines,
      genderRanges: {
        men: menRange,
        women: womenRange,
      },
      ctaLabel: 'View Options',
    }
  }

  if (variantPrices.length === 1) {
    const variant = variantPrices[0]
    const exact = currency(variant.priceCents)
    return {
      variants: variantPrices,
      headline: exact,
      sublines: [],
      genderRanges: {
        men: variant.gender === 'men' ? exact : null,
        women: variant.gender === 'women' ? exact : null,
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

const Services = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeAudience, setActiveAudience] = useState('all')
  const [isOptionsOpen, setIsOptionsOpen] = useState(false)
  const [optionsService, setOptionsService] = useState(null)
  const [optionsGender, setOptionsGender] = useState('')
  const [selectedVariantId, setSelectedVariantId] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const audience = (params.get('category') || 'all').toLowerCase()
    const allowed = new Set(AUDIENCE_OPTIONS.map((item) => item.key))
    setActiveAudience(allowed.has(audience) ? audience : 'all')
  }, [location.search])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const response = await api.get('/services')
        setServices(response.data || [])
      } catch (error) {
        toast.error(`Failed to load services: ${error.message || 'Please try again.'}`)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const preparedServices = useMemo(() => {
    return (services || []).map((service) => {
      const variants = (service?.variants || []).map((variant) => ({
        ...variant,
        gender: detectVariantGender(variant),
      }))
      const pricing = summarizeServicePricing(service, variants)
      return {
        ...service,
        _description: buildServiceDescription(service),
        _audiences: deriveServiceAudiences(service, variants),
        _pricing: pricing,
      }
    })
  }, [services])

  const filteredServices = useMemo(() => {
    if (activeAudience === 'all') return preparedServices
    return preparedServices.filter((service) => service?._audiences?.[activeAudience])
  }, [activeAudience, preparedServices])

  const resolveCardPrice = (service) => {
    if (!service?._pricing) return { headline: 'Price upon consultation', sublines: [] }

    if (activeAudience === 'men' || activeAudience === 'women') {
      const audienceRange = service._pricing?.genderRanges?.[activeAudience]
      if (audienceRange) {
        return { headline: audienceRange, sublines: [] }
      }
    }

    return {
      headline: service._pricing.headline,
      sublines: service._pricing.sublines || [],
    }
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
    return visibleModalVariants.find((variant) => String(variant.id) === String(selectedVariantId)) || null
  }, [selectedVariantId, visibleModalVariants])

  useEffect(() => {
    if (!isOptionsOpen) return
    const exists = visibleModalVariants.some((variant) => String(variant.id) === String(selectedVariantId))
    if (!exists) {
      setSelectedVariantId(visibleModalVariants[0] ? String(visibleModalVariants[0].id) : '')
    }
  }, [isOptionsOpen, selectedVariantId, visibleModalVariants])

  useEffect(() => {
    if (!isOptionsOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOptionsOpen])

  const closeOptions = () => {
    setIsOptionsOpen(false)
    setOptionsService(null)
    setOptionsGender('')
    setSelectedVariantId('')
  }

  const handleAudienceChange = (nextAudience) => {
    setActiveAudience(nextAudience)
    const params = new URLSearchParams(location.search)
    if (nextAudience === 'all') {
      params.delete('category')
    } else {
      params.set('category', nextAudience)
    }
    const nextSearch = params.toString()
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : '',
      },
      { replace: true }
    )
  }

  const openOptions = (service) => {
    if (!service?._pricing) return

    if (service._pricing.variants.length <= 1) {
      const singleVariant = service._pricing.variants[0]
      const variantQuery = singleVariant ? `&variant_id=${singleVariant.id}` : ''
      navigate(`/book?fresh=1&services=${service.id}${variantQuery}`)
      return
    }

    setOptionsService(service)
    setIsOptionsOpen(true)

    const genders = service._pricing.variants.reduce((acc, variant) => {
      if (variant.gender === 'women' && !acc.includes('women')) acc.push('women')
      if (variant.gender === 'men' && !acc.includes('men')) acc.push('men')
      return acc
    }, [])

    const preferredGender = (activeAudience === 'men' || activeAudience === 'women')
      ? activeAudience
      : ''
    const initialGender = preferredGender && genders.includes(preferredGender)
      ? preferredGender
      : (genders[0] || '')

    setOptionsGender(initialGender)
    const initialVariants = initialGender
      ? service._pricing.variants.filter((variant) => variant.gender === initialGender || variant.gender === 'unisex')
      : service._pricing.variants
    setSelectedVariantId(initialVariants[0] ? String(initialVariants[0].id) : '')
  }

  const continueBooking = () => {
    if (!optionsService) return
    const variantQuery = selectedModalVariant ? `&variant_id=${selectedModalVariant.id}` : ''
    navigate(`/book?fresh=1&services=${optionsService.id}${variantQuery}`)
    closeOptions()
  }

  return (
    <div className="min-h-screen bg-[#f4edff] px-4 md:px-8 py-10">
      <section className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => navigate('/')}
            className="h-10 w-10 rounded-full border border-[#d8cbff] bg-white text-[#4f3ec0] hover:bg-[#f2ecff] transition"
            aria-label="Back to home"
          >
            {'<'}
          </button>
          <h1 className="text-3xl md:text-4xl font-semibold text-[#2f245a]">All Services</h1>
        </div>

        <div className="mb-6 md:mb-8 flex items-center">
          <label className="inline-flex items-center gap-3 text-sm text-[#5c4e89]">
            <span className="font-medium">Show services for:</span>
            <select
              value={activeAudience}
              onChange={(event) => handleAudienceChange(event.target.value)}
              className="bg-white border border-[#d8cbff] rounded-lg px-3 py-2 text-sm text-[#3f3270] focus:outline-none focus:ring-2 focus:ring-[#c8b9ff]"
            >
              {AUDIENCE_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="text-center py-16 text-[#6b5b95] text-lg">Loading services...</div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-16 text-[#6b5b95] text-lg">
            No services available for this selection.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredServices.map((service) => {
              const cardPrice = resolveCardPrice(service)
              const serviceImage = service.image_url || service.image
              return (
                <article
                  key={service.id}
                  className="group h-full rounded-3xl border border-[#d8cbff] bg-white shadow-[0_12px_28px_rgba(70,45,130,0.12)] overflow-hidden transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_34px_rgba(70,45,130,0.2)]"
                >
                  {serviceImage ? (
                    <img
                      src={imageUrl(serviceImage)}
                      alt={service.name}
                      className="w-full h-32 object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none'
                        const fallback = event.currentTarget.nextSibling
                        if (fallback) fallback.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-full h-32 ${serviceImage ? 'hidden' : 'flex'} items-center justify-center bg-[#ede5ff] text-[#6b5b95] text-sm font-medium`}
                  >
                    Service Image
                  </div>

                  <div className="p-6 flex flex-col h-[calc(100%-8rem)]">
                    <h3 className="text-xl font-semibold text-[#2f245a] truncate">{service.name}</h3>
                    <div className="mt-4 min-h-[72px]">
                      <p className="text-lg font-semibold text-[#453493]">{cardPrice.headline}</p>
                      <div className="space-y-1 mt-1">
                        {cardPrice.sublines.slice(0, 2).map((line) => (
                          <p key={`${service.id}-${line}`} className="text-xs text-[#7b6ba8]">
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openOptions(service)}
                      className="mt-auto tap-safe w-full rounded-xl bg-gradient-to-r from-[#6f5cff] to-[#4b3bd6] text-white font-semibold py-2.5 hover:from-[#7f6dff] hover:to-[#5b4ae1] transition"
                    >
                      {service._pricing.ctaLabel}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {isOptionsOpen && optionsService && (
        <div
          className="fixed inset-0 z-[120] bg-[#1f153f]/60 backdrop-blur-[1px] px-4 py-6 md:py-8"
          onClick={closeOptions}
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
                  onClick={closeOptions}
                  className="h-10 w-10 rounded-full border border-[#d8cbff] text-[#5a4a89] hover:bg-[#f5f0ff] transition"
                  aria-label="Close options"
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
                    const isSelected = String(variant.id) === String(selectedVariantId)
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariantId(String(variant.id))}
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
                      {selectedModalVariant
                        ? `${selectedModalVariant.name} - ${currency(selectedModalVariant.priceCents)}`
                        : 'Please choose a variant'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={continueBooking}
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
    </div>
  )
}

export default Services

import { motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

const LandingFooter = ({ onScrollToSection }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const isLandingPage = location.pathname === '/' || location.pathname === '/home'

  const handleHomeClick = () => {
    if (isLandingPage) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    navigate('/')
  }

  const handleServicesClick = () => {
    if (isLandingPage && typeof onScrollToSection === 'function') {
      onScrollToSection('services')
      return
    }

    navigate('/services')
  }

  const handleContactClick = () => {
    if (isLandingPage && typeof onScrollToSection === 'function') {
      onScrollToSection('contact')
      return
    }

    window.location.assign('/#contact')
  }

  return (
    <footer className="relative overflow-hidden bg-[linear-gradient(135deg,#2d1c66_0%,#5935b3_46%,#7d5fdd_100%)] px-4 pb-24 pt-16 text-[#efe9ff] md:px-8 md:pb-8 md:pt-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),rgba(255,255,255,0)_62%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 bottom-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0)_72%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 top-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(205,188,255,0.25)_0%,rgba(205,188,255,0)_72%)]"
      />

      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.div
          className="grid gap-8 rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.06)_100%)] px-6 py-8 shadow-[0_22px_44px_rgba(24,10,70,0.22)] backdrop-blur-md md:grid-cols-3 md:px-10"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d9ccff]">Salon</p>
            <h3 className="mt-4 text-2xl font-semibold text-white">Kaye&apos;s Hair Salon and Spa</h3>
            <p className="mt-4 max-w-sm text-sm leading-7 text-[#e8dcff]">
              Professional salon care with a modern booking experience designed to make every visit smooth and stress-free.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d9ccff]">Quick Links</p>
            <div className="mt-4 flex flex-col gap-3 text-sm text-[#efe9ff]">
              <button
                type="button"
                onClick={handleHomeClick}
                className="w-fit rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white hover:shadow-[0_0_0_4px_rgba(255,255,255,0.08)]"
              >
                Home
              </button>
              <button
                type="button"
                onClick={handleServicesClick}
                className="w-fit rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white hover:shadow-[0_0_0_4px_rgba(255,255,255,0.08)]"
              >
                Services
              </button>
              <button
                type="button"
                onClick={handleContactClick}
                className="w-fit rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white hover:shadow-[0_0_0_4px_rgba(255,255,255,0.08)]"
              >
                Contact
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d9ccff]">Contact Info</p>
            <div className="mt-4 space-y-4 text-sm leading-7 text-[#efe9ff]">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-white">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s6.5-5.4 6.5-11A6.5 6.5 0 1 0 5.5 10c0 5.6 6.5 11 6.5 11Z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                </span>
                <span>Governor Perdices Street, Dumaguete City, Philippines, 6200</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-white">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 4.5h3l1.4 4.1-2 1.8a16 16 0 0 0 6.2 6.2l1.8-2 4.1 1.4v3A1.5 1.5 0 0 1 18 20.5 14.5 14.5 0 0 1 3.5 6 1.5 1.5 0 0 1 5 4.5Z" />
                  </svg>
                </span>
                <span>0975 984 0208</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-white">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="m5.5 7.5 6.5 5 6.5-5" />
                  </svg>
                </span>
                <span>managerkaye@gmail.com</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="mt-8 border-t border-white/12 pt-6 text-center text-sm text-[#ddceff]"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
        >
          &copy; 2026 Kaye&apos;s Hair Salon and Spa. All rights reserved.
        </motion.div>
      </div>
    </footer>
  )
}

export default LandingFooter

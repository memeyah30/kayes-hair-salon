import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const bookingSteps = [
  {
    step: '01',
    title: 'Click "Book Now" or Select a Service',
    description: 'Customer starts booking from the landing page.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 4h10l-3 5h4L9 20l2-7H7l4-9Z" />
      </svg>
    ),
  },
  {
    step: '02',
    title: 'Enter Information',
    description: 'Enter name, contact number, email, and address.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="3.2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 19c0-3.1 3-5.5 7-5.5s7 2.4 7 5.5" />
      </svg>
    ),
  },
  {
    step: '03',
    title: 'Select Service(s)',
    description: 'Choose desired salon services.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 5l5 5M18 5l-7 7m0 0-3 7 7-3m-4-4 4 4" />
      </svg>
    ),
  },
  {
    step: '04',
    title: 'Choose Date and Time',
    description: 'Select available schedule.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8">
        <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v4M16 3v4M3.5 9.5h17" />
      </svg>
    ),
  },
  {
    step: '05',
    title: 'Confirm Booking',
    description: 'Review details and submit appointment.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4.2 4.2L19 6.5" />
      </svg>
    ),
  },
  {
    step: '06',
    title: 'Receive Booking Confirmation',
    description: 'System generates receipt or confirmation.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 3.5V8h4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 15.5h4.5" />
      </svg>
    ),
  },
]

const easeOut = [0.22, 1, 0.36, 1]

const cardStagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.08,
    },
  },
}

const HowToBookSection = () => {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()

  const fadeUp = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 28 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: easeOut,
      },
    },
  }

  const cardReveal = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 34,
      scale: shouldReduceMotion ? 1 : 0.97,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.58,
        ease: easeOut,
      },
    },
  }

  return (
    <section
      id="how-to-book"
      className="home-section relative overflow-hidden bg-[linear-gradient(180deg,#f7f2ff_0%,#efe6ff_52%,#f7f2ff_100%)] px-4 py-8 md:px-8 md:py-10"
    >
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          aria-hidden="true"
          className="absolute left-[-5rem] top-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(145,118,255,0.18)_0%,rgba(145,118,255,0)_72%)] blur-sm"
          animate={
            shouldReduceMotion
              ? undefined
              : { x: [0, 22, 0], y: [0, -16, 0], scale: [1, 1.12, 1] }
          }
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute right-[-4rem] top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(110,86,225,0.16)_0%,rgba(110,86,225,0)_70%)] blur-sm"
          animate={
            shouldReduceMotion
              ? undefined
              : { x: [0, -18, 0], y: [0, 20, 0], scale: [1, 1.08, 1] }
          }
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        />
      </div>

      <div className="max-w-6xl mx-auto">
        <motion.div
          className="home-section__intro mx-auto max-w-xl text-center"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <span className="inline-flex items-center rounded-full border border-[#d7c8ff] bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6c55c5] shadow-[0_8px_18px_rgba(84,57,170,0.08)]">
            How To Book
          </span>
          <h2 className="mt-3 text-[clamp(1.45rem,4vw,2.4rem)] font-semibold tracking-tight text-[#2f245a]">
            Book your appointment in six simple steps
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#6b5b95] md:text-base">
            A quick guide for customers so the booking process feels easy, clear, and smooth from start to finish.
          </p>
        </motion.div>

        <div className="relative mt-6">
          <motion.div
            aria-hidden="true"
            className="absolute left-1/2 top-[3.65rem] hidden h-px w-[82%] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#ccb8ff] to-transparent xl:block"
            initial={shouldReduceMotion ? false : { opacity: 0.4, scaleX: 0.5 }}
            whileInView={shouldReduceMotion ? undefined : { opacity: 1, scaleX: 1 }}
            viewport={{ once: true, amount: 0.7 }}
            transition={{ duration: 0.9, ease: easeOut }}
          />

          <motion.div
            className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-3"
            variants={cardStagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.18 }}
          >
            {bookingSteps.map((item, index) => (
              <motion.article
                key={item.step}
                variants={cardReveal}
                whileHover={
                  shouldReduceMotion
                    ? undefined
                    : {
                        y: -10,
                        scale: 1.015,
                        transition: { duration: 0.26, ease: 'easeOut' },
                      }
                }
                className="group relative overflow-hidden rounded-[20px] border border-[#dcccff] bg-white/88 p-3 shadow-[0_10px_24px_rgba(71,46,137,0.08)] backdrop-blur-sm transition duration-300 hover:border-[#c6b3ff] hover:shadow-[0_16px_30px_rgba(71,46,137,0.14)] md:p-4"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#8b74ff] via-[#6d54df] to-[#4b3bd6]" />
                <motion.div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[radial-gradient(circle,rgba(139,116,255,0.22)_0%,rgba(139,116,255,0)_70%)] transition duration-500 group-hover:scale-125"
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : { scale: [1, 1.18, 1], opacity: [0.4, 0.75, 0.4] }
                  }
                  transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: index * 0.22 }}
                />

                <div className="flex items-start justify-between gap-1 sm:gap-4">
                  <motion.span
                    className="inline-flex rounded-full bg-[#f1ebff] px-2 sm:px-2.5 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-semibold tracking-[0.18em] text-[#6c55c5]"
                    whileHover={shouldReduceMotion ? undefined : { x: 2 }}
                  >
                    STEP {item.step}
                  </motion.span>
                  <motion.span
                    className="flex h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-lg sm:rounded-xl md:rounded-2xl bg-[linear-gradient(135deg,#785fff_0%,#5740d8_100%)] text-white shadow-[0_10px_18px_rgba(66,42,150,0.22)] transition duration-300 group-hover:shadow-[0_14px_24px_rgba(66,42,150,0.28)] [&>svg]:h-3 [&>svg]:w-3 [&>svg]:sm:h-3.5 [&>svg]:sm:w-3.5 [&>svg]:md:h-4.5 [&>svg]:md:w-4.5"
                    animate={
                      shouldReduceMotion
                        ? undefined
                        : {
                            y: [0, -3, 0],
                            scale: [1, 1.05, 1],
                          }
                    }
                    transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: index * 0.18 }}
                    whileHover={shouldReduceMotion ? undefined : { rotate: -8, scale: 1.08 }}
                  >
                    {item.icon}
                  </motion.span>
                </div>

                <div className="mt-2.5 md:mt-3 flex items-center gap-2">
                  <div className="text-2xl md:text-[1.7rem] font-semibold tracking-tight text-[#3f2f86]/15">
                    {index + 1}
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-[#d9ccff] to-transparent" />
                </div>

                <h3 className="mt-2 md:mt-3 text-[0.8rem] sm:text-[0.95rem] md:text-[1.05rem] font-semibold leading-tight sm:leading-5 md:leading-6 text-[#2f245a]">
                  {item.title}
                </h3>
                <p className="mt-1 md:mt-1.5 text-[0.65rem] sm:text-xs md:text-[13px] leading-[1.1rem] sm:leading-4 md:leading-5 text-[#70618f]">
                  {item.description}
                </p>
              </motion.article>
            ))}
          </motion.div>
        </div>

        <motion.div
          className="mt-6 flex justify-center"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
        >
          <motion.button
            type="button"
            onClick={() => navigate('/book')}
            className="tap-safe inline-flex items-center justify-center rounded-full border border-[#d7c8ff] bg-white px-7 py-2.5 text-sm font-semibold text-[#5b42c7] shadow-[0_12px_24px_rgba(83,58,170,0.14)] transition duration-300 hover:border-[#c0abff] hover:text-[#4c35bc] hover:shadow-[0_0_0_6px_rgba(120,95,220,0.14),0_16px_24px_rgba(83,58,170,0.18)]"
            whileHover={
              shouldReduceMotion
                ? undefined
                : {
                    y: -4,
                    scale: 1.02,
                    transition: { duration: 0.22, ease: 'easeOut' },
                  }
            }
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
          >
            Book Appointment
          </motion.button>
        </motion.div>
      </div>
    </section>
  )
}

export default HowToBookSection

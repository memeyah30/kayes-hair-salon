import { motion, AnimatePresence } from 'framer-motion'

const Loader = ({ isLoading }) => {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
          }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#f8fafc]"
        >
          {/* Background Decorative Elements */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute h-[500px] w-[500px] rounded-full bg-gradient-to-r from-[#8ea3f1]/10 to-[#6c84dc]/10 blur-[100px]"
          />

          <div className="relative flex flex-col items-center">
            {/* Logo Container */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative mb-8"
            >
              {/* Pulsing ring */}
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-[-15px] rounded-full border-2 border-[#7d95e8]/30"
              />
              
              <div className="relative h-28 w-28 overflow-hidden rounded-full bg-white p-2 shadow-2xl">
                <img
                  src="/logo-transparent.png"
                  alt="Kaye's Salon Logo"
                  className="h-full w-full object-contain"
                  onError={(e) => { e.target.src = '/logo.png' }}
                />
              </div>
            </motion.div>

            {/* Salon Name */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-center"
            >
              <h1 className="text-2xl font-bold tracking-tight text-[#394667]">
                Kaye&apos;s Hair Salon and Spa
              </h1>
              <div className="mt-2 flex justify-center gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      scale: [1, 1.5, 1],
                      opacity: [0.3, 1, 0.3]
                    }}
                    transition={{ 
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2
                    }}
                    className="h-1.5 w-1.5 rounded-full bg-[#7d95e8]"
                  />
                ))}
              </div>
            </motion.div>
          </div>

          {/* Bottom Branding */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 1, duration: 1 }}
            className="absolute bottom-8 text-xs font-semibold uppercase tracking-[0.3em] text-[#6f7ea5]"
          >
            Professional Care & Beauty
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default Loader

import { motion, AnimatePresence } from 'framer-motion'

const Loader = ({ isLoading }) => {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            transition: { duration: 0.5 }
          }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center backdrop-blur-md bg-white/10"
        >
          <div className="relative flex flex-col items-center">
            {/* Logo Container */}
            <motion.div
              className="relative"
            >
              {/* Pulsing ring */}
              <motion.div
                animate={{ 
                  scale: [1, 1.4, 1],
                  opacity: [0.2, 0.5, 0.2]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-[-20px] rounded-full border-2 border-[#7d95e8]/40"
              />
              
              <motion.div 
                animate={{ 
                  scale: [1, 1.05, 1],
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="relative h-24 w-24 overflow-hidden rounded-full bg-white p-2 shadow-2xl"
              >
                <img
                  src="/logo-transparent.png"
                  alt="Kaye's Salon Logo"
                  className="h-full w-full object-contain"
                  onError={(e) => { e.target.src = '/logo.png' }}
                />
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default Loader

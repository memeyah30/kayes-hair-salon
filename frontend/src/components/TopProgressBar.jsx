import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Utility to trigger the progress bar from anywhere
export const progressBar = {
  start: () => window.dispatchEvent(new CustomEvent('top-bar-start')),
  finish: () => window.dispatchEvent(new CustomEvent('top-bar-finish'))
}

const TopProgressBar = () => {
  const [active, setActive] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let interval
    
    const handleStart = () => {
      setActive(true)
      setProgress(10)
      
      // Mimic progress
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev
          return prev + (100 - prev) * 0.1
        })
      }, 300)
    }

    const handleFinish = () => {
      setProgress(100)
      setTimeout(() => {
        setActive(false)
        setProgress(0)
      }, 400)
      if (interval) clearInterval(interval)
    }

    window.addEventListener('top-bar-start', handleStart)
    window.addEventListener('top-bar-finish', handleFinish)

    return () => {
      window.removeEventListener('top-bar-start', handleStart)
      window.removeEventListener('top-bar-finish', handleFinish)
      if (interval) clearInterval(interval)
    }
  }, [])

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed left-0 right-0 top-0 z-[10000] h-[3px] bg-transparent"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-[#7d95e8] via-[#8ea3f1] to-[#6c84dc] shadow-[0_0_10px_rgba(125,149,232,0.5)]"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", damping: 20, stiffness: 100 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default TopProgressBar

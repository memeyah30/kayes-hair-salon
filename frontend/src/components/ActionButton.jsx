import { forwardRef } from 'react'

const joinClasses = (...classes) => classes.filter(Boolean).join(' ')

const toneClasses = {
  neutral: 'border-[#eadfd5] bg-white/90 text-[#5f4a40] hover:border-[#d7c6bb] hover:bg-[#fcf7f3]',
  primary: 'border-[#cdbcf6] bg-[#f5f0ff] text-[#6b46dc] hover:border-[#b7a0f2] hover:bg-[#eee5ff]',
  success: 'border-[#b9ebcb] bg-[#effcf4] text-[#15803d] hover:border-[#96dcb0] hover:bg-[#e2f8ea]',
  warning: 'border-[#f1d6a4] bg-[#fff7e6] text-[#b86912] hover:border-[#e7c57e] hover:bg-[#ffefcc]',
  danger: 'border-[#f3cad1] bg-[#fff1f4] text-[#c2415d] hover:border-[#ecb0bc] hover:bg-[#ffe5eb]',
}

const sizeClasses = {
  default: 'px-4 py-2.5 text-xs',
  compact: 'px-3 py-2 text-[11px]',
}

export const actionButtonClasses = ({ tone = 'neutral', size = 'default', block = false } = {}) =>
  joinClasses(
    'tap-safe inline-flex items-center justify-center gap-2 rounded-full border font-semibold tracking-[0.02em] shadow-[0_12px_26px_rgba(44,19,56,0.08)] transition duration-200 hover:-translate-y-px',
    'disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none',
    sizeClasses[size] || sizeClasses.default,
    toneClasses[tone] || toneClasses.neutral,
    block ? 'w-full' : '',
  )

export const actionGroupClasses = ({ stack = false, align = 'start' } = {}) =>
  joinClasses(
    'flex flex-wrap gap-2',
    stack ? 'flex-col items-stretch' : 'items-center',
    align === 'end' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start',
  )

export const ActionGroup = ({ children, className = '', stack = false, align = 'start' }) => (
  <div className={joinClasses(actionGroupClasses({ stack, align }), className)}>
    {children}
  </div>
)

const ActionButton = forwardRef(function ActionButton(
  { children, className = '', tone = 'neutral', size = 'default', block = false, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={joinClasses(actionButtonClasses({ tone, size, block }), className)}
      {...props}
    >
      {children}
    </button>
  )
})

export default ActionButton

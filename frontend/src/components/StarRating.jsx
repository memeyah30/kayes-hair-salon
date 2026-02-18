const StarRating = ({ value, onChange, label = 'Rating' }) => {
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium text-gray-700">{label}</div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const active = star <= value
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              className={`text-2xl leading-none transition ${
                active ? 'text-amber-500' : 'text-gray-300 hover:text-amber-300'
              }`}
              aria-label={`${label} ${star} star${star > 1 ? 's' : ''}`}
              title={`${star} star${star > 1 ? 's' : ''}`}
            >
              ★
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default StarRating


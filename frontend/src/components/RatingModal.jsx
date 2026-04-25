import { useState } from 'react'
import StarRating from './StarRating'

const RatingModal = ({ open, appointment, onClose, onSubmit, submitting = false }) => {
  const [serviceRating, setServiceRating] = useState(0)
  const [stylistRating, setStylistRating] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')

  if (!open || !appointment) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (serviceRating < 1 || stylistRating < 1) {
      setError('Please provide both service and stylist ratings.')
      return
    }

    await onSubmit({
      service_rating: serviceRating,
      stylist_rating: stylistRating,
      comment: comment.trim() || null,
    })

    setServiceRating(0)
    setStylistRating(0)
    setComment('')
    setError('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-[#eadfd5] bg-white p-5 shadow-[0_16px_32px_rgba(92,64,51,0.18)]">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#3b2f2a]">Rate Appointment</h3>
            <p className="text-sm text-[#8f7a6f]">{appointment.service_name} with {appointment.stylist_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-[#8f7a6f] hover:bg-[#f7f1ec]"
            disabled={submitting}
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <StarRating
            value={serviceRating}
            onChange={setServiceRating}
            label="Service Rating"
          />

          <StarRating
            value={stylistRating}
            onChange={setStylistRating}
            label="Stylist Rating"
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Comment (optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="Share your experience..."
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Submit Rating'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default RatingModal

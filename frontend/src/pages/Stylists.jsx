import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../utils/api'
import { resolveAssetUrl } from '../utils/runtime'
import './Stylists.css'

const imageUrl = (path) => {
  return resolveAssetUrl(path)
}

const Stylists = () => {
  const navigate = useNavigate()
  const [stylists, setStylists] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    refreshData()
  }, [])

  const refreshData = async () => {
    try {
      setLoading(true)
      const res = await api.get('/stylists')
      setStylists(res.data || [])
    } catch (e) {
      console.error('API Error:', e)
      toast.error(`Failed to load data from API: ${e.message || 'Check console for details'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="stylists-page">
      <section className="stylists-shell">
        <div className="stylists-header">
          <button
            onClick={() => navigate('/')}
            className="stylists-back"
            aria-label="Back to home"
          >
            {'<'}
          </button>
          <h1 className="stylists-title">Stylists</h1>
        </div>

        {loading ? (
          <div className="stylists-empty">Loading stylists...</div>
        ) : stylists.length === 0 ? (
          <div className="stylists-empty">No stylists yet.</div>
        ) : (
          <div className="stylist-grid">
            {stylists.map((stylist) => (
              <article key={stylist.id} className="stylist-card">
                <div className="image-container">
                  {stylist.image ? (
                    <img
                      src={imageUrl(stylist.image)}
                      alt={stylist.name}
                      onError={(event) => {
                        event.currentTarget.style.display = 'none'
                        const fallback = event.currentTarget.nextSibling
                        if (fallback) fallback.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <div className={`image-placeholder ${stylist.image ? 'hidden' : ''}`}>
                    No Image Available
                  </div>
                </div>

                <div className="stylist-card-body">
                  <h2 className="stylist-name">{stylist.name}</h2>

                  <div className="stylist-meta">
                    <p>
                      <span>Email:</span> {stylist.email || 'Not provided'}
                    </p>
                    <p>
                      <span>Phone:</span> {stylist.phone || 'Not provided'}
                    </p>
                  </div>

                  <div className="stylist-status-row">
                    <span className={`status-badge ${stylist.active ? 'active' : 'inactive'}`}>
                      {stylist.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {stylist.active && (
                    <button
                      onClick={() => navigate(`/book?fresh=1&stylist=${stylist.id}`)}
                      className="book-btn"
                    >
                      Book with {stylist.name}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Stylists

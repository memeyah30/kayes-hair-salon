import api from '../utils/api'

export const createStaff = (payload) => {
  const config = payload instanceof FormData
    ? { headers: { 'Content-Type': 'multipart/form-data' } }
    : undefined

  return api.post('/manager/staff', payload, config)
}

export const getManagerStaff = () => api.get('/manager/staff')

export const getPendingStaff = () => api.get('/admin/staff/pending')

export const approveStaff = (id) => api.patch(`/admin/staff/${id}/approve`)

export const rejectStaff = (id, reason) => api.patch(`/admin/staff/${id}/reject`, {
  rejected_reason: reason,
})

export const getStylists = () => api.get('/api/stylists')

export default {
  createStaff,
  getManagerStaff,
  getPendingStaff,
  approveStaff,
  rejectStaff,
  getStylists,
}


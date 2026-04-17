import api from '../utils/api'

const adminRequestConfig = {
  headers: { 'X-User-Type': 'admin' },
  params: { type: 'admin' },
}

const managerRequestConfig = {
  headers: { 'X-User-Type': 'manager' },
  params: { type: 'manager' },
}

export const createStaff = (payload) => {
  const config = payload instanceof FormData
    ? {
        ...managerRequestConfig,
        headers: {
          ...managerRequestConfig.headers,
          'Content-Type': 'multipart/form-data',
        },
      }
    : managerRequestConfig

  return api.post('/manager/staff', payload, config)
}

export const getManagerStaff = () => api.get('/manager/staff', managerRequestConfig)

export const getPendingStaff = () => api.get('/admin/staff/pending', adminRequestConfig)

export const approveStaff = (id) => api.patch(`/admin/staff/${id}/approve`, {}, adminRequestConfig)

export const rejectStaff = (id, reason) => api.patch(`/admin/staff/${id}/reject`, {
  rejected_reason: reason,
}, adminRequestConfig)

export const getStylists = () => api.get('/stylists')

export default {
  createStaff,
  getManagerStaff,
  getPendingStaff,
  approveStaff,
  rejectStaff,
  getStylists,
}

import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './App.css'
import ProtectedRoute from './components/ProtectedRoute'
import ScrollToTop from './components/ScrollToTop'
import Login from './pages/Login'
import Home from './pages/Home'
import BookAppointment from './pages/BookAppointment'
import Services from './pages/Services'
import AdminDashboard from './pages/AdminDashboard'
import CustomerDashboard from './pages/CustomerDashboard'
import ManageServices from './pages/ManageServices'
import AdminAppointments from './pages/admin/AdminAppointments'
import AdminCustomers from './pages/admin/AdminCustomers'
import AdminRatings from './pages/admin/AdminRatings'
import ManageHolidays from './pages/admin/ManageHolidays'
import ManagePaymentAccounts from './pages/admin/ManagePaymentAccounts'

import SalesMonitoring from './pages/admin/SalesMonitoring'
import AdminManagers from './pages/admin/AdminManagers'
import ManageBookingEmail from './pages/ManageBookingEmail'
import VerifyOtp from './pages/VerifyOtp'
import Loader from './components/Loader'
import { useState, useEffect } from 'react'

const App = () => {
  const [initialLoading, setInitialLoading] = useState(true)
  const [pageLoading, setPageLoading] = useState(false)
  const [apiLoading, setApiLoading] = useState(false)
  const location = useLocation()

  useEffect(() => {
    // Initial load timer
    const timer = setTimeout(() => {
      setInitialLoading(false)
    }, 1500)

    // Global API loading listener with debounce to prevent flickering
    let loadingTimer
    const handleStart = () => {
      clearTimeout(loadingTimer)
      loadingTimer = setTimeout(() => {
        setApiLoading(true)
      }, 400) // Only show if loading takes more than 400ms
    }

    const handleFinish = () => {
      clearTimeout(loadingTimer)
      setApiLoading(false)
    }

    window.addEventListener('global-loading-start', handleStart)
    window.addEventListener('global-loading-finish', handleFinish)

    return () => {
      clearTimeout(timer)
      clearTimeout(loadingTimer)
      window.removeEventListener('global-loading-start', handleStart)
      window.removeEventListener('global-loading-finish', handleFinish)
    }
  }, [])

  // Show loader on route change
  useEffect(() => {
    setPageLoading(true)
    const timer = setTimeout(() => {
      setPageLoading(false)
    }, 800) // Brief loader for page transitions

    return () => clearTimeout(timer)
  }, [location.pathname])

  return (
    <>
      <Loader isLoading={initialLoading || pageLoading || apiLoading} />
      <ScrollToTop />
      <Routes>
        {/* Public landing page */}
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        
        {/* Public login routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/login/admin" element={<Login userType="admin" />} />
        <Route path="/login/manager" element={<Login userType="manager" />} />
        
        {/* Customer manage-booking routes (public OTP flow) */}
        <Route path="/my-appointments" element={<Navigate to="/" replace />} />
        <Route path="/manage-booking" element={<Navigate to="/" replace />} />
        <Route path="/manage-booking/start" element={<ManageBookingEmail />} />
        <Route path="/manage-booking/verify" element={<VerifyOtp />} />
        <Route path="/manage-booking/dashboard" element={<Navigate to="/customer" replace />} />
        <Route path="/customer/dashboard" element={<Navigate to="/customer" replace />} />

        {/* Customer routes (public) */}
        <Route path="/customer" element={<CustomerDashboard />} />
        <Route path="/customer/profile" element={<Navigate to="/customer" replace />} />
        <Route path="/customer/manage" element={<Navigate to="/customer" replace />} />
        <Route path="/book" element={<BookAppointment />} />
        <Route path="/stylists" element={<Navigate to="/services" replace />} />
        <Route path="/services" element={<Services />} />
        
        {/* Protected admin routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedTypes={['admin', 'manager']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/manage/services"
          element={
            <ProtectedRoute allowedTypes={['admin']}>
              <ManageServices />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/manage/managers"
          element={
            <ProtectedRoute allowedTypes={['admin']}>
              <AdminManagers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/appointments"
          element={
            <ProtectedRoute allowedTypes={['admin', 'manager']}>
              <AdminAppointments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/customers"
          element={
            <ProtectedRoute allowedTypes={['admin', 'manager']}>
              <AdminCustomers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/ratings"
          element={
            <ProtectedRoute allowedTypes={['admin', 'manager']}>
              <AdminRatings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/holidays"
          element={
            <ProtectedRoute allowedTypes={['admin', 'manager']}>
              <ManageHolidays />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/payment-accounts"
          element={
            <ProtectedRoute allowedTypes={['admin']}>
              <ManagePaymentAccounts />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/sales"
          element={
            <ProtectedRoute allowedTypes={['admin']}>
              <SalesMonitoring />
            </ProtectedRoute>
          }
        />
        
        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer position="top-right" />
    </>
  )
}

export default App

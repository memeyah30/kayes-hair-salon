import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './App.css'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import BookAppointment from './pages/BookAppointment'
import Stylists from './pages/Stylists'
import Services from './pages/Services'
import AdminDashboard from './pages/AdminDashboard'
import StylistDashboard from './pages/StylistDashboard'
import CustomerDashboard from './pages/CustomerDashboard'
import ManageStylists from './pages/ManageStylists'
import ManageServices from './pages/ManageServices'
import AdminAppointments from './pages/admin/AdminAppointments'
import AdminCustomers from './pages/admin/AdminCustomers'
import AdminRatings from './pages/admin/AdminRatings'
import ManageHolidays from './pages/admin/ManageHolidays'
import ManagePaymentAccounts from './pages/admin/ManagePaymentAccounts'
import ManageInventory from './pages/admin/ManageInventory'
import SalesMonitoring from './pages/admin/SalesMonitoring'
import StylistAppointments from './pages/stylist/StylistAppointments'
import StylistSchedule from './pages/stylist/StylistSchedule'

const App = () => {
  return (
    <>
      <Routes>
        {/* Public landing page */}
        <Route path="/" element={<Home />} />
        
        {/* Public login routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/login/admin" element={<Login userType="admin" />} />
        <Route path="/login/manager" element={<Login userType="manager" />} />
        <Route path="/login/stylist" element={<Login userType="stylist" />} />
        
        {/* Customer routes (public) */}
        <Route path="/my-appointments" element={<CustomerDashboard />} />
        <Route path="/book" element={<BookAppointment />} />
        <Route path="/stylists" element={<Stylists />} />
        <Route path="/services" element={<Services />} />
        
        {/* Protected admin routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedTypes={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/manage/stylists"
          element={
            <ProtectedRoute allowedTypes={['admin']}>
              <ManageStylists />
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
          path="/admin/appointments"
          element={
            <ProtectedRoute allowedTypes={['admin']}>
              <AdminAppointments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/customers"
          element={
            <ProtectedRoute allowedTypes={['admin']}>
              <AdminCustomers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/ratings"
          element={
            <ProtectedRoute allowedTypes={['admin']}>
              <AdminRatings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/holidays"
          element={
            <ProtectedRoute allowedTypes={['admin']}>
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
          path="/admin/inventory"
          element={
            <ProtectedRoute allowedTypes={['admin']}>
              <ManageInventory />
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
        
        {/* Protected stylist routes */}
        <Route
          path="/stylist/dashboard"
          element={
            <ProtectedRoute allowedTypes={['stylist']}>
              <StylistDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stylist/appointments"
          element={
            <ProtectedRoute allowedTypes={['stylist']}>
              <StylistAppointments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stylist/schedule"
          element={
            <ProtectedRoute allowedTypes={['stylist']}>
              <StylistSchedule />
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

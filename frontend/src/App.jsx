import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './App.css'
import ProtectedRoute from './components/ProtectedRoute'
import ScrollToTop from './components/ScrollToTop'
import Login from './pages/Login'
import Home from './pages/Home'
import BookAppointment from './pages/BookAppointment'
import Stylists from './pages/Stylists'
import Services from './pages/Services'
import AdminDashboard from './pages/AdminDashboard'
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
import PendingStaffApprovals from './pages/admin/PendingStaffApprovals'
import ManageBookingEmail from './pages/ManageBookingEmail'
import VerifyOtp from './pages/VerifyOtp'
import AddStaff from './pages/manager/AddStaff'
import StaffRequests from './pages/manager/StaffRequests'

const App = () => {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Public landing page */}
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        
        {/* Public login routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/login/admin" element={<Login userType="admin" />} />
        <Route path="/login/manager" element={<Login userType="manager" />} />
        <Route path="/login/stylist" element={<Navigate to="/login" replace />} />
        
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
        <Route path="/stylists" element={<Stylists />} />
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
          path="/admin/manage/stylists"
          element={
            <ProtectedRoute allowedTypes={['admin']}>
              <ManageStylists />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/staff/pending"
          element={
            <ProtectedRoute allowedTypes={['admin']}>
              <PendingStaffApprovals />
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
        <Route path="/admin/manage/managers" element={<Navigate to="/admin/manage/stylists" replace />} />
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

        {/* Manager staff request routes */}
        <Route
          path="/manager/staff/add"
          element={
            <ProtectedRoute allowedTypes={['manager']}>
              <AddStaff />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/staff/requests"
          element={
            <ProtectedRoute allowedTypes={['manager']}>
              <StaffRequests />
            </ProtectedRoute>
          }
        />
        
        {/* Retired staff panel routes */}
        <Route path="/stylist/dashboard" element={<Navigate to="/login" replace />} />
        <Route path="/stylist/appointments" element={<Navigate to="/login" replace />} />
        <Route path="/stylist/schedule" element={<Navigate to="/login" replace />} />
        
        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer position="top-right" />
    </>
  )
}

export default App

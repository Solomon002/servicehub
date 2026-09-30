import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router'
const BusinessLayout = lazy(() => import('./layouts/BusinessLayout'))
const CalendarPage = lazy(() => import('./pages/CalendarPage'))
const BarbersPage = lazy(() => import('./pages/BarbersPage'))
const AppointmentsPage = lazy(() => import('./pages/AppointmentsPage'))
const BarberSelectionPage = lazy(() => import('./pages/BarberSelectionPage'))
const BookingPage = lazy(() => import('./pages/BookingPage'))
const CustomersPage = lazy(() => import('./pages/CustomersPage'))
const BookingDetailsPage = lazy(() => import('./pages/BookingDetailsPage'))
const BookingConfirmationPage = lazy(() => import('./pages/BookingConfirmationPage'))
const DateTimeSelectionPage = lazy(() => import('./pages/DateTimeSelectionPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ServiceSelectionPage = lazy(() => import('./pages/ServiceSelectionPage'))
const ServicesPage = lazy(() => import('./pages/ServicesPage'))
const HomePage = lazy(() => import('./pages/HomePage'))
const StaffLoginPage = lazy(() => import('./pages/StaffLoginPage'))
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const OwnerSignupPage = lazy(() => import('./pages/OwnerSignupPage'))
const BarberWorkspacePage = lazy(() => import('./pages/BarberWorkspacePage'))
const PlatformHomePage = lazy(() => import('./pages/PlatformHomePage'))
import { RequireBarber, RequireOwner, RequireStaff } from './components/auth/RouteGuards'
import { RouteThemeControl } from './components/ThemeSelect'

function App() {
  return (
    <>
    <RouteThemeControl />
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-stone-50 text-sm text-stone-500">Loading ServiceHub…</main>}><Routes>
      <Route element={<RequireStaff><BusinessLayout /></RequireStaff>}>
        <Route path="dashboard" element={<RequireOwner><DashboardPage /></RequireOwner>} />
        <Route path="my-work" element={<RequireBarber><BarberWorkspacePage /></RequireBarber>} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="services" element={<RequireOwner><ServicesPage /></RequireOwner>} />
        <Route path="barbers" element={<RequireOwner><BarbersPage /></RequireOwner>} />
        <Route path="payments" element={<RequireOwner><PaymentsPage /></RequireOwner>} />
        <Route path="analytics" element={<RequireOwner><AnalyticsPage /></RequireOwner>} />
        <Route path="settings" element={<RequireOwner><SettingsPage /></RequireOwner>} />
      </Route>
      <Route path="/" element={<PlatformHomePage />} />
      <Route path="/shop" element={<HomePage />} />
      <Route path="/login/owner" element={<StaffLoginPage role="owner" />} />
      <Route path="/login/barber" element={<StaffLoginPage role="barber" />} />
      <Route path="/signup/owner" element={<OwnerSignupPage />} />
      <Route path="/book" element={<BookingPage />} />
      <Route path="/book/services" element={<ServiceSelectionPage />} />
      <Route path="/book/barber" element={<BarberSelectionPage />} />
      <Route path="/book/date-time" element={<DateTimeSelectionPage />} />
      <Route path="/book/details" element={<BookingDetailsPage />} />
      <Route path="/book/confirmation" element={<BookingConfirmationPage />} />
      <Route path="*" element={<main className="p-10 text-center">Page not found</main>} />
    </Routes></Suspense>
    </>
  )
}

export default App

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { AppointmentProvider } from './context/AppointmentContext'
import { BookingFlowProvider } from './context/BookingFlowContext'
import { BusinessSettingsProvider } from './context/BusinessSettingsContext'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { CatalogProvider } from './context/CatalogContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <CatalogProvider>
          <AppointmentProvider>
            <BusinessSettingsProvider>
              <BookingFlowProvider>
                <App />
              </BookingFlowProvider>
            </BusinessSettingsProvider>
          </AppointmentProvider>
        </CatalogProvider>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)

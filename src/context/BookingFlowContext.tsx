import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { getLocalDate } from '../data/appointments'
import type { Appointment } from '../data/appointments'

export type SelectedBookingService = {
  id?: string
  name: string
  description: string
  duration: number
  price: number
}

type BookingFlowContextValue = {
  selectedService: SelectedBookingService | null
  selectService: (service: SelectedBookingService) => void
  selectedBarber: string | null
  selectedBarberName: string | null
  selectBarber: (barberId: string, name?: string) => void
  businessSlug: string
  setBusinessSlug: (slug: string) => void
  selectedDate: string
  selectDate: (date: string) => void
  selectedTime: string | null
  selectTime: (time: string) => void
  confirmedAppointment: Appointment | null
  setConfirmedAppointment: (appointment: Appointment | null) => void
}

const BookingFlowContext = createContext<BookingFlowContextValue | undefined>(undefined)

export function BookingFlowProvider({ children }: { children: ReactNode }) {
  const [selectedService, setSelectedService] = useState<SelectedBookingService | null>(null)
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null)
  const [selectedBarberName, setSelectedBarberName] = useState<string | null>(null)
  const [businessSlug, setBusinessSlugState] = useState('')
  const [selectedDate, setSelectedDate] = useState(() => getLocalDate(1))
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null)
  const value = useMemo(() => ({
    selectedService,
    selectService: (service: SelectedBookingService) => {
      setSelectedService(service)
      setSelectedBarber(null)
      setSelectedBarberName(null)
      setSelectedDate(getLocalDate(1))
      setSelectedTime(null)
      setConfirmedAppointment(null)
    },
    selectedBarber,
    selectedBarberName,
    selectBarber: (barberId: string, name?: string) => {
      setSelectedBarber(barberId)
      setSelectedBarberName(name ?? null)
      setSelectedDate(getLocalDate(1))
      setSelectedTime(null)
      setConfirmedAppointment(null)
    },
    businessSlug,
    setBusinessSlug: (slug: string) => {
      if (slug !== businessSlug) {
        setBusinessSlugState(slug)
        setSelectedService(null)
        setSelectedBarber(null)
        setSelectedBarberName(null)
        setSelectedTime(null)
        setConfirmedAppointment(null)
      }
    },
    selectedDate,
    selectDate: (date: string) => {
      setSelectedDate(date)
      setSelectedTime(null)
      setConfirmedAppointment(null)
    },
    selectedTime,
    selectTime: (time: string) => {
      setSelectedTime(time)
      setConfirmedAppointment(null)
    },
    confirmedAppointment,
    setConfirmedAppointment,
  }), [businessSlug, confirmedAppointment, selectedBarber, selectedBarberName, selectedDate, selectedService, selectedTime])

  return <BookingFlowContext.Provider value={value}>{children}</BookingFlowContext.Provider>
}

export function useBookingFlow() {
  const context = useContext(BookingFlowContext)
  if (!context) {
    throw new Error('useBookingFlow must be used inside BookingFlowProvider')
  }
  return context
}

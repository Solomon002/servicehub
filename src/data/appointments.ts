import { startingBarbers } from './barbers'

export type AppointmentStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'
export type PaymentStatus = 'Paid' | 'Unpaid'

export function allowedAppointmentStatuses(status: AppointmentStatus, isOwner: boolean): AppointmentStatus[] {
  if (isOwner) return ['Pending', 'Confirmed', 'Completed', 'Cancelled']
  if (status === 'Pending') return ['Pending', 'Confirmed', 'Cancelled']
  if (status === 'Confirmed') return ['Confirmed', 'Completed', 'Cancelled']
  return [status]
}

export type Appointment = {
  id: string
  customer: string
  customerPhone?: string
  service: string
  barber: string
  date: string
  time: string
  price: number
  status: AppointmentStatus
  paymentStatus?: PaymentStatus
}

export const appointmentServices = [
  { name: 'Haircut', description: 'A tailored scissor or clipper cut, finished to your preferred shape and style.', duration: 30, price: 5000 },
  { name: 'Low Fade', description: 'A clean low fade blended around the sides and back, finished with your preferred top length.', duration: 45, price: 6000 },
  { name: 'Haircut + Beard', description: 'A full haircut paired with a beard shape-up and a clean, tidy finish.', duration: 50, price: 7000 },
  { name: 'Beard Trim', description: 'Shape and even your beard, with clean edges and a neat finish.', duration: 20, price: 3000 },
]

export const appointmentCustomers = ['John Doe', 'David Smith', 'Michael Brown', 'Chris Evans']

export const appointmentBarbers = startingBarbers.map((barber) => barber.name)

export function getLocalDate(offsetDays = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getSampleAppointments(): Appointment[] {
  const today = getLocalDate()
  const tomorrow = getLocalDate(1)
  const inThreeDays = getLocalDate(3)

  return [
    { id: 'appt-1', customer: 'John Doe', service: 'Haircut', barber: 'Michael Johnson', date: today, time: '09:00', price: 5000, status: 'Confirmed' },
    { id: 'appt-2', customer: 'David Smith', service: 'Low Fade', barber: 'David Williams', date: today, time: '10:30', price: 6000, status: 'Confirmed' },
    { id: 'appt-3', customer: 'Michael Brown', service: 'Haircut + Beard', barber: 'Chris Adams', date: today, time: '12:00', price: 7000, status: 'Pending' },
    { id: 'appt-4', customer: 'Chris Evans', service: 'Haircut', barber: 'Michael Johnson', date: today, time: '14:00', price: 5000, status: 'Confirmed' },
    { id: 'appt-5', customer: 'Peter Okeke', service: 'Beard Trim', barber: 'David Williams', date: today, time: '15:00', price: 3000, status: 'Completed' },
    { id: 'appt-6', customer: 'Samson Nwosu', service: 'Haircut', barber: 'Chris Adams', date: today, time: '16:30', price: 5000, status: 'Cancelled' },
    { id: 'appt-7', customer: 'David Smith', service: 'Low Fade', barber: 'Michael Johnson', date: tomorrow, time: '11:00', price: 6000, status: 'Confirmed' },
    { id: 'appt-8', customer: 'John Doe', service: 'Haircut + Beard', barber: 'Chris Adams', date: inThreeDays, time: '09:30', price: 7000, status: 'Pending' },
  ]
}

function toMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function findAppointmentConflict(
  appointments: Appointment[],
  candidate: Omit<Appointment, 'id'>,
) {
  const candidateService = appointmentServices.find((service) => service.name === candidate.service)
  const candidateStart = toMinutes(candidate.time)
  const candidateEnd = candidateStart + (candidateService?.duration ?? 30)

  return appointments.find((appointment) => {
    if (
      appointment.date !== candidate.date ||
      appointment.barber !== candidate.barber ||
      appointment.status === 'Cancelled'
    ) {
      return false
    }

    const service = appointmentServices.find((item) => item.name === appointment.service)
    const start = toMinutes(appointment.time)
    const end = start + (service?.duration ?? 30)
    return candidateStart < end && start < candidateEnd
  })
}

export function getAvailableBarbers(
  date: string,
  time: string,
  serviceName: string,
  appointments: Appointment[],
  selectedBarberId?: string,
) {
  const service = appointmentServices.find((item) => item.name === serviceName)
  if (!service) return []

  return startingBarbers.filter((barber) => {
    if (!barber.active || !barber.services.includes(service.name)) return false
    if (selectedBarberId && selectedBarberId !== 'any' && barber.id !== selectedBarberId) return false

    const conflict = findAppointmentConflict(appointments, {
      customer: 'New booking',
      service: service.name,
      barber: barber.name,
      date,
      time,
      price: service.price,
      status: 'Pending',
    })
    return !conflict
  })
}

export function getAvailableTimeSlots(
  date: string,
  serviceName: string,
  appointments: Appointment[],
  selectedBarberId?: string,
) {
  const service = appointmentServices.find((item) => item.name === serviceName)
  if (!service) return []

  const lastStart = 18 * 60 - service.duration
  const slots: Array<{ time: string; availableBarberCount: number }> = []
  for (let minutes = 9 * 60; minutes <= lastStart; minutes += 30) {
    const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
    const availableBarberCount = getAvailableBarbers(date, time, serviceName, appointments, selectedBarberId).length
    if (availableBarberCount > 0) slots.push({ time, availableBarberCount })
  }
  return slots
}

import { describe, expect, it } from 'vitest'
import { allowedAppointmentStatuses, findAppointmentConflict, getAvailableTimeSlots, type Appointment } from './appointments'

const appointment = (overrides: Partial<Appointment> = {}): Appointment => ({
  id: 'existing', customer: 'Alex', service: 'Haircut', barber: 'Michael Johnson',
  date: '2026-10-03', time: '10:00', price: 5000, status: 'Confirmed', ...overrides,
})

describe('appointment overlap rules', () => {
  it('blocks a candidate that starts during an existing service', () => {
    const conflict = findAppointmentConflict([appointment()], {
      customer: 'New client', service: 'Haircut', barber: 'Michael Johnson', date: '2026-10-03', time: '10:15', price: 5000, status: 'Pending',
    })
    expect(conflict?.id).toBe('existing')
  })

  it('allows a following appointment when it starts exactly as the previous one ends', () => {
    const conflict = findAppointmentConflict([appointment()], {
      customer: 'New client', service: 'Haircut', barber: 'Michael Johnson', date: '2026-10-03', time: '10:30', price: 5000, status: 'Pending',
    })
    expect(conflict).toBeUndefined()
  })

  it('does not treat cancelled bookings as conflicts', () => {
    const conflict = findAppointmentConflict([appointment({ status: 'Cancelled' })], {
      customer: 'New client', service: 'Haircut', barber: 'Michael Johnson', date: '2026-10-03', time: '10:00', price: 5000, status: 'Pending',
    })
    expect(conflict).toBeUndefined()
  })

  it('considers the existing service duration when checking overlaps', () => {
    const conflict = findAppointmentConflict([appointment({ service: 'Haircut + Beard' })], {
      customer: 'New client', service: 'Haircut', barber: 'Michael Johnson', date: '2026-10-03', time: '10:45', price: 5000, status: 'Pending',
    })
    expect(conflict?.service).toBe('Haircut + Beard')
  })

  it('offers only starts that fit within shop hours for the service duration', () => {
    const slots = getAvailableTimeSlots('2026-10-03', 'Haircut + Beard', [])
    expect(slots.some(slot => slot.time === '17:00')).toBe(true)
    expect(slots.some(slot => slot.time === '17:30')).toBe(false)
  })
})

describe('appointment status permissions', () => {
  it('allows barbers to confirm or cancel pending appointments', () => {
    expect(allowedAppointmentStatuses('Pending', false)).toEqual(['Pending', 'Confirmed', 'Cancelled'])
  })

  it('limits completed appointments to a terminal status for barbers', () => {
    expect(allowedAppointmentStatuses('Completed', false)).toEqual(['Completed'])
  })

  it('allows owners to manage all appointment statuses', () => {
    expect(allowedAppointmentStatuses('Pending', true)).toEqual(['Pending', 'Confirmed', 'Completed', 'Cancelled'])
  })
})

export type Barber = {
  id: string
  name: string
  phone: string
  appointmentsToday: number
  active: boolean
  services: string[]
}

export const startingBarbers: Barber[] = [
  { id: 'michael-johnson', name: 'Michael Johnson', phone: '+234 801 123 4501', appointmentsToday: 7, active: true, services: ['Haircut', 'Low Fade', 'Haircut + Beard'] },
  { id: 'david-williams', name: 'David Williams', phone: '+234 802 234 5602', appointmentsToday: 5, active: true, services: ['Haircut', 'Low Fade', 'Beard Trim'] },
  { id: 'chris-adams', name: 'Chris Adams', phone: '+234 803 345 6703', appointmentsToday: 6, active: true, services: ['Haircut', 'Haircut + Beard', 'Beard Trim'] },
  { id: 'samuel-okafor', name: 'Samuel Okafor', phone: '+234 804 456 7804', appointmentsToday: 0, active: true, services: ['Haircut', 'Low Fade'] },
  { id: 'daniel-adebayo', name: 'Daniel Adebayo', phone: '+234 805 567 8905', appointmentsToday: 0, active: true, services: ['Haircut + Beard'] },
  { id: 'tunde-bello', name: 'Tunde Bello', phone: '+234 806 678 9006', appointmentsToday: 0, active: true, services: ['Beard Trim'] },
]

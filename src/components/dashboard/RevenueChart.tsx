import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAppointments } from '../../context/AppointmentContext'
import { getLocalDate } from '../../data/appointments'

const formatNaira = (amount: number) => `₦${amount.toLocaleString('en-NG')}`

function RevenueChart() {
  const { appointments } = useAppointments()
  const revenueData = Array.from({ length: 7 }, (_, index) => {
    const date = getLocalDate(index - 6)
    const daily = appointments.filter((item) => item.date === date && item.status === 'Completed' && item.paymentStatus === 'Paid')
    return { day: new Intl.DateTimeFormat('en-NG', { weekday: 'short' }).format(new Date(`${date}T12:00:00`)), revenue: daily.reduce((sum, item) => sum + item.price, 0) }
  })
  const bestDay = revenueData.reduce((best, item) => item.revenue > best.revenue ? item : best, revenueData[0])
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-stone-900">Revenue overview</h3>
          <p className="mt-1 text-sm text-stone-500">Daily revenue for the last 7 days</p>
        </div>
        <span className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600">
          Live totals
        </span>
      </div>

      <figure>
        <div
          role="img"
          aria-label="Area chart showing daily revenue from Monday to Sunday, in Nigerian naira"
          className="h-64 w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#047857" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#047857" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e7e5e4" strokeDasharray="4 4" />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#78716c' }}
                tickMargin={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#78716c' }}
                tickFormatter={(value: number) => `₦${value / 1000}k`}
                width={54}
                domain={[0, 'dataMax + 10000']}
              />
              <Tooltip
                formatter={(value) => [formatNaira(Number(value)), 'Revenue']}
                contentStyle={{ borderRadius: 12, borderColor: '#e7e5e4', fontSize: 13 }}
                labelStyle={{ color: '#78716c', marginBottom: 4 }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#047857"
                strokeWidth={2.5}
                fill="url(#revenueFill)"
                activeDot={{ r: 5, fill: '#047857', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <figcaption className="mt-3 text-xs text-stone-500">
          {bestDay.revenue ? `${bestDay.day} had the highest recorded revenue at ${formatNaira(bestDay.revenue)}.` : 'Revenue appears here after appointments are completed and marked paid.'}
        </figcaption>
      </figure>
    </section>
  )
}

export default RevenueChart

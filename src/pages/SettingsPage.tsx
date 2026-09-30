import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useBusinessSettings, type BusinessSettings } from '../context/BusinessSettingsContext'
import { useAuth } from '../context/AuthContext'

function SettingsPage() {
  const { settings, saveSettings } = useBusinessSettings()
  const { business } = useAuth()
  const [form, setForm] = useState<BusinessSettings>(settings)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => setForm(settings), [settings])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    try {
      await saveSettings(form)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 3000)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save settings.')
    }
  }

  function update(field: Exclude<keyof BusinessSettings, 'weeklyHours'>, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setSaved(false)
  }

  function updateDay(day: number, field: 'closed' | 'opens' | 'closes', value: string | boolean) {
    setForm(current => ({ ...current, weeklyHours: current.weeklyHours.map(item => item.day === day ? { ...item, [field]: value } : item) }))
    setSaved(false)
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
      <div className="mb-7"><p className="text-sm font-medium text-stone-500">Shop profile and preferences</p><h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h2><p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">Manage the details and hours customers see on your public booking page.</p></div>
      <form onSubmit={submit} className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <section className="border-b border-stone-100 p-5 sm:p-6"><h3 className="font-semibold">Business profile</h3><p className="mt-1 text-sm text-stone-500">The information customers see when they visit your booking page.</p><div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[{ key: 'businessName', label: 'Business name', placeholder: 'Your barbershop', type: 'text' }, { key: 'location', label: 'Location', placeholder: 'City, State', type: 'text' }, { key: 'phone', label: 'Phone number', placeholder: '+234 800 000 0000', type: 'tel' }, { key: 'email', label: 'Contact email', placeholder: 'hello@example.com', type: 'email' }].map((field) => <label key={field.key} className="block"><span className="mb-1.5 block text-sm font-medium text-stone-700">{field.label}</span><input type={field.type} required value={form[field.key as keyof BusinessSettings] as string} onChange={(event) => update(field.key as Exclude<keyof BusinessSettings, 'weeklyHours'>, event.target.value)} placeholder={field.placeholder} className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" /></label>)}
        </div></section>
        <section className="p-5 sm:p-6"><h3 className="font-semibold">Opening hours</h3><p className="mt-1 text-sm text-stone-500">Set each day separately. Closed days will not offer booking slots.</p><div className="mt-5 space-y-2">{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((name, day) => { const hours = form.weeklyHours.find(item => item.day === day)!; return <div key={name} className="grid items-center gap-3 rounded-lg border border-stone-100 p-3 sm:grid-cols-[100px_1fr_1fr_auto]"><span className="text-sm font-medium">{name}</span><label className="text-xs text-stone-500">Opens<input aria-label={`${name} opens`} type="time" required={!hours.closed} disabled={hours.closed} value={hours.opens} onChange={event => updateDay(day, 'opens', event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm disabled:opacity-50" /></label><label className="text-xs text-stone-500">Closes<input aria-label={`${name} closes`} type="time" required={!hours.closed} disabled={hours.closed} value={hours.closes} onChange={event => updateDay(day, 'closes', event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm disabled:opacity-50" /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hours.closed} onChange={event => updateDay(day, 'closed', event.target.checked)} className="size-4 accent-emerald-800" />Closed</label></div>})}</div><p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2.5 text-xs leading-5 text-emerald-900">Barber-specific hours and days off can further limit these shop hours.</p></section>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 bg-stone-50 px-5 py-4 sm:px-6"><Link to={business?.slug ? `/shop?shop=${encodeURIComponent(business.slug)}` : '/'} className="text-sm font-semibold text-emerald-800 hover:text-emerald-950">Preview public shop page →</Link><div className="flex items-center gap-3">{saved && <span role="status" className="text-sm font-medium text-emerald-800">Settings saved</span>}{error && <span role="alert" className="text-sm text-rose-700">{error}</span>}<button type="submit" className="rounded-lg bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-950">Save changes</button></div></div>
      </form>
      <p className="mt-4 text-xs text-stone-400">When backend configuration is present, settings are stored in your shop database.</p>
    </main>
  )
}

export default SettingsPage

import { useState, type FormEvent } from 'react'
import { useCatalog, type ServiceRecord } from '../context/CatalogContext'
import { useAuth } from '../context/AuthContext'

const formatNaira = (amount: number) => `₦${amount.toLocaleString('en-NG')}`

function ServicesPage() {
  const { services, saveService, archiveService, loading, error: catalogError } = useCatalog()
  const { business } = useAuth()
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  function openAddForm() {
    setEditingService(null)
    setIsFormOpen(true)
  }

  function openEditForm(service: ServiceRecord) {
    setEditingService(service)
    setIsFormOpen(true)
  }

  async function handleSaveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name')).trim()
    const description = String(formData.get('description')).trim()
    const duration = Number(formData.get('duration'))
    const price = Number(formData.get('price'))

    try {
      await saveService({ ...(editingService ? { id: editingService.id } : {}), name, description, duration, price })
      setMessage(`${name} ${editingService ? 'updated' : 'added'}.`)
      setIsFormOpen(false)
      setEditingService(null)
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : 'Could not save service.') }
  }

  async function handleDeleteService(service: ServiceRecord) {
    try {
      await archiveService(service.id)
      setDeleteServiceId(null)
      setMessage(`${service.name} removed from the booking menu.`)
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : 'Could not remove service.') }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-stone-500">{business?.name ?? 'Services'}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Services</h2>
          <p className="mt-2 text-sm text-stone-600">Set the price and appointment length for each service.</p>
        </div>
        <button
          type="button"
          onClick={openAddForm}
          className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
        >
          + Add service
        </button>
      </div>

      <p role="status" aria-live="polite" className="sr-only">{message}</p>

      {catalogError && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">Could not load the service catalog: {catalogError}</p>}
      <section aria-label="Service list" className="grid gap-4 md:grid-cols-2">
        {services.map((service) => (
          <article key={service.id} className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-lg text-emerald-800" aria-hidden="true">
                ✂
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold text-stone-900">{service.name}</h3>
                <p className="mt-1 text-sm text-stone-500">{service.duration} minutes</p>
                <p className="mt-2 text-sm leading-5 text-stone-600">{service.description || 'No description added.'}</p>
              </div>
              <p className="shrink-0 text-lg font-semibold tabular-nums text-stone-900">{formatNaira(service.price)}</p>
            </div>

            {deleteServiceId === service.id ? (
              <div className="mt-5 rounded-lg border border-rose-100 bg-rose-50 p-3">
                <p className="text-sm font-medium text-rose-900">Delete {service.name}?</p>
                <p className="mt-1 text-xs leading-5 text-rose-800">This removes it from the current service list.</p>
                <div className="mt-3 flex justify-end gap-2">
                  <button type="button" onClick={() => setDeleteServiceId(null)} className="rounded-md px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-white">Cancel</button>
                  <button type="button" onClick={() => handleDeleteService(service)} className="rounded-md bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800">Delete service</button>
                </div>
              </div>
            ) : (
              <div className="mt-5 flex justify-end gap-2 border-t border-stone-100 pt-4">
                <button type="button" onClick={() => openEditForm(service)} className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">Edit</button>
                <button type="button" onClick={() => setDeleteServiceId(service.id)} className="rounded-lg px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50">Delete</button>
              </div>
            )}
          </article>
        ))}
        {services.length === 0 && (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center md:col-span-2">
            <h3 className="font-semibold text-stone-800">{loading ? 'Loading services…' : 'No services yet'}</h3>
            <p className="mt-1 text-sm text-stone-500">Add a service to start building your menu.</p>
            <button type="button" onClick={openAddForm} className="mt-4 text-sm font-semibold text-emerald-800 hover:text-emerald-900">Add your first service</button>
          </div>
        )}
      </section>

      <p className="mt-5 text-xs text-stone-400">{loading ? 'Loading catalog…' : 'Service catalog changes are saved to the connected shop database.'}</p>

      {isFormOpen && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-stone-950/40 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="service-form-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="service-form-title" className="text-lg font-semibold text-stone-900">
                  {editingService ? 'Edit service' : 'Add service'}
                </h3>
                <p className="mt-1 text-sm text-stone-500">Explain what the customer gets, then set the duration and price.</p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setIsFormOpen(false)} className="grid size-8 place-items-center rounded-lg text-xl text-stone-500 hover:bg-stone-100">×</button>
            </div>
            <form key={editingService?.id ?? 'new-service'} onSubmit={handleSaveService} className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-stone-700">
                Service name
                <input name="name" required defaultValue={editingService?.name ?? ''} autoFocus className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
              </label>
              <label className="block text-sm font-medium text-stone-700">
                Description
                <textarea name="description" rows={3} maxLength={500} required defaultValue={editingService?.description ?? ''} placeholder="Describe the service, finish, or what is included…" className="mt-1.5 w-full resize-y rounded-lg border border-stone-200 px-3 py-2.5 font-normal outline-none placeholder:text-stone-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium text-stone-700">
                  Duration
                  <span className="relative mt-1.5 block">
                    <input name="duration" type="number" min="5" max="480" step="5" required defaultValue={editingService?.duration ?? 30} className="w-full rounded-lg border border-stone-200 px-3 py-2.5 pr-12 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
                    <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-stone-400">min</span>
                  </span>
                </label>
                <label className="block text-sm font-medium text-stone-700">
                  Price
                  <span className="relative mt-1.5 block">
                    <span className="pointer-events-none absolute left-3 top-2.5 text-sm text-stone-400">₦</span>
                    <input name="price" type="number" min="0" step="100" required defaultValue={editingService?.price ?? 5000} className="w-full rounded-lg border border-stone-200 py-2.5 pl-7 pr-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
                  </span>
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">Cancel</button>
                <button type="submit" className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900">{editingService ? 'Save changes' : 'Save service'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}

export default ServicesPage

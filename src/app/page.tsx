'use client'

import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import BillCard from '@/components/BillCard'

export type Bill = {
  id: string
  title: string
  amount: number
  category: string | null
  due_date: string
  recurrence: string
  reminder_days_before: number
  status: string
  notification_email: string
  notes: string | null
}

export default function Home() {
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [recurrence, setRecurrence] = useState('monthly')
  const [reminderDaysBefore, setReminderDaysBefore] = useState('3')
  const [notificationEmail, setNotificationEmail] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetchBills()
  }, [])

  const fetchBills = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .order('due_date', { ascending: true })

    if (error) {
      console.error('Error al cargar pagos:', error.message)
    } else {
      setBills(data || [])
    }

    setLoading(false)
  }

  const resetForm = () => {
    setTitle('')
    setAmount('')
    setCategory('')
    setDueDate('')
    setRecurrence('monthly')
    setReminderDaysBefore('3')
    setNotificationEmail('')
    setNotes('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!title || !amount || !dueDate || !notificationEmail) {
      alert('Completa los campos obligatorios')
      return
    }

    setSaving(true)

    const { error } = await supabase.from('bills').insert([
      {
        title,
        amount: Number(amount),
        category: category || null,
        due_date: dueDate,
        recurrence,
        reminder_days_before: Number(reminderDaysBefore),
        status: 'pending',
        notification_email: notificationEmail,
        notes: notes || null,
      },
    ])

    if (error) {
      console.error('Error al guardar:', error.message)
      alert('No se pudo guardar el pago')
    } else {
      resetForm()
      fetchBills()
    }

    setSaving(false)
  }

  const markAsPaid = async (id: string) => {
    const { error } = await supabase
      .from('bills')
      .update({ status: 'paid' })
      .eq('id', id)

    if (error) {
      alert('No se pudo marcar como pagado')
    } else {
      fetchBills()
    }
  }

  const updateBill = async (id: string) => {
    const nuevoNombre = prompt('Nuevo nombre:')
    if (!nuevoNombre) return

    const { error } = await supabase
      .from('bills')
      .update({ title: nuevoNombre })
      .eq('id', id)

    if (error) {
      alert('Error al actualizar')
    } else {
      fetchBills()
    }
  }

  const deleteBill = async (id: string) => {
  if (!confirm('¿Eliminar este pago?')) return

  // 1. borrar logs relacionados
  const { error: logError } = await supabase
    .from('notification_log')
    .delete()
    .eq('bill_id', id)

  if (logError) {
    console.error('Error al eliminar logs:', logError.message)
    alert('No se pudieron eliminar los logs del pago')
    return
  }

  // 2. borrar el pago
  const { error } = await supabase
    .from('bills')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error al eliminar bill:', error.message)
    alert('Error al eliminar')
  } else {
    fetchBills()
  }
}
  const pendingCount = bills.filter((bill) => bill.status !== 'paid').length
  const paidCount = bills.filter((bill) => bill.status === 'paid').length
  const totalPending = bills
    .filter((bill) => bill.status !== 'paid')
    .reduce((sum, bill) => sum + Number(bill.amount), 0)

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-6 text-4xl font-bold">Recordatorio de pagos</h1>

        {/* BLOQUE 1: RESUMEN */}
        <section className="mb-8 rounded-3xl bg-slate-900 p-6 text-white shadow-lg">
          <p className="text-sm text-slate-300">
            Administra tus pagos, revisa vencimientos y marca cuentas como pagadas.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-slate-300">Pendientes</p>
              <p className="mt-1 text-3xl font-bold">{pendingCount}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-slate-300">Pagados</p>
              <p className="mt-1 text-3xl font-bold">{paidCount}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-slate-300">Total pendiente</p>
              <p className="mt-1 text-3xl font-bold">${totalPending.toFixed(2)}</p>
            </div>
          </div>
        </section>

        {/* BLOQUE 2: FORMULARIO */}
        <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-3xl font-bold text-slate-900">Nuevo pago</h2>
          <p className="mt-2 text-slate-500">
            Agrega una cuenta y define cuándo quieres que se recuerde.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Nombre
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="Ej. Proveedor Tal..."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Monto
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="Ej. 599"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Categoría
              </label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="Ej. Internet, Luz, Agua"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Fecha de vencimiento
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Frecuencia
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
              >
                <option value="once">Una sola vez</option>
                <option value="weekly">Semanal</option>
                <option value="biweekly">Quincenal</option>
                <option value="monthly">Mensual</option>
                <option value="yearly">Anual</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Recordar días antes
              </label>
              <input
                type="number"
                value={reminderDaysBefore}
                onChange={(e) => setReminderDaysBefore(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Correo de notificación
              </label>
              <input
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="tucorreo@email.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Notas
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="Opcional"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar pago'}
            </button>
          </form>
        </section>

        {/* BLOQUE 3: PAGOS */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-slate-900">Mis pagos</h2>
            <p className="mt-2 text-slate-500">
              Aquí puedes marcar, editar o eliminar tus pagos.
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              Cargando pagos...
            </div>
          ) : bills.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              No hay pagos registrados todavía.
            </div>
          ) : (
            <div className="space-y-4">
              {bills.map((bill) => (
                <BillCard
                  key={bill.id}
                  bill={bill}
                  onPaid={markAsPaid}
                  onEdit={updateBill}
                  onDelete={deleteBill}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
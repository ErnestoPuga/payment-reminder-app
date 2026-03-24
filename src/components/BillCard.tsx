'use client'

type Bill = {
  id: string
  title: string
  amount: number
  category: string | null
  due_date: string
  recurrence: string
  status: string
}

type Props = {
  bill: Bill
  onPaid: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export default function BillCard({ bill, onPaid, onEdit, onDelete }: Props) {
  const today = new Date().toISOString().split('T')[0]

  const isOverdue = bill.due_date < today && bill.status !== 'paid'
  const isToday = bill.due_date === today

  const status = bill.status === 'paid'
    ? { label: 'Pagado', badge: 'bg-emerald-100 text-emerald-700', card: 'border-emerald-200 bg-emerald-50/60' }
    : isOverdue
    ? { label: 'Vencido', badge: 'bg-rose-100 text-rose-700', card: 'border-rose-200 bg-rose-50/70' }
    : isToday
    ? { label: 'Vence hoy', badge: 'bg-amber-100 text-amber-700', card: 'border-amber-200 bg-amber-50/70' }
    : { label: 'Pendiente', badge: 'bg-sky-100 text-sky-700', card: 'border-slate-200 bg-white' }

  return (
    <article
      className={`rounded-3xl border p-5 shadow-sm transition hover:shadow-md ${status.card}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-semibold text-slate-900">{bill.title}</h3>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.badge}`}>
              {status.label}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            {bill.category || 'Sin categoría'}
          </p>

          <div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/80 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Monto</p>
              <p className="mt-1 font-semibold">${Number(bill.amount).toFixed(2)}</p>
            </div>

            <div className="rounded-2xl bg-white/80 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Vence</p>
              <p className="mt-1 font-semibold">{bill.due_date}</p>
            </div>

            <div className="rounded-2xl bg-white/80 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Frecuencia</p>
              <p className="mt-1 font-semibold capitalize">{bill.recurrence}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:w-[170px] lg:flex-col">
          {bill.status !== 'paid' && (
            <button
              onClick={() => onPaid(bill.id)}
              className="rounded-2xl bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700"
            >
              Marcar pagado
            </button>
          )}

          <button
            onClick={() => onEdit(bill.id)}
            className="rounded-2xl bg-amber-500 px-4 py-2 font-medium text-white transition hover:bg-amber-600"
          >
            Editar
          </button>

          <button
            onClick={() => onDelete(bill.id)}
            className="rounded-2xl bg-rose-600 px-4 py-2 font-medium text-white transition hover:bg-rose-700"
          >
            Eliminar
          </button>
        </div>
      </div>
    </article>
  )
}
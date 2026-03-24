import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function getMexicoTodayParts() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const parts = formatter.formatToParts(new Date())

  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value

  if (!year || !month || !day) {
    throw new Error('No se pudo obtener la fecha de México')
  }

  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    dateString: `${year}-${month}-${day}`,
  }
}

function diffInDays(dateA: Date, dateB: Date) {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.round((dateA.getTime() - dateB.getTime()) / msPerDay)
}

export async function GET() {
  try {
    const mexicoToday = getMexicoTodayParts()
    const today = new Date(mexicoToday.year, mexicoToday.month - 1, mexicoToday.day)

    const { data: bills, error } = await supabase
      .from('bills')
      .select('*')
      .eq('status', 'pending')

    if (error) {
      console.error('Error obteniendo bills:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const sent: string[] = []
    const skipped: string[] = []

    for (const bill of bills || []) {
      const [year, month, day] = bill.due_date.split('-').map(Number)
      const dueDate = new Date(year, month - 1, day)

      const diffDays = diffInDays(dueDate, today)

      const shouldSendToday = diffDays === 0
      const shouldSendBefore = diffDays === Number(bill.reminder_days_before)

      console.log('-----')
      console.log('Bill:', bill.title)
      console.log('due_date:', bill.due_date)
      console.log('reminder_days_before:', bill.reminder_days_before)
      console.log('today Mexico:', mexicoToday.dateString)
      console.log('diffDays:', diffDays)
      console.log('shouldSendToday:', shouldSendToday)
      console.log('shouldSendBefore:', shouldSendBefore)

      if (!shouldSendToday && !shouldSendBefore) {
        continue
      }

      const notificationType = shouldSendToday ? 'today' : 'before'

      const { data: existingLogs, error: logError } = await supabase
        .from('notification_log')
        .select('id, sent_at')
        .eq('bill_id', bill.id)
        .eq('type', notificationType)
        .gte('sent_at', `${mexicoToday.dateString}T00:00:00`)
        .lte('sent_at', `${mexicoToday.dateString}T23:59:59`)

      if (logError) {
        console.error(`Error revisando logs para ${bill.title}:`, logError)
        continue
      }

      if (existingLogs && existingLogs.length > 0) {
        console.log(`Ya se envió hoy para ${bill.title}, se omite`)
        skipped.push(bill.title)
        continue
      }

      const subject = shouldSendToday
        ? `Tu pago vence hoy: ${bill.title}`
        : `Tu pago vence en ${bill.reminder_days_before} día(s): ${bill.title}`

      const html = shouldSendToday
        ? `
          <div style="font-family: Arial, sans-serif; line-height: 1.5;">
            <h2>Recordatorio de pago</h2>
            <p>Tu pago <strong>${bill.title}</strong> vence hoy.</p>
            <p><strong>Monto:</strong> $${bill.amount}</p>
            <p><strong>Fecha de vencimiento:</strong> ${bill.due_date}</p>
            ${bill.notes ? `<p><strong>Notas:</strong> ${bill.notes}</p>` : ''}
          </div>
        `
        : `
          <div style="font-family: Arial, sans-serif; line-height: 1.5;">
            <h2>Recordatorio de pago</h2>
            <p>Tu pago <strong>${bill.title}</strong> vence pronto.</p>
            <p><strong>Monto:</strong> $${bill.amount}</p>
            <p><strong>Fecha de vencimiento:</strong> ${bill.due_date}</p>
            <p>Faltan ${bill.reminder_days_before} día(s).</p>
            ${bill.notes ? `<p><strong>Notas:</strong> ${bill.notes}</p>` : ''}
          </div>
        `

      const response = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: bill.notification_email,
        subject,
        html,
      })

      if (response.error) {
        console.error(`Error enviando correo para ${bill.title}:`, response.error)
        continue
      }

      const { error: insertLogError } = await supabase
        .from('notification_log')
        .insert([
          {
            bill_id: bill.id,
            type: notificationType,
          },
        ])

      if (insertLogError) {
        console.error(
          `Correo enviado pero no se pudo guardar log para ${bill.title}:`,
          insertLogError
        )
      }

      sent.push(bill.title)
      console.log(`Correo enviado correctamente para ${bill.title}`)
    }

    return NextResponse.json({
      ok: true,
      message: 'Proceso completado',
      sent,
      skipped,
      mexicoToday: mexicoToday.dateString,
    })
  } catch (err) {
    console.error('Error interno:', err)
    return NextResponse.json(
      { error: 'Error interno al enviar recordatorios' },
      { status: 500 }
    )
  }
}
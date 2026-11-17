import type { Order } from '../types'

const csvCell = (value: string | number | boolean) => {
  const text = String(value)
  const safe = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

/** CSV for all loaded orders, including archived and cancelled orders. */
export function ordersCsv(orders: Order[]): string {
  const columns = ['order_number', 'created_at', 'status', 'archived', 'mode', 'customer', 'items', 'subtotal', 'delivery_fee', 'total', 'paid', 'table', 'address']
  const rows = orders.map((o) => [
    o.n, o.at, o.status, !!o.archived, o.mode, o.who,
    o.items.map((item) => `${item.qty}x ${item.itemId}${item.free ? ' (reward)' : ''}`).join('; '),
    o.subtotal, o.fee, o.total, o.paid, o.table ?? '', o.address ?? '',
  ])
  return [columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
}

export function downloadOrdersCsv(orders: Order[]) {
  const blob = new Blob(['\uFEFF', ordersCsv(orders)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `meet-lounge-orders-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

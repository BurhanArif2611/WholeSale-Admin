import type { Client } from '@/lib/domain/models';
import type { CartLineInput } from '@/lib/common/utils/cart';
import type { CartBreakdown } from '@/lib/common/utils/orderDiscount';
import { formatQuantityDisplay, unitLabel } from '@/lib/common/utils/quantity';

export interface OrderPreviewInput {
  client: Client;
  cart: CartLineInput[];
  breakdown: CartBreakdown;
  orderDiscountAmount: number;
  finalPayable: number;
  paid: number;
  remaining: number;
  paymentMode: string;
  notes?: string;
  deliveryDate?: string;
}

function rupee(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function generateOrderPreviewHtml(input: OrderPreviewInput): string {
  const { client, cart, breakdown, orderDiscountAmount, finalPayable, paid, remaining, paymentMode, notes, deliveryDate } = input;
  const now = new Date().toLocaleString('en-IN');
  const rows = cart
    .map(
      (item, i) => `
    <tr style="background:${i % 2 ? '#f8fafc' : '#fff'}">
      <td style="padding:10px;border:1px solid #e2e8f0">${i + 1}</td>
      <td style="padding:10px;border:1px solid #e2e8f0">${item.product_name}${item.is_temporary ? ' <span style="color:#3b82f6;font-size:11px">(Temp)</span>' : ''}</td>
      <td style="padding:10px;border:1px solid #e2e8f0;text-align:center">${formatQuantityDisplay(item.quantity)} ${unitLabel(item.order_unit)}</td>
      <td style="padding:10px;border:1px solid #e2e8f0;text-align:right">${rupee(item.unit_price)}</td>
      <td style="padding:10px;border:1px solid #e2e8f0;text-align:right;font-weight:700">${rupee(item.line_total)}</td>
    </tr>`,
    )
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:20px;color:#1e293b;background:#f8fafc}
.hdr{background:linear-gradient(135deg,#334155,#1e293b);color:#fff;padding:20px;border-radius:12px;margin-bottom:16px}
.card{background:#fff;border-radius:12px;padding:16px;margin-bottom:12px;border:1px solid #e2e8f0}
.total{font-size:22px;font-weight:800;color:#f59e0b}
table{width:100%;border-collapse:collapse;font-size:13px}
</style></head><body>
<div class="hdr"><h1 style="margin:0 0 4px;font-size:18px">Order Preview</h1><p style="margin:0;opacity:.85;font-size:12px">${now}</p></div>
<div class="card"><b>Bill To</b><p style="margin:8px 0 0">${client.name}</p><p style="margin:4px 0;color:#64748b">${client.mobile}</p>
${client.address ? `<p style="margin:4px 0;color:#64748b">${client.address}</p>` : ''}</div>
<div class="card"><table><thead><tr style="background:#f1f5f9">
<th style="padding:8px;border:1px solid #e2e8f0">#</th><th style="padding:8px;border:1px solid #e2e8f0">Item</th>
<th style="padding:8px;border:1px solid #e2e8f0">Qty</th><th style="padding:8px;border:1px solid #e2e8f0">Rate</th>
<th style="padding:8px;border:1px solid #e2e8f0">Amount</th></tr></thead><tbody>${rows}</tbody></table></div>
<div class="card">
<p>Subtotal: ${rupee(breakdown.subtotal)}</p>
${breakdown.lineDiscount > 0 ? `<p>Product Discount: −${rupee(breakdown.lineDiscount)}</p>` : ''}
${breakdown.taxTotal > 0 ? `<p>Tax: ${rupee(breakdown.taxTotal)}</p>` : ''}
${orderDiscountAmount > 0 ? `<p>Client Discount: −${rupee(orderDiscountAmount)}</p>` : ''}
<p class="total">Total Payable: ${rupee(finalPayable)}</p>
<p>Paid: ${rupee(paid)} · Due: ${rupee(remaining)}</p>
<p>Payment: ${paymentMode}</p>
${deliveryDate ? `<p>Delivery: ${deliveryDate}</p>` : ''}
${notes ? `<p>Notes: ${notes}</p>` : ''}
</div></body></html>`;
}

export function buildOrderShareText(input: OrderPreviewInput): string {
  const lines = input.cart.map(
    (i) =>
      `• ${i.product_name}: ${formatQuantityDisplay(i.quantity)} ${unitLabel(i.order_unit)} = ₹${i.line_total.toFixed(2)}`,
  );
  return [
    `*Order for ${input.client.name}*`,
    '',
    ...lines,
    '',
    `*Total: ₹${input.finalPayable.toFixed(2)}*`,
    `Paid: ₹${input.paid.toFixed(2)} | Due: ₹${input.remaining.toFixed(2)}`,
    `Payment: ${input.paymentMode}`,
  ].join('\n');
}

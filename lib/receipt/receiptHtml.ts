import type { ReceiptData } from '@/lib/receipt/receiptTypes';

function rupee(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function paymentStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/** Professional invoice HTML — print-ready, inspired by retail estimate receipts. */
export function generateReceiptHtml(data: ReceiptData): string {
  const rows = data.items
    .map(
      (item, i) => `
      <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'}">
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;font-size:13px">${item.name}${item.isTemporary ? ' <span style="color:#6366f1;font-size:10px">(Temp)</span>' : ''}</td>
        <td style="padding:10px 6px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:13px">${item.quantity} ${item.unit}</td>
        <td style="padding:10px 6px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:13px">${rupee(item.rate)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:13px;font-weight:700">${rupee(item.total)}</td>
      </tr>`,
    )
    .join('');

  const shopAddr = data.shop.address ? `<div class="muted">${data.shop.address}</div>` : '';
  const shopPhone = data.shop.phone ? `<div class="muted">📞 ${data.shop.phone}</div>` : '';
  const billAddr = data.client.address
    ? `<tr><td class="label">Billing Address</td><td class="value">${data.client.address.replace(/\n/g, '<br/>')}</td></tr>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Invoice #${data.invoiceNo}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 16px; color: #1e293b; background: #fff; }
    .receipt { max-width: 400px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .shop-header { text-align: center; padding: 20px 16px 12px; border-bottom: 2px solid #1e293b; }
    .shop-name { font-size: 20px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.3px; }
    .muted { font-size: 12px; color: #64748b; line-height: 1.5; }
    .meta { padding: 14px 16px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
    .meta table { width: 100%; border-collapse: collapse; }
    .label { color: #64748b; padding: 3px 8px 3px 0; vertical-align: top; width: 38%; }
    .value { font-weight: 600; padding: 3px 0; }
    table.items { width: 100%; border-collapse: collapse; }
    table.items thead th { background: #f1f5f9; padding: 10px 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; border-bottom: 2px solid #cbd5e1; }
    .summary { padding: 14px 16px; border-top: 2px solid #1e293b; }
    .summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
    .grand { font-size: 22px; font-weight: 900; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1; }
    .status { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .paid { background: #d1fae5; color: #047857; }
    .partial { background: #fef3c7; color: #b45309; }
    .pending { background: #fee2e2; color: #b91c1c; }
    .footer { text-align: center; padding: 16px; background: #f8fafc; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .badge-row { text-align: right; padding: 8px 12px 0; }
    .badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 4px 8px; border-radius: 4px; margin-left: 4px; }
    .pdf { background: #d1fae5; color: #047857; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="badge-row">
      <span class="badge pdf">INVOICE</span>
    </div>
    <div class="shop-header">
      <div class="shop-name">${data.shop.name}</div>
      ${shopAddr}
      ${shopPhone}
    </div>
    <div class="meta">
      <table>
        <tr><td class="label">Bill No</td><td class="value">#${data.invoiceNo}</td></tr>
        <tr><td class="label">Created On</td><td class="value">${formatDate(data.createdAt)}</td></tr>
        <tr><td class="label">Bill To</td><td class="value">${data.client.name} | ${data.client.mobile}</td></tr>
        ${billAddr}
        <tr><td class="label">Payment</td><td class="value">${data.paymentMode} · <span class="status ${data.paymentStatus}">${paymentStatusLabel(data.paymentStatus)}</span></td></tr>
      </table>
    </div>
    <table class="items">
      <thead>
        <tr>
          <th style="text-align:left">Item Name</th>
          <th>Qty</th>
          <th style="text-align:right">Rate</th>
          <th style="text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="summary">
      <div class="summary-row"><span>Total Items</span><span>${data.totalItems}</span></div>
      <div class="summary-row"><span>Total Quantity</span><span>${data.totalQty}</span></div>
      <div class="summary-row"><span>Sub Total</span><span>${rupee(data.subtotal)}</span></div>
      ${data.productDiscount > 0 ? `<div class="summary-row"><span>Product Discount</span><span>−${rupee(data.productDiscount)}</span></div>` : ''}
      ${data.taxTotal > 0 ? `<div class="summary-row"><span>Tax / GST</span><span>${rupee(data.taxTotal)}</span></div>` : ''}
      ${data.clientDiscount > 0 ? `<div class="summary-row"><span>Client Discount</span><span>−${rupee(data.clientDiscount)}</span></div>` : ''}
      <div class="summary-row grand"><span>Total</span><span>${rupee(data.grandTotal)}</span></div>
      <div class="summary-row"><span>Paid</span><span>${rupee(data.paid)}</span></div>
      ${data.remaining > 0 ? `<div class="summary-row"><span>Balance Due</span><span style="color:#dc2626">${rupee(data.remaining)}</span></div>` : ''}
      ${data.notes ? `<div class="summary-row" style="margin-top:8px;font-style:italic"><span>Notes</span><span>${data.notes}</span></div>` : ''}
    </div>
    <div class="footer">
      <div style="font-weight:700;color:#1e293b;margin-bottom:4px">Thank You! Visit Again!</div>
      <div>Powered by WholeSale Admin</div>
    </div>
  </div>
</body>
</html>`;
}

export function buildReceiptWhatsAppText(data: ReceiptData): string {
  const lines = data.items.map(
    (i) => `• ${i.name} — ${i.quantity} ${i.unit} × ${rupee(i.rate)} = ${rupee(i.total)}`,
  );
  return [
    `*${data.shop.name}*`,
    `Invoice #${data.invoiceNo}`,
    `Date: ${formatDate(data.createdAt)}`,
    '',
    `*Bill To:* ${data.client.name}`,
    `Phone: ${data.client.mobile}`,
    '',
    '*Items:*',
    ...lines,
    '',
    `*Total: ${rupee(data.grandTotal)}*`,
    `Paid: ${rupee(data.paid)} | Due: ${rupee(data.remaining)}`,
    `Payment: ${data.paymentMode} (${data.paymentStatus})`,
    '',
    'Thank you for your business!',
  ].join('\n');
}

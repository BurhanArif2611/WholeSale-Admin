// lib/invoiceTemplate.ts
import type { Order } from '@/types';

export function generateInvoiceHtml(order: Order, ownerName?: string): string {
  const storeName  = order.stores?.name  ?? 'N/A';
  const storeArea  = order.stores?.area  ?? '';
  const storePhone = order.stores?.phone ?? '';
  const items      = order.order_items   ?? [];
  const invoiceNo  = order.id.slice(0, 8).toUpperCase();

  const date = (() => {
    try { return new Date(order.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }
    catch { return order.date; }
  })();

  const rupee = (n: number | string) => {
    const v = Number(n);
    return isNaN(v) ? 'Rs. 0.00' : 'Rs. ' + v.toFixed(2);
  };

  const statusColor = order.status === 'Paid' ? '#10B981' : '#F59E0B';

  const itemRows = items.map((item: any, i: number) => `
    <tr style="background-color:${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
      <td style="padding:8px 10px; border:1px solid #e5e7eb; text-align:center;">${i + 1}</td>
      <td style="padding:8px 10px; border:1px solid #e5e7eb;">${item.material_name}</td>
      <td style="padding:8px 10px; border:1px solid #e5e7eb; text-align:center;">${item.quantity}</td>
      <td style="padding:8px 10px; border:1px solid #e5e7eb; text-align:right;">${rupee(item.price_at_time_of_sale)}</td>
      <td style="padding:8px 10px; border:1px solid #e5e7eb; text-align:right; font-weight:bold;">${rupee(item.subtotal)}</td>
    </tr>`).join('') || `
    <tr>
      <td colspan="5" style="padding:16px; text-align:center; color:#94a3b8; border:1px solid #e5e7eb;">No items</td>
    </tr>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice</title>
</head>
<body style="font-family: Arial, sans-serif; font-size: 13px; color: #1e293b; margin: 0; padding: 24px;">

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px; border-bottom:2px solid #f1f5f9; padding-bottom:16px;">
    <tr>
      <td>
        <p style="font-size:20px; font-weight:bold; margin:0;">${ownerName ?? 'Wholesale Admin'}</p>
        <p style="font-size:10px; color:#94a3b8; margin:4px 0 0 0; text-transform:uppercase; letter-spacing:1px;">Tax Invoice</p>
      </td>
      <td style="text-align:right;">
        <p style="font-size:10px; color:#94a3b8; margin:0;">INVOICE NO</p>
        <p style="font-size:15px; font-weight:bold; margin:4px 0;">#${invoiceNo}</p>
        <p style="font-size:10px; margin:4px 0 0 0; padding:3px 10px; background-color:${statusColor}20; color:${statusColor}; border:1px solid ${statusColor}; border-radius:4px; display:inline-block;">${order.status}</p>
      </td>
    </tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
    <tr>
      <td width="50%" style="vertical-align:top; padding-right:12px;">
        <table width="100%" cellpadding="8" cellspacing="0" style="border:1px solid #e2e8f0;">
          <tr><td style="background-color:#f8fafc; border-bottom:1px solid #e2e8f0;"><p style="font-size:9px; font-weight:bold; color:#94a3b8; margin:0; text-transform:uppercase; letter-spacing:1px;">BILL TO</p></td></tr>
          <tr><td>
            <p style="font-size:14px; font-weight:bold; margin:0 0 4px 0;">${storeName}</p>
            ${storeArea  ? `<p style="margin:2px 0; color:#64748b;">Location: ${storeArea}</p>`  : ''}
            ${storePhone ? `<p style="margin:2px 0; color:#64748b;">Phone: ${storePhone}</p>` : ''}
          </td></tr>
        </table>
      </td>
      <td width="50%" style="vertical-align:top; padding-left:12px;">
        <table width="100%" cellpadding="8" cellspacing="0" style="border:1px solid #e2e8f0;">
          <tr><td style="background-color:#f8fafc; border-bottom:1px solid #e2e8f0;"><p style="font-size:9px; font-weight:bold; color:#94a3b8; margin:0; text-transform:uppercase; letter-spacing:1px;">INVOICE DETAILS</p></td></tr>
          <tr><td>
            <p style="font-size:14px; font-weight:bold; margin:0 0 4px 0;">${date}</p>
            <p style="margin:2px 0; color:#64748b;">${items.length} item${items.length !== 1 ? 's' : ''}</p>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-bottom:20px;">
    <thead>
      <tr style="background-color:#1e293b; color:#ffffff;">
        <th style="padding:10px; border:1px solid #334155; width:36px;">#</th>
        <th style="padding:10px; border:1px solid #334155; text-align:left;">Product / Item</th>
        <th style="padding:10px; border:1px solid #334155; width:60px;">Qty</th>
        <th style="padding:10px; border:1px solid #334155; width:100px; text-align:right;">Rate</th>
        <th style="padding:10px; border:1px solid #334155; width:110px; text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
    <tr>
      <td width="60%"></td>
      <td width="40%">
        <table width="100%" cellpadding="8" cellspacing="0" style="border:1px solid #e2e8f0;">
          <tr>
            <td style="color:#64748b;">Subtotal</td>
            <td style="text-align:right;">${rupee(order.grand_total)}</td>
          </tr>
          <tr style="border-top:2px solid #e2e8f0;">
            <td style="font-weight:bold; font-size:15px;">TOTAL</td>
            <td style="font-weight:bold; font-size:15px; text-align:right;">${rupee(order.grand_total)}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f1f5f9; padding-top:16px;">
    <tr>
      <td style="color:#94a3b8; font-size:11px;">Thank you for your business!</td>
      <td style="text-align:right; color:#cbd5e1; font-size:10px; font-weight:bold; text-transform:uppercase; letter-spacing:1px;">Powered by Wholesale Admin</td>
    </tr>
  </table>

</body>
</html>`;
}

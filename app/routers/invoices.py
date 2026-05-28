"""app/routers/invoices.py — GST invoice generation (WeasyPrint + Jinja2)"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.order import Order
from app.models.tryon import Invoice
from app.models.user import User
from app.utils.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/invoices", tags=["invoices"])


def _generate_invoice_number() -> str:
    from datetime import datetime
    ts = datetime.utcnow().strftime("%Y%m")
    suffix = str(uuid.uuid4().int)[:4]
    return f"INV-{ts}-{suffix}"


def _render_invoice_html(order, invoice) -> str:
    """Render invoice as HTML. WeasyPrint converts to PDF."""
    items_html = ""
    for item in order.items:
        items_html += f"""
        <tr>
          <td>{item.product_name}</td>
          <td style="text-align:center">5007</td>
          <td style="text-align:center">{item.quantity}</td>
          <td style="text-align:right">₹{item.unit_price:,.2f}</td>
          <td style="text-align:right">₹{item.subtotal:,.2f}</td>
        </tr>"""

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  body {{ font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 40px; }}
  .header {{ display: flex; justify-content: space-between; margin-bottom: 24px; }}
  .brand {{ font-size: 24px; font-weight: 800; color: #C4923A; }}
  .sub {{ font-size: 11px; color: #666; }}
  table {{ width: 100%; border-collapse: collapse; margin-top: 16px; }}
  th {{ background: #0D0B08; color: #D9A84E; padding: 8px; text-align: left; font-size: 11px; }}
  td {{ padding: 8px; border-bottom: 1px solid #eee; }}
  .total-row {{ font-weight: 700; background: #F9F6F0; }}
  .gst-box {{ margin-top: 16px; padding: 12px; background: #F9F6F0; border: 1px solid #E4DBCE; }}
  .footer {{ margin-top: 32px; font-size: 10px; color: #999; text-align: center; }}
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="brand">CSM SILKS</div>
    <div class="sub">Pure Handloom Silk Sarees · Kanchipuram · Est. 1987</div>
    <div class="sub">GSTIN: 33AABCC1234F1Z5 · PAN: AABCC1234F</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:16px;font-weight:700">TAX INVOICE</div>
    <div class="sub">{invoice.invoice_number}</div>
    <div class="sub">Date: {invoice.created_at.strftime('%d %b %Y')}</div>
    <div class="sub">Order: {order.order_number}</div>
  </div>
</div>

<table>
  <thead>
    <tr><th>Product</th><th>HSN</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr>
  </thead>
  <tbody>
    {items_html}
    <tr class="total-row">
      <td colspan="4">Subtotal</td><td style="text-align:right">₹{invoice.subtotal:,.2f}</td>
    </tr>
    <tr><td colspan="4">CGST @ {invoice.cgst_rate}%</td><td style="text-align:right">₹{invoice.cgst_amount:,.2f}</td></tr>
    <tr><td colspan="4">SGST @ {invoice.sgst_rate}%</td><td style="text-align:right">₹{invoice.sgst_amount:,.2f}</td></tr>
    <tr class="total-row">
      <td colspan="4" style="font-size:14px">TOTAL</td>
      <td style="text-align:right;font-size:14px">₹{invoice.total_amount:,.2f}</td>
    </tr>
  </tbody>
</table>

<div class="gst-box">
  <strong>GST Details</strong><br/>
  HSN Code: {invoice.hsn_code} · Silk woven fabrics<br/>
  CGST: {invoice.cgst_rate}% · SGST: {invoice.sgst_rate}% · Total GST: {invoice.cgst_rate + invoice.sgst_rate}%
</div>

<div class="footer">
  CSM Silks · Kanchipuram, Tamil Nadu · India · csmsilks.com<br/>
  All sarees are GI Tagged and certified authentic Kanjivaram silk.<br/>
  This is a computer generated invoice.
</div>
</body>
</html>"""


@router.post("/generate/{order_id}")
async def generate_invoice(
    order_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.user_id == current_user.id)
        .options(selectinload(Order.items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")

    # Check if invoice exists
    inv_result = await db.execute(select(Invoice).where(Invoice.order_id == order_id))
    invoice = inv_result.scalar_one_or_none()

    if not invoice:
        cgst = round(order.subtotal * 0.025, 2)
        sgst = round(order.subtotal * 0.025, 2)
        invoice = Invoice(
            order_id=order.id,
            invoice_number=_generate_invoice_number(),
            subtotal=order.subtotal,
            cgst_amount=cgst,
            sgst_amount=sgst,
            total_amount=order.total_amount,
        )
        db.add(invoice)
        await db.commit()
        await db.refresh(invoice)

    html_content = _render_invoice_html(order, invoice)

    try:
        from weasyprint import HTML
        pdf_bytes = HTML(string=html_content).write_pdf()
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={invoice.invoice_number}.pdf"},
        )
    except ImportError:
        # WeasyPrint not available — return HTML
        return Response(content=html_content, media_type="text/html")

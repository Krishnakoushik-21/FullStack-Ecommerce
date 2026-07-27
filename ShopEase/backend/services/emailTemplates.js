'use strict';

/**
 * emailTemplates.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsive HTML email templates for ShopEase.
 * Each exported function returns { subject, html, text }.
 *
 * Design principles
 *  • Table-based layout for maximum email-client compatibility
 *  • Inline CSS only (Gmail strips <style> blocks)
 *  • Mobile-responsive via max-width + fluid widths
 *  • ShopEase brand colours: primary #2563EB, accent #7C3AED
 *  • Dark-mode friendly neutral backgrounds
 */

// ─── Shared brand constants ───────────────────────────────────────────────────
const BRAND = {
    primary   : '#2563EB',
    accent    : '#7C3AED',
    success   : '#22C55E',
    warning   : '#F59E0B',
    danger    : '#EF4444',
    bg        : '#F4F7FC',
    surface   : '#FFFFFF',
    textMain  : '#0F172A',
    textMuted : '#64748B',
    border    : '#E2E8F0',
    fontStack : "'-apple-system,BlinkMacSystemFont,\"Segoe UI\",Poppins,sans-serif'",
};

// ─── Shared layout wrappers ───────────────────────────────────────────────────
function wrapEmail(bodyContent) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>ShopEase</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Poppins,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:${BRAND.surface};border-radius:24px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND.primary} 0%,${BRAND.accent} 100%);padding:32px 40px;text-align:center;">
              <div style="display:inline-block;">
                <span style="font-size:28px;font-weight:900;color:#FFFFFF;letter-spacing:-1px;">🛍 ShopEase</span>
              </div>
            </td>
          </tr>

          <!-- Body -->
          ${bodyContent}

          <!-- Footer -->
          <tr>
            <td style="background-color:#F8FAFC;padding:28px 40px;text-align:center;border-top:1px solid ${BRAND.border};">
              <p style="margin:0 0 8px;font-size:13px;color:${BRAND.textMuted};">© ${new Date().getFullYear()} ShopEase. All rights reserved.</p>
              <p style="margin:0;font-size:12px;color:${BRAND.textMuted};">
                This email was sent to you because you have an account with ShopEase.<br>
                If you did not request this, please ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function sectionRow(content) {
    return `<tr><td style="padding:36px 40px;">${content}</td></tr>`;
}

function bigButton(url, label, color = BRAND.primary) {
    return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 0;">
      <tr>
        <td style="background-color:${color};border-radius:28px;text-align:center;">
          <a href="${url}" target="_blank"
             style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;letter-spacing:0.3px;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

function divider() {
    return `<tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid ${BRAND.border};margin:0;"></td></tr>`;
}

function infoRow(label, value) {
    return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;font-weight:600;color:${BRAND.textMuted};width:40%;">${label}</td>
            <td style="font-size:13px;font-weight:700;color:${BRAND.textMain};text-align:right;">${value}</td>
          </tr>
        </table>
      </td>
    </tr>`;
}

// ─── 1. Email Verification ────────────────────────────────────────────────────
/**
 * @param {string} name        – user's display name
 * @param {string} verifyUrl   – full URL including token
 * @returns {{ subject, html, text }}
 */
function verificationEmail({ name, verifyUrl }) {
    const subject = 'Verify your ShopEase email address';

    const html = wrapEmail(sectionRow(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;width:72px;height:72px;background:linear-gradient(135deg,#EFF6FF,#F5F3FF);border-radius:50%;line-height:72px;font-size:36px;">✉️</div>
      </div>
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:${BRAND.textMain};text-align:center;letter-spacing:-0.5px;">
        Confirm your email
      </h1>
      <p style="margin:0 0 8px;font-size:15px;color:${BRAND.textMuted};text-align:center;line-height:1.6;">
        Hi <strong style="color:${BRAND.textMain};">${escHtml(name)}</strong>, welcome to ShopEase! 🎉
      </p>
      <p style="margin:0;font-size:15px;color:${BRAND.textMuted};text-align:center;line-height:1.6;">
        Click the button below to verify your email address and activate your account.
        This link expires in <strong>24 hours</strong>.
      </p>

      ${bigButton(verifyUrl, 'Verify Email Address')}

      <p style="margin:28px 0 0;font-size:12px;color:${BRAND.textMuted};text-align:center;line-height:1.6;">
        If the button doesn't work, paste this URL into your browser:<br>
        <a href="${verifyUrl}" style="color:${BRAND.primary};word-break:break-all;">${verifyUrl}</a>
      </p>
    `));

    const text = `Hi ${name},\n\nWelcome to ShopEase!\n\nVerify your email address by visiting:\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you didn't create an account, ignore this email.\n\nShopEase Team`;

    return { subject, html, text };
}

// ─── 2. Password Reset ────────────────────────────────────────────────────────
/**
 * @param {string} name       – user's display name
 * @param {string} resetUrl   – full URL including token
 * @returns {{ subject, html, text }}
 */
function passwordResetEmail({ name, resetUrl }) {
    const subject = 'Reset your ShopEase password';

    const html = wrapEmail(sectionRow(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;width:72px;height:72px;background:#FEF2F2;border-radius:50%;line-height:72px;font-size:36px;">🔐</div>
      </div>
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:${BRAND.textMain};text-align:center;letter-spacing:-0.5px;">
        Reset your password
      </h1>
      <p style="margin:0 0 8px;font-size:15px;color:${BRAND.textMuted};text-align:center;line-height:1.6;">
        Hi <strong style="color:${BRAND.textMain};">${escHtml(name)}</strong>,
      </p>
      <p style="margin:0;font-size:15px;color:${BRAND.textMuted};text-align:center;line-height:1.6;">
        We received a request to reset your password. Click the button below to choose a new password.
        This link expires in <strong>1 hour</strong>.
      </p>

      ${bigButton(resetUrl, 'Reset Password', BRAND.danger)}

      <div style="margin:28px 0 0;padding:16px;background:#FEF9C3;border-radius:12px;border-left:4px solid ${BRAND.warning};">
        <p style="margin:0;font-size:13px;color:#92400E;font-weight:600;">
          ⚠️ If you did not request a password reset, please ignore this email.
          Your password will remain unchanged and no action is required.
        </p>
      </div>

      <p style="margin:20px 0 0;font-size:12px;color:${BRAND.textMuted};text-align:center;line-height:1.6;">
        If the button doesn't work, paste this URL into your browser:<br>
        <a href="${resetUrl}" style="color:${BRAND.danger};word-break:break-all;">${resetUrl}</a>
      </p>
    `));

    const text = `Hi ${name},\n\nWe received a request to reset your ShopEase password.\n\nReset your password:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request a password reset, ignore this email.\n\nShopEase Team`;

    return { subject, html, text };
}

// ─── 3. Order Confirmation ────────────────────────────────────────────────────
/**
 * @param {object} params
 *   name, email, orderId, invoiceNumber, trackingNumber,
 *   items[{ name, brand, quantity, price, image_url }],
 *   subtotal, discount, deliveryFee, totalAmount,
 *   paymentMethod, shippingAddress, expectedDelivery
 */
function orderConfirmationEmail(params) {
    const {
        name, orderId, invoiceNumber, trackingNumber,
        items = [], subtotal, discount, deliveryFee, totalAmount,
        paymentMethod, shippingAddress, expectedDelivery,
    } = params;

    const subject = `Order Confirmed! #${orderId} – ShopEase`;

    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid ${BRAND.border};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:56px;vertical-align:top;padding-right:12px;">
                <img src="${item.image_url || ''}" alt="${escHtml(item.name)}"
                     width="56" height="56"
                     style="border-radius:10px;object-fit:cover;background:#F1F5F9;display:block;">
              </td>
              <td style="vertical-align:top;">
                <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:${BRAND.textMain};">${escHtml(item.name)}</p>
                <p style="margin:0 0 4px;font-size:11px;color:${BRAND.textMuted};text-transform:uppercase;font-weight:600;">${escHtml(item.brand || '')}</p>
                <p style="margin:0;font-size:12px;color:${BRAND.textMuted};">Qty: ${item.quantity}</p>
              </td>
              <td style="vertical-align:top;text-align:right;white-space:nowrap;">
                <p style="margin:0;font-size:14px;font-weight:800;color:${BRAND.textMain};">
                  ₹${fmt(item.price * item.quantity)}
                </p>
                <p style="margin:4px 0 0;font-size:11px;color:${BRAND.textMuted};">₹${fmt(item.price)} each</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`).join('');

    const html = wrapEmail(`
      <!-- Green success banner -->
      <tr>
        <td style="background:linear-gradient(135deg,#22C55E,#10B981);padding:24px 40px;text-align:center;">
          <p style="margin:0;font-size:32px;">✅</p>
          <h2 style="margin:8px 0 4px;font-size:20px;font-weight:800;color:#FFFFFF;">Order Confirmed!</h2>
          <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.9);">
            Thank you, <strong>${escHtml(name)}</strong>. Your order is being processed.
          </p>
        </td>
      </tr>

      ${sectionRow(`
        <!-- Order meta -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          ${infoRow('Order ID', `#${orderId}`)}
          ${infoRow('Invoice', invoiceNumber)}
          ${infoRow('Tracking ID', trackingNumber)}
          ${infoRow('Payment', escHtml(paymentMethod))}
          ${infoRow('Expected Delivery', escHtml(expectedDelivery || '2–3 Days'))}
        </table>

        <!-- Items -->
        <h3 style="margin:0 0 12px;font-size:15px;font-weight:800;color:${BRAND.textMain};">Items Ordered</h3>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${itemsHtml}
        </table>

        <!-- Totals -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;background:#F8FAFC;border-radius:12px;padding:16px;">
          <tr>
            <td style="padding:6px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:13px;color:${BRAND.textMuted};padding:4px 0;">Subtotal</td>
                  <td style="font-size:13px;color:${BRAND.textMain};text-align:right;font-weight:600;">₹${fmt(subtotal)}</td>
                </tr>
                ${discount > 0 ? `<tr>
                  <td style="font-size:13px;color:${BRAND.success};padding:4px 0;">Discount</td>
                  <td style="font-size:13px;color:${BRAND.success};text-align:right;font-weight:600;">−₹${fmt(discount)}</td>
                </tr>` : ''}
                <tr>
                  <td style="font-size:13px;color:${BRAND.textMuted};padding:4px 0;">Delivery</td>
                  <td style="font-size:13px;color:${BRAND.textMain};text-align:right;font-weight:600;">${deliveryFee === 0 ? 'FREE' : '₹' + fmt(deliveryFee)}</td>
                </tr>
                <tr>
                  <td style="font-size:15px;font-weight:800;color:${BRAND.textMain};padding-top:10px;border-top:2px solid ${BRAND.border};">Total Paid</td>
                  <td style="font-size:16px;font-weight:900;color:${BRAND.primary};text-align:right;padding-top:10px;border-top:2px solid ${BRAND.border};">₹${fmt(totalAmount)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Shipping Address -->
        <div style="margin-top:20px;padding:16px;background:#F0F9FF;border-radius:12px;border-left:4px solid ${BRAND.primary};">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${BRAND.primary};">📦 Delivery Address</p>
          <p style="margin:0;font-size:13px;color:${BRAND.textMuted};line-height:1.5;">${escHtml(shippingAddress)}</p>
        </div>
      `)}
    `);

    const text = `Hi ${name},\n\nYour ShopEase order #${orderId} is confirmed!\n\nInvoice: ${invoiceNumber}\nTracking: ${trackingNumber}\nPayment: ${paymentMethod}\nDelivery: ${expectedDelivery}\n\nTotal: ₹${fmt(totalAmount)}\n\nDelivery address:\n${shippingAddress}\n\nThank you for shopping with ShopEase!`;

    return { subject, html, text };
}

// ─── 4. Order Status Update ───────────────────────────────────────────────────
/**
 * @param {object} params
 *   name, orderId, trackingNumber, newStatus, expectedDelivery, items[]
 */
function orderStatusEmail(params) {
    const { name, orderId, trackingNumber, newStatus, expectedDelivery, items = [] } = params;

    const subject = `Your order #${orderId} is now ${newStatus} – ShopEase`;

    // Status-specific visuals
    const STATUS_CONFIG = {
        'Processing' : { emoji: '⚙️',  color: '#0C5460', bg: '#D1ECF1', label: 'Being Processed'  },
        'Shipped'    : { emoji: '🚚',  color: '#856404', bg: '#FFF3CD', label: 'On the Way!'       },
        'Delivered'  : { emoji: '🎉',  color: '#1E824C', bg: '#E2FBE7', label: 'Delivered!'        },
        'Cancelled'  : { emoji: '❌',  color: '#721C24', bg: '#F8D7DA', label: 'Cancelled'         },
        'Returned'   : { emoji: '↩️',  color: '#383D41', bg: '#E2E3E5', label: 'Return Initiated'  },
    };

    const cfg = STATUS_CONFIG[newStatus] || { emoji: '📦', color: BRAND.primary, bg: '#EFF6FF', label: newStatus };

    const itemsHtml = items.slice(0, 3).map(item => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid ${BRAND.border};">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:44px;padding-right:10px;vertical-align:middle;">
                <img src="${item.image_url || ''}" alt="${escHtml(item.name)}"
                     width="44" height="44"
                     style="border-radius:8px;object-fit:cover;background:#F1F5F9;display:block;">
              </td>
              <td style="vertical-align:middle;">
                <p style="margin:0;font-size:12px;font-weight:700;color:${BRAND.textMain};">${escHtml(item.name)}</p>
                <p style="margin:2px 0 0;font-size:11px;color:${BRAND.textMuted};">Qty: ${item.quantity} · ₹${fmt(item.price)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`).join('');

    const html = wrapEmail(`
      <!-- Status banner -->
      <tr>
        <td style="background-color:${cfg.bg};padding:28px 40px;text-align:center;">
          <p style="margin:0;font-size:40px;">${cfg.emoji}</p>
          <h2 style="margin:10px 0 4px;font-size:20px;font-weight:800;color:${cfg.color};">
            Order ${cfg.label}
          </h2>
          <p style="margin:0;font-size:14px;color:${cfg.color};opacity:0.85;">
            Hi <strong>${escHtml(name)}</strong>, here's the latest on your order.
          </p>
        </td>
      </tr>

      ${sectionRow(`
        <!-- Order meta -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
          ${infoRow('Order ID', `#${orderId}`)}
          ${infoRow('Tracking ID', trackingNumber || 'N/A')}
          ${infoRow('Current Status', `<strong style="color:${cfg.color};">${newStatus}</strong>`)}
          ${expectedDelivery ? infoRow('Expected Delivery', escHtml(expectedDelivery)) : ''}
        </table>

        ${items.length > 0 ? `
        <h3 style="margin:0 0 10px;font-size:14px;font-weight:800;color:${BRAND.textMain};">Your Items</h3>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${itemsHtml}
          ${items.length > 3 ? `<tr><td style="padding:8px 0;font-size:12px;color:${BRAND.textMuted};">…and ${items.length - 3} more item(s)</td></tr>` : ''}
        </table>` : ''}

        ${newStatus === 'Delivered' ? `
        <div style="margin-top:20px;padding:16px;background:#F0FDF4;border-radius:12px;border-left:4px solid ${BRAND.success};text-align:center;">
          <p style="margin:0;font-size:14px;font-weight:700;color:#166534;">
            🌟 Enjoying your purchase? Leave a review and help others!
          </p>
        </div>` : ''}
      `)}
    `);

    const text = `Hi ${name},\n\nYour ShopEase order #${orderId} status has been updated to: ${newStatus}\n\nTracking ID: ${trackingNumber || 'N/A'}\n${expectedDelivery ? `Expected Delivery: ${expectedDelivery}\n` : ''}\nThank you for shopping with ShopEase!`;

    return { subject, html, text };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format number as Indian currency string */
function fmt(n) {
    return Number(n || 0).toLocaleString('en-IN');
}

/** Escape HTML special chars to prevent injection in email body */
function escHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
    verificationEmail,
    passwordResetEmail,
    orderConfirmationEmail,
    orderStatusEmail,
};

'use strict';

/**
 * emailService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Production-ready email service for ShopEase.
 *
 * Features
 *  • Nodemailer transport configured for Brevo (Sendinblue) SMTP
 *  • Falls back gracefully when SMTP credentials are not yet configured
 *    (logs the email to console instead of crashing the server)
 *  • Per-email retry with exponential back-off (3 attempts max)
 *  • In-memory retry queue drained every 5 minutes via node-cron
 *  • Structured console logging (timestamp + level + subject + recipient)
 *  • All template rendering lives in emailTemplates.js – this module only
 *    handles transport concerns
 */

const nodemailer = require('nodemailer');
const cron       = require('node-cron');

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_RETRIES     = 3;
const RETRY_BASE_MS   = 5_000;   // 5 s  →  10 s  →  20 s  (exponential)
const RETRY_CRON      = '*/5 * * * *'; // every 5 minutes

// ─── Retry queue ──────────────────────────────────────────────────────────────
// Each entry: { mailOptions, attempts, nextRetryAt }
const retryQueue = [];

// ─── Logger ───────────────────────────────────────────────────────────────────
function log(level, message, extra = '') {
    const ts = new Date().toISOString();
    console.log(`[${ts}] [EMAIL:${level.toUpperCase()}] ${message} ${extra}`);
}

// ─── Transport factory ────────────────────────────────────────────────────────
function createTransport() {
    const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS ||
        SMTP_USER === 'your_brevo_login_email@example.com') {
        // Return null – the send function will handle this gracefully
        return null;
    }

    return nodemailer.createTransport({
        host:   SMTP_HOST,
        port:   parseInt(SMTP_PORT  || '587', 10),
        secure: SMTP_SECURE === 'true',   // false = STARTTLS on port 587
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
        // Keep connection pool alive for burst sending
        pool:           true,
        maxConnections: 3,
        maxMessages:    100,
        // Brevo requires a verified sender – set per-message in mailOptions
        tls: {
            rejectUnauthorized: true,
        },
    });
}

// Lazily initialised so .env is loaded before we read it
let _transport = undefined;
function getTransport() {
    if (_transport === undefined) {
        _transport = createTransport();
        if (_transport) {
            // Verify connection on first use (non-blocking)
            _transport.verify((err) => {
                if (err) {
                    log('WARN', 'SMTP connection verification failed –', err.message);
                    _transport = null; // force re-create next call
                } else {
                    log('INFO', 'SMTP connection verified successfully.');
                }
            });
        }
    }
    return _transport;
}

// ─── Core send function ───────────────────────────────────────────────────────
/**
 * sendEmail({ to, subject, html, text })
 * Returns { success: true } or { success: false, error }
 * Never throws – all errors are caught and logged.
 */
async function sendEmail(mailOptions, attempt = 1) {
    const from = `"${process.env.EMAIL_FROM_NAME || 'ShopEase'}" <${process.env.EMAIL_FROM_ADDRESS || 'noreply@shopease.com'}>`;

    const options = {
        from,
        to:      mailOptions.to,
        subject: mailOptions.subject,
        html:    mailOptions.html,
        text:    mailOptions.text || stripHtml(mailOptions.html),
    };

    const transport = getTransport();

    // ── Dev / unconfigured mode: print to console instead of sending ──
    if (!transport) {
        log('DEV', `[MOCK SEND] To: ${options.to} | Subject: ${options.subject}`);
        log('DEV', '─── Email body preview (first 400 chars) ───');
        log('DEV', (options.text || '').slice(0, 400));
        return { success: true, messageId: 'mock-' + Date.now() };
    }

    try {
        const info = await transport.sendMail(options);
        log('INFO', `Sent to ${options.to} | Subject: "${options.subject}" | MessageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId };

    } catch (err) {
        // Determine if error is transient (network / rate-limit) or permanent
        const isTransient = isTransientError(err);

        log('ERROR',
            `Attempt ${attempt}/${MAX_RETRIES} failed for ${options.to} | Subject: "${options.subject}"`,
            `| ${err.message}`
        );

        if (isTransient && attempt < MAX_RETRIES) {
            const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1);
            log('WARN', `Transient error – queuing retry in ${delay / 1000}s`);
            retryQueue.push({
                mailOptions: options,
                attempts:    attempt,
                nextRetryAt: Date.now() + delay,
            });
        } else {
            log('ERROR', `Permanent failure or max retries reached for ${options.to}. Email NOT delivered.`);
        }

        return { success: false, error: err.message };
    }
}

// ─── Retry queue drainer ──────────────────────────────────────────────────────
function drainRetryQueue() {
    const now  = Date.now();
    const due  = retryQueue.filter(item => item.nextRetryAt <= now);

    // Remove due items from queue immediately
    due.forEach(item => {
        const idx = retryQueue.indexOf(item);
        if (idx !== -1) retryQueue.splice(idx, 1);
    });

    if (due.length === 0) return;

    log('INFO', `Retrying ${due.length} queued email(s)…`);

    due.forEach(item => {
        sendEmail(item.mailOptions, item.attempts + 1);
    });
}

// Schedule the cron job
cron.schedule(RETRY_CRON, drainRetryQueue);
log('INFO', `Email retry queue cron scheduled (${RETRY_CRON}).`);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Decide if an SMTP error is worth retrying.
 * Transient: connection reset, timeout, rate-limit (4xx), ECONNRESET, ETIMEDOUT
 * Permanent: invalid address (5xx), auth failure
 */
function isTransientError(err) {
    if (!err) return false;
    const msg  = (err.message || '').toLowerCase();
    const code = err.responseCode || 0;

    if (['econnreset', 'etimedout', 'enotfound', 'econnrefused'].some(c => msg.includes(c))) return true;
    if (code >= 400 && code < 500) return true;  // 4xx = transient
    if (code >= 500 && code < 600) return false; // 5xx = permanent
    return false;
}

/** Naive HTML → plain-text stripper for the text fallback */
function stripHtml(html = '') {
    return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

// ─── Public API ───────────────────────────────────────────────────────────────
module.exports = {
    sendEmail,
    /** Expose queue length for health-check endpoints */
    getRetryQueueLength: () => retryQueue.length,
};

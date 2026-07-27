'use strict';

const bcrypt    = require('bcrypt');
const jwt       = require('jsonwebtoken');
const crypto    = require('crypto');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID');

const { sendEmail }          = require('../services/emailService');
const { verificationEmail,
        passwordResetEmail } = require('../services/emailTemplates');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

const JWT_SECRET = () => process.env.JWT_SECRET || 'shopease_super_secret_key';

// ─── Register ─────────────────────────────────────────────────────────────────
exports.register = (req, res) => {
    const db = req.app.get('db');
    const { name, email, password, phone, gender, dob } = req.body;
    const avatar_url = req.file ? `/uploads/${req.file.filename}` : null;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Please provide name, email and password' });
    }

    db.get("SELECT email FROM users WHERE email = ?", [email], async (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) return res.status(400).json({ error: 'Email already registered' });

        try {
            const hashedPassword = await bcrypt.hash(password, 10);

            db.run(
                `INSERT INTO users (name, email, password, phone, gender, dob, avatar_url, email_verified)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
                [name, email, hashedPassword, phone, gender, dob, avatar_url],
                async function (err) {
                    if (err) return res.status(500).json({ error: err.message });

                    const userId = this.lastID;
                    const token  = jwt.sign(
                        { id: userId, email, role: 'user' },
                        JWT_SECRET(),
                        { expiresIn: '7d' }
                    );

                    // ── Fire-and-forget verification email ──
                    sendVerificationEmail(db, userId, name, email);

                    res.status(201).json({
                        message: 'Registration successful. Please check your email to verify your account.',
                        token,
                        user: { id: userId, name, email, phone, gender, dob, avatar_url, role: 'user', email_verified: 0 },
                    });
                }
            );
        } catch (e) {
            res.status(500).json({ error: 'Server error' });
        }
    });
};

// ─── Login ────────────────────────────────────────────────────────────────────
exports.login = (req, res) => {
    const db = req.app.get('db');
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Please provide email and password' });
    }

    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET(),
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id:             user.id,
                name:           user.name,
                email:          user.email,
                phone:          user.phone,
                avatar_url:     user.avatar_url,
                role:           user.role,
                email_verified: user.email_verified,
            },
        });
    });
};

// ─── Verify Email ─────────────────────────────────────────────────────────────
exports.verifyEmail = (req, res) => {
    const db    = req.app.get('db');
    const { token } = req.query;

    if (!token) {
        return res.status(400).send(htmlPage('Invalid Link', '❌ Verification link is invalid or missing.'));
    }

    db.get(
        "SELECT * FROM email_verifications WHERE token = ? AND used = 0",
        [token],
        (err, row) => {
            if (err)  return res.status(500).send(htmlPage('Error', '⚠️ Server error. Please try again.'));
            if (!row) return res.status(400).send(htmlPage('Invalid Token', '❌ Verification link is invalid or already used.'));

            if (new Date(row.expires_at) < new Date()) {
                return res.status(400).send(htmlPage('Link Expired', '⏰ This verification link has expired. Please request a new one.'));
            }

            // Mark token used + mark user verified
            db.run("UPDATE email_verifications SET used = 1 WHERE id = ?", [row.id]);
            db.run("UPDATE users SET email_verified = 1 WHERE id = ?", [row.user_id], (err) => {
                if (err) return res.status(500).send(htmlPage('Error', '⚠️ Could not verify email. Please try again.'));
                return res.send(htmlPage(
                    'Email Verified!',
                    '✅ Your email has been verified successfully! You can now close this page and continue shopping.'
                ));
            });
        }
    );
};

// ─── Resend Verification Email ─────────────────────────────────────────────────
exports.resendVerification = (req, res) => {
    const db     = req.app.get('db');
    const userId = req.user.id;

    db.get("SELECT id, name, email, email_verified FROM users WHERE id = ?", [userId], (err, user) => {
        if (err)   return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.email_verified) {
            return res.status(400).json({ error: 'Email is already verified' });
        }

        sendVerificationEmail(db, user.id, user.name, user.email);
        res.json({ message: 'Verification email resent. Please check your inbox.' });
    });
};

// ─── Forgot Password ──────────────────────────────────────────────────────────
exports.forgotPassword = (req, res) => {
    const db = req.app.get('db');
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Please provide your email address' });
    }

    // Always respond with the same generic message to prevent email enumeration
    const genericOk = () =>
        res.json({ message: 'If that email is registered, a reset link has been sent.' });

    db.get("SELECT id, name, email FROM users WHERE email = ?", [email], (err, user) => {
        if (err)  { console.error('forgotPassword DB error:', err); return genericOk(); }
        if (!user) return genericOk();

        const token     = generateToken();
        const expiresAt = new Date(
            Date.now() + parseInt(process.env.PASSWORD_RESET_EXPIRY_MS || '3600000', 10)
        ).toISOString();

        // Invalidate any previous unused tokens for this user
        db.run(
            "UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0",
            [user.id],
            () => {
                db.run(
                    "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
                    [user.id, token, expiresAt],
                    (err) => {
                        if (err) { console.error('forgotPassword insert error:', err); return genericOk(); }

                        const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/#reset-password?token=${token}`;
                        const tmpl     = passwordResetEmail({ name: user.name, resetUrl });
                        sendEmail({ to: user.email, ...tmpl });

                        genericOk();
                    }
                );
            }
        );
    });
};

// ─── Reset Password ───────────────────────────────────────────────────────────
exports.resetPassword = (req, res) => {
    const db                       = req.app.get('db');
    const { token, newPassword }   = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    db.get(
        "SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0",
        [token],
        async (err, row) => {
            if (err)  return res.status(500).json({ error: err.message });
            if (!row) return res.status(400).json({ error: 'Invalid or already-used reset link' });

            if (new Date(row.expires_at) < new Date()) {
                return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
            }

            try {
                const hashed = await bcrypt.hash(newPassword, 10);

                db.run("UPDATE users SET password = ? WHERE id = ?", [hashed, row.user_id], (err) => {
                    if (err) return res.status(500).json({ error: err.message });

                    // Consume token
                    db.run("UPDATE password_reset_tokens SET used = 1 WHERE id = ?", [row.id]);

                    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
                });
            } catch (e) {
                res.status(500).json({ error: 'Server error' });
            }
        }
    );
};

// ─── Google Login ─────────────────────────────────────────────────────────────
exports.googleLogin = async (req, res) => {
    const db = req.app.get('db');
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ error: 'Google token is required' });
    }

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
        });
        const payload = ticket.getPayload();
        
        const { sub, email, name, picture } = payload;

        // Check if user exists
        db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
            if (err) return res.status(500).json({ error: err.message });

            if (user) {
                // User exists, log them in
                const appToken = jwt.sign(
                    { id: user.id, email: user.email, role: user.role },
                    JWT_SECRET(),
                    { expiresIn: '7d' }
                );

                return res.json({
                    message: 'Login successful',
                    token: appToken,
                    user: {
                        id:             user.id,
                        name:           user.name,
                        email:          user.email,
                        phone:          user.phone,
                        avatar_url:     user.avatar_url,
                        role:           user.role,
                        email_verified: user.email_verified,
                    },
                });
            } else {
                // User doesn't exist, create a new one
                // Generate a random password since they use Google
                const randomPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
                
                db.run(
                    `INSERT INTO users (name, email, password, avatar_url, email_verified) VALUES (?, ?, ?, ?, 1)`,
                    [name, email, randomPassword, picture],
                    function (err) {
                        if (err) return res.status(500).json({ error: err.message });

                        const userId = this.lastID;
                        const appToken = jwt.sign(
                            { id: userId, email, role: 'user' },
                            JWT_SECRET(),
                            { expiresIn: '7d' }
                        );

                        res.status(201).json({
                            message: 'Registration successful',
                            token: appToken,
                            user: { id: userId, name, email, avatar_url: picture, role: 'user', email_verified: 1 },
                        });
                    }
                );
            }
        });
    } catch (error) {
        console.error('Google auth error:', error);
        return res.status(400).json({ error: 'Invalid Google token' });
    }
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Create a verification token and send the email. Fire-and-forget. */
function sendVerificationEmail(db, userId, name, email) {
    const token     = generateToken();
    const expiresAt = new Date(
        Date.now() + parseInt(process.env.EMAIL_VERIFICATION_EXPIRY_MS || '86400000', 10)
    ).toISOString();

    db.run(
        "INSERT INTO email_verifications (user_id, token, expires_at) VALUES (?, ?, ?)",
        [userId, token, expiresAt],
        (err) => {
            if (err) {
                console.error('[AUTH] Failed to insert verification token:', err.message);
                return;
            }
            const verifyUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${token}`;
            const tmpl      = verificationEmail({ name, verifyUrl });
            sendEmail({ to: email, ...tmpl });
        }
    );
}

/** Simple HTML response page for the email-verification redirect */
function htmlPage(title, message) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} – ShopEase</title>
  <style>
    body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
         background:#F4F7FC;display:flex;align-items:center;justify-content:center;min-height:100vh;}
    .card{background:#fff;border-radius:24px;padding:48px 40px;max-width:480px;width:90%;
          text-align:center;box-shadow:0 8px 30px rgba(0,0,0,0.08);}
    h1{font-size:22px;font-weight:800;color:#0F172A;margin:16px 0 8px;}
    p{font-size:15px;color:#64748B;line-height:1.6;margin:0 0 24px;}
    a{display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#2563EB,#7C3AED);
      color:#fff;text-decoration:none;border-radius:24px;font-weight:700;font-size:14px;}
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size:56px;">${message.split(' ')[0]}</div>
    <h1>${title}</h1>
    <p>${message.replace(/^[^\s]+\s/, '')}</p>
    <a href="/">Return to ShopEase</a>
  </div>
</body>
</html>`;
}

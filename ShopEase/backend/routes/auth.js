'use strict';

const express        = require('express');
const router         = express.Router();
const authController = require('../controllers/authController');
const auth           = require('../middleware/auth');
const multer         = require('multer');
const path           = require('path');
const fs             = require('fs');

// ─── Multer setup ─────────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

// Allow only image MIME types
const fileFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5 MB

// ─── Routes ───────────────────────────────────────────────────────────────────

// Public
router.post('/register',             upload.single('avatar'), authController.register);
router.post('/login',                                         authController.login);
router.post('/google',                                        authController.googleLogin);
router.get ('/verify-email',                                  authController.verifyEmail);
router.post('/forgot-password',                               authController.forgotPassword);
router.post('/reset-password',                                authController.resetPassword);

// Protected (requires valid JWT)
router.post('/resend-verification',  auth,                    authController.resendVerification);

module.exports = router;

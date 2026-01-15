/**
 * Security Headers Middleware
 * 
 * OWASP Security Best Practice: Set secure HTTP headers
 * 
 * Headers implemented:
 * - X-Content-Type-Options: Prevent MIME type sniffing
 * - X-Frame-Options: Prevent clickjacking
 * - X-XSS-Protection: Enable browser XSS filter
 * - Strict-Transport-Security: Force HTTPS (production only)
 * - Content-Security-Policy: Restrict resource loading
 * - Referrer-Policy: Control referrer information
 * - Permissions-Policy: Restrict browser features
 */

/**
 * Apply security headers to all responses
 */
function securityHeaders(req, res, next) {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking - page cannot be embedded in iframes
    res.setHeader('X-Frame-Options', 'DENY');

    // Enable browser's XSS filter
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Control how much referrer information is sent
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Restrict browser features (geolocation, camera, microphone for third parties)
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(self)');

    // Remove X-Powered-By header (don't advertise Express)
    res.removeHeader('X-Powered-By');

    // HSTS - Force HTTPS in production
    if (process.env.NODE_ENV === 'production') {
        // max-age=31536000 (1 year), includeSubDomains
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // Basic Content Security Policy
    // Allows same-origin resources, inline scripts/styles (needed for most apps)
    // Blocks eval() and other dangerous patterns
    const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'", // Many apps need inline scripts
        "style-src 'self' 'unsafe-inline'", // Many apps need inline styles
        "img-src 'self' data: https:", // Allow images from HTTPS
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self' https://api.elevenlabs.io https://api-inference.huggingface.co", // API endpoints
        "media-src 'self' blob:", // For audio playback
        "object-src 'none'", // Disable plugins
        "base-uri 'self'",
        "form-action 'self'"
    ].join('; ');

    res.setHeader('Content-Security-Policy', csp);

    next();
}

/**
 * CORS security enhancement
 * Can be used in addition to the cors middleware
 */
function corsSecurityCheck(allowedOrigins = []) {
    return (req, res, next) => {
        const origin = req.headers.origin;

        // If no origin or origin is allowed, proceed
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            next();
            return;
        }

        // Block requests from unauthorized origins
        console.warn(`Blocked request from unauthorized origin: ${origin}`);
        res.status(403).json({
            success: false,
            error: {
                code: 'FORBIDDEN',
                message: 'Origin not allowed'
            }
        });
    };
}

module.exports = {
    securityHeaders,
    corsSecurityCheck
};

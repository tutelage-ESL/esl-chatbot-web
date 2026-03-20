'use strict';
// Email service stub — integrate with SendGrid/Nodemailer when needed
async function sendEmail({ to, subject, text, html }) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Email stub] To: ${to} | Subject: ${subject}`);
    return { success: true };
  }
  throw new Error('Email service not configured');
}
module.exports = { sendEmail };

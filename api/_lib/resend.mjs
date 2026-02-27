import { Resend } from 'resend';

let client = null;

export function getResend() {
  if (client) return client;

  const key = process.env.RESEND_API_KEY;
  if (!key) return null;

  client = new Resend(key);
  return client;
}

export function isResendConfigured() {
  return !!process.env.RESEND_API_KEY;
}

export function getFromEmail() {
  return process.env.RESEND_FROM_EMAIL || 'sales@hrmny.co';
}

export function getFromName() {
  return process.env.RESEND_FROM_NAME || 'Ayham Homsi';
}

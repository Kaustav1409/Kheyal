const webpush = require('web-push');

let vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@kheyal.app';

// If keys are placeholders or not set in dev/test, generate deterministic or ephemeral dev keys
if (
  !vapidPublicKey ||
  vapidPublicKey === 'replace-me' ||
  !vapidPrivateKey ||
  vapidPrivateKey === 'replace-me'
) {
  const generatedKeys = webpush.generateVAPIDKeys();
  vapidPublicKey = generatedKeys.publicKey;
  vapidPrivateKey = generatedKeys.privateKey;
}

try {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
} catch (err) {
  console.warn('VAPID initialization warning:', err.message);
}

function getPublicKey() {
  return vapidPublicKey;
}

module.exports = {
  webpush,
  getPublicKey,
};

const { getPublicKey, webpush } = require('../config/push');
const pushSubscriptionRepository = require('../repositories/pushSubscriptionRepository');

function getVapidKey(req, res) {
  return res.status(200).json({
    publicKey: getPublicKey(),
  });
}

async function subscribe(req, res, next) {
  try {
    const { endpoint, keys } = req.body;
    const subscription = await pushSubscriptionRepository.upsert({
      userId: req.user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    });

    return res.status(201).json({
      success: true,
      message: 'Push subscription registered successfully',
      subscriptionId: subscription.id,
    });
  } catch (err) {
    next(err);
  }
}

async function unsubscribe(req, res, next) {
  try {
    const { endpoint } = req.body;
    await pushSubscriptionRepository.deleteByEndpointAndUser({
      endpoint,
      userId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: 'Push subscription removed successfully',
    });
  } catch (err) {
    next(err);
  }
}

async function sendTestNotification(req, res, next) {
  try {
    const subscriptions = await pushSubscriptionRepository.findByUserId(req.user.id);
    if (subscriptions.length === 0) {
      return res.status(400).json({
        error: 'No active push subscriptions found. Please enable push notifications on this device first.',
      });
    }

    const payload = JSON.stringify({
      title: 'Kheyal — Notification Test 🔔',
      body: 'Badhaai ho! Aapke push notifications bilkul sahi set hain. Move forward!',
      tag: 'kheyal-test',
      data: {
        url: '/settings',
      },
    });

    let deliveredCount = 0;
    for (const sub of subscriptions) {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushConfig, payload);
        deliveredCount++;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Dead endpoint, prune
          await pushSubscriptionRepository.deleteByEndpoint(sub.endpoint);
        } else {
          console.warn('Failed to send test push to endpoint:', sub.endpoint, err.message);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Test notification sent successfully',
      deliveredCount,
      totalSubscriptions: subscriptions.length,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getVapidKey,
  subscribe,
  unsubscribe,
  sendTestNotification,
};

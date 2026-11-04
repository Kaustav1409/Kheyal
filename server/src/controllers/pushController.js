const { getPublicKey } = require('../config/push');
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

module.exports = {
  getVapidKey,
  subscribe,
  unsubscribe,
};

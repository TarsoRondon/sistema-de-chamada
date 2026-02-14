const { getActiveDeviceByCode } = require('../services/deviceService');
const { verifyHmac } = require('../utils/hmac');

async function deviceAuthMiddleware(req, res, next) {
  try {
    const deviceCode = req.headers['x-device-code'];
    const signature = req.headers['x-signature'];

    if (!deviceCode || !signature) {
      return res.status(401).json({ ok: false, error: 'Headers de autenticacao do dispositivo ausentes' });
    }

    const device = await getActiveDeviceByCode(String(deviceCode));
    if (!device) {
      return res.status(401).json({ ok: false, error: 'Dispositivo invalido ou inativo' });
    }

    const rawBody = req.rawBody || JSON.stringify(req.body || {});
    const isValid = verifyHmac(rawBody, device.secret, String(signature));

    if (!isValid) {
      return res.status(401).json({ ok: false, error: 'Assinatura invalida' });
    }

    req.device = device;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  deviceAuthMiddleware,
};

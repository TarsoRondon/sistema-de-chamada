const { getActiveDeviceByCode } = require('../services/deviceService');
const { verifyHmac } = require('../utils/hmac');
const { sendError } = require('../utils/errorResponse');
const { logWarn } = require('../utils/logger');

async function deviceAuthMiddleware(req, res, next) {
  try {
    const deviceCode = req.headers['x-device-code'];
    const signature = req.headers['x-signature'];

    if (!deviceCode || !signature) {
      return sendError(res, req, 401, 'DEVICE_AUTH_HEADERS_MISSING', 'Headers de autenticacao do dispositivo ausentes');
    }

    const device = await getActiveDeviceByCode(String(deviceCode));
    if (!device) {
      logWarn('device_auth_invalid_device', { requestId: req.requestId, deviceCode: String(deviceCode) });
      return sendError(res, req, 401, 'DEVICE_INVALID', 'Dispositivo invalido ou inativo');
    }

    const rawBody = req.rawBody || JSON.stringify(req.body || {});
    const isValid = verifyHmac(rawBody, device.secret, String(signature));

    if (!isValid) {
      logWarn('device_auth_invalid_signature', { requestId: req.requestId, deviceCode: device.device_code });
      return sendError(res, req, 401, 'DEVICE_SIGNATURE_INVALID', 'Assinatura invalida');
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

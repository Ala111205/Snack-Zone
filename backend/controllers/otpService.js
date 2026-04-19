/**
 * OTP Service — Redis-first, MongoDB fallback.
 * When Redis is available, OTPs are stored in Redis with TTL.
 * When Redis is unavailable, OTPs are stored in MongoDB (original behaviour).
 */

const { getClient, KEYS, TTL } = require('../config/redis');
const OTP   = require('../models/OTP');
const axios = require('axios');

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const bare10 = (phone) => {
  const d = phone.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) return d.slice(2);
  return d.length === 10 ? d : d;
};

/* ── Providers ───────────────────────────────────── */
const sendViaFast2SMS = async (phone, otp) => {
  const res = await axios.post('https://www.fast2sms.com/dev/bulkV2',
    { route:'otp', variables_values:otp, numbers:bare10(phone) },
    { headers:{ authorization:process.env.FAST2SMS_API_KEY }, timeout:8000 });
  if (res.data.return === false) throw new Error(`Fast2SMS: ${JSON.stringify(res.data.message)}`);
  console.log(`✅ [Fast2SMS] OTP sent to ${bare10(phone)}`);
};

const sendViaTwilio = async (phone, otp) => {
  const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const to = phone.startsWith('+') ? phone : `+91${bare10(phone)}`;
  await twilio.messages.create({ body:`Your SnackZone OTP: ${otp}. Valid 10 mins.`, from:process.env.TWILIO_PHONE_NUMBER, to });
  console.log(`✅ [Twilio] OTP sent to ${to}`);
};

const sendViaMSG91 = async (phone, otp) => {
  const res = await axios.post('https://api.msg91.com/api/v5/otp',
    { template_id:process.env.MSG91_TEMPLATE_ID, mobile:`91${bare10(phone)}`, otp, otp_length:6, otp_expiry:10 },
    { headers:{ authkey:process.env.MSG91_AUTH_KEY }, timeout:8000 });
  if (res.data.type === 'error') throw new Error(`MSG91: ${res.data.message}`);
  console.log(`✅ [MSG91] OTP sent`);
};

const detectProvider = () => {
  if (process.env.FAST2SMS_API_KEY) return 'fast2sms';
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) return 'twilio';
  if (process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID) return 'msg91';
  return 'dev';
};

/* ── Store OTP (Redis-first) ─────────────────────── */
const storeOTP = async (phone, otp, purpose) => {
  const redis = getClient();
  if (!redis.isNoop) {
    const key = KEYS.otp(phone, purpose);
    await redis.setex(key, TTL.OTP, JSON.stringify({ otp, verified: false, createdAt: Date.now() }));
    console.log(`📦 [Redis] OTP stored for ${phone}`);
  } else {
    await OTP.deleteMany({ phone, purpose });
    await OTP.create({ phone, otp, purpose, expiresAt: new Date(Date.now() + TTL.OTP * 1000) });
    console.log(`📦 [MongoDB] OTP stored for ${phone}`);
  }
};

const fetchOTP = async (phone, purpose) => {
  const redis = getClient();
  if (!redis.isNoop) {
    const raw = await redis.get(KEYS.otp(phone, purpose));
    return raw ? JSON.parse(raw) : null;
  } else {
    const rec = await OTP.findOne({ phone, purpose, verified: false });
    if (!rec) return null;
    if (rec.expiresAt < new Date()) return null;
    return { otp: rec.otp, verified: rec.verified, _mongoId: rec._id };
  }
};

const markOTPVerified = async (phone, purpose, mongoId) => {
  const redis = getClient();
  if (!redis.isNoop) {
    await redis.del(KEYS.otp(phone, purpose));
  } else {
    if (mongoId) await OTP.findByIdAndUpdate(mongoId, { verified: true });
  }
};

/* ── Main exports ────────────────────────────────── */
const sendOTP = async (phone, purpose = 'register') => {
  try {
    const otp      = generateOTP();
    const provider = detectProvider();
    await storeOTP(phone, otp, purpose);
    console.log(`📲 SMS provider: ${provider.toUpperCase()}`);

    if      (provider === 'fast2sms') await sendViaFast2SMS(phone, otp);
    else if (provider === 'twilio')   await sendViaTwilio(phone, otp);
    else if (provider === 'msg91')    await sendViaMSG91(phone, otp);
    else {
      console.log(`\n${'═'.repeat(42)}\n  📱  OTP for ${phone}  ➜  ${otp}\n${'═'.repeat(42)}\n`);
    }
    const isDev = provider === 'dev' && process.env.NODE_ENV !== 'production';
    return { success:true, provider, message: isDev ? 'DEV: OTP in server console' : 'OTP sent', ...(isDev && { devOtp: otp }) };
  } catch (err) {
    console.error('❌ OTP error:', err.message);
    return { success:false, message: err.message };
  }
};

const verifyOTP = async (phone, otp, purpose = 'register') => {
  const record = await fetchOTP(phone, purpose);
  if (!record)               return { valid:false, message:'OTP not found or expired' };
  if (record.verified)       return { valid:false, message:'OTP already used' };
  if (String(record.otp) !== String(otp)) return { valid:false, message:'Incorrect OTP. Try again.' };
  await markOTPVerified(phone, purpose, record._mongoId);
  return { valid:true };
};

module.exports = { sendOTP, verifyOTP, detectProvider };

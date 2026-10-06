/**
 * Observer sans compte : une analyse offerte par appareil (sur un an), et au plus 3 par réseau et par
 * jour, comptées côté serveur dans `rate_limits` (l'appareil se présente par son identifiant tiré au
 * hasard, le réseau par l'empreinte de son adresse IP). Une analyse qui échoue est rendue.
 */
import { fingerprint, hitRateLimit, LONG_BUCKET_PREFIX, peekRateLimit, refundRateLimit } from "../rate-limit";

export const GUEST_SCANS_PER_DEVICE = 1;
/** Réglable (`AI_GUEST_SCANS_PER_NETWORK_PER_DAY`) : les tests de bout en bout passent tous par la même adresse. */
export const GUEST_SCANS_PER_NETWORK_PER_DAY = Number(process.env.AI_GUEST_SCANS_PER_NETWORK_PER_DAY) || 3;
const DEVICE_WINDOW_MS = 365 * 24 * 60 * 60 * 1000;
const NETWORK_WINDOW_MS = 24 * 60 * 60 * 1000;
const NETWORK_BUCKET = "guest-ip:";

/** Un identifiant d'appareil plausible (UUID tiré par l'app) : rien d'autre n'est accepté. */
export const DEVICE_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

const deviceBucket = (deviceId: string) => `${LONG_BUCKET_PREFIX}${fingerprint(deviceId)}`;
const networkBucket = (ip: string) => `${NETWORK_BUCKET}${fingerprint(ip)}`;

export class GuestLimitError extends Error {
  constructor(public reason: "device" | "network") {
    super(`guest ${reason} limit`);
  }
}

/** Reste-t-il l'analyse offerte à cet appareil ? (Ne compte rien.) */
export async function guestScanLeft(deviceId: string, now = Date.now()) {
  return (await peekRateLimit(deviceBucket(deviceId), DEVICE_WINDOW_MS, now)) < GUEST_SCANS_PER_DEVICE;
}

/** Prend la place de l'analyse ; renvoie de quoi la rendre si l'analyse échoue. */
export async function takeGuestScan(deviceId: string, ip: string, now = Date.now()) {
  const device = deviceBucket(deviceId);
  const network = networkBucket(ip);
  if (!(await hitRateLimit(device, GUEST_SCANS_PER_DEVICE, DEVICE_WINDOW_MS, now))) {
    await refundRateLimit(device, DEVICE_WINDOW_MS, now);
    throw new GuestLimitError("device");
  }
  if (!(await hitRateLimit(network, GUEST_SCANS_PER_NETWORK_PER_DAY, NETWORK_WINDOW_MS, now))) {
    await refundRateLimit(network, NETWORK_WINDOW_MS, now);
    await refundRateLimit(device, DEVICE_WINDOW_MS, now);
    throw new GuestLimitError("network");
  }
  return async () => {
    await refundRateLimit(device, DEVICE_WINDOW_MS, now);
    await refundRateLimit(network, NETWORK_WINDOW_MS, now);
  };
}

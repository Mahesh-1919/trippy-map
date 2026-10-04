/** BLE wire format — keep in sync with docs/ble-protocol.md and firmware/. */
export const SERVICE_UUID = '0000ff00-0000-1000-8000-00805f9b34fb';
export const NAV_STATE_UUID = '0000ff01-0000-1000-8000-00805f9b34fb';
export const STREET_UUID = '0000ff02-0000-1000-8000-00805f9b34fb';
export const STATUS_UUID = '0000ff03-0000-1000-8000-00805f9b34fb';

export const PROTOCOL_VERSION = 1;
export const FLAG_NAVIGATING = 1;
export const FLAG_OFFROUTE = 2;
export const FLAG_ARRIVED = 4;

export interface NavPacket {
  navigating: boolean;
  offRoute: boolean;
  arrived: boolean;
  icon: number;
  distToTurn: number; // m
  speedKmh: number;
  remainingDist: number; // m
  etaMin: number;
  seq: number;
}

const clamp16 = (n: number) => Math.max(0, Math.min(0xffff, Math.round(n)));

/** 13 bytes, little-endian, last byte is an XOR checksum of the first 12. */
export function encodeNavState(p: NavPacket): Uint8Array {
  const b = new Uint8Array(13);
  const v = new DataView(b.buffer);
  b[0] = PROTOCOL_VERSION;
  b[1] = (p.navigating ? FLAG_NAVIGATING : 0) | (p.offRoute ? FLAG_OFFROUTE : 0) | (p.arrived ? FLAG_ARRIVED : 0);
  b[2] = p.icon & 0xff;
  v.setUint16(3, clamp16(p.distToTurn), true);
  v.setUint16(5, clamp16(p.speedKmh * 10), true);
  v.setUint16(7, clamp16(p.remainingDist / 10), true);
  v.setUint16(9, clamp16(p.etaMin), true);
  b[11] = p.seq & 0xff;
  b[12] = b.slice(0, 12).reduce((x, y) => x ^ y, 0);
  return b;
}

/** UTF-8 truncated to maxBytes without splitting a code point. */
export function encodeStreet(name: string, maxBytes = 20): Uint8Array {
  const enc = new TextEncoder();
  let out = '';
  for (const ch of name) {
    if (enc.encode(out + ch).length > maxBytes) break;
    out += ch;
  }
  return enc.encode(out);
}

export function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (const x of bytes) s += String.fromCharCode(x);
  return btoa(s);
}

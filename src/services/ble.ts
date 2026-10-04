import { PermissionsAndroid, Platform } from 'react-native';
import { isExpoGo } from '../config/env';
import { BleManager, Device, State } from 'react-native-ble-plx';
import {
  NAV_STATE_UUID,
  SERVICE_UUID,
  STREET_UUID,
  toBase64,
} from '../protocol/encode';

export type BleStatus = 'idle' | 'scanning' | 'connecting' | 'connected';

type Listener = (status: BleStatus, device: Device | null) => void;

class BleService {
  /** false in Expo Go (native BLE module missing); use a development build for the display. */
  readonly supported = !isExpoGo;
  private _manager: BleManager | null = null;
  private get manager(): BleManager {
    if (!this.supported) throw new Error('BLE needs a development build (not available in Expo Go)');
    return (this._manager ??= new BleManager());
  }
  private device: Device | null = null;
  private status: BleStatus = 'idle';
  private listeners = new Set<Listener>();
  private lastId: string | null = null;
  private wantConnected = false;
  private writing = false;
  private lastStreet = '';

  subscribe(l: Listener) {
    this.listeners.add(l);
    l(this.status, this.device);
    return () => {
      this.listeners.delete(l);
    };
  }

  private set(status: BleStatus, device: Device | null = this.device) {
    this.status = status;
    this.device = device;
    this.listeners.forEach((l) => l(status, device));
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    if (Platform.Version >= 31) {
      const r = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
      return Object.values(r).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
    }
    const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    return r === PermissionsAndroid.RESULTS.GRANTED;
  }

  /** Scan for displays advertising our service; calls onFound for each distinct device. */
  async scan(onFound: (d: Device) => void, timeoutMs = 10000) {
    if (!(await this.requestPermissions())) throw new Error('Bluetooth permission denied');
    const state = await this.manager.state();
    if (state !== State.PoweredOn) throw new Error('Bluetooth is off');
    const seen = new Set<string>();
    this.set('scanning');
    this.manager.startDeviceScan([SERVICE_UUID], null, (err, d) => {
      if (err) {
        this.stopScan();
        return;
      }
      if (d && !seen.has(d.id)) {
        seen.add(d.id);
        onFound(d);
      }
    });
    setTimeout(() => this.stopScan(), timeoutMs);
  }

  stopScan() {
    if (!this.supported) return;
    this.manager.stopDeviceScan();
    if (this.status === 'scanning') this.set(this.device ? 'connected' : 'idle');
  }

  async connect(id: string) {
    this.stopScan();
    this.wantConnected = true;
    this.lastId = id;
    this.set('connecting');
    try {
      const d = await this.manager.connectToDevice(id, { requestMTU: 185 });
      await d.discoverAllServicesAndCharacteristics();
      this.lastStreet = '';
      this.set('connected', d);
      d.onDisconnected(() => {
        this.set('idle', null);
        if (this.wantConnected) setTimeout(() => this.reconnect(), 2000);
      });
    } catch (e) {
      this.set('idle', null);
      if (this.wantConnected) setTimeout(() => this.reconnect(), 3000);
      throw e;
    }
  }

  private reconnect() {
    if (this.wantConnected && this.lastId && this.status === 'idle') {
      this.connect(this.lastId).catch(() => {});
    }
  }

  async disconnect() {
    this.wantConnected = false;
    const d = this.device;
    this.set('idle', null);
    if (d) await d.cancelConnection().catch(() => {});
  }

  /** Drop-if-busy write so stale packets never queue up behind a slow link. */
  async sendNavState(bytes: Uint8Array) {
    if (!this.device || this.writing) return;
    this.writing = true;
    try {
      await this.device.writeCharacteristicWithoutResponseForService(
        SERVICE_UUID,
        NAV_STATE_UUID,
        toBase64(bytes),
      );
    } catch {
      // link errors surface via onDisconnected
    } finally {
      this.writing = false;
    }
  }

  /** Street name is only re-sent when it changes. */
  async sendStreet(bytes: Uint8Array, text: string) {
    if (!this.device || text === this.lastStreet) return;
    this.lastStreet = text;
    try {
      await this.device.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        STREET_UUID,
        toBase64(bytes),
      );
    } catch {
      this.lastStreet = '';
    }
  }
}

export const ble = new BleService();

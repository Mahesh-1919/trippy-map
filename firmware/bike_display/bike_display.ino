// Sample ESP32 (Arduino core 3.x, built-in BLE library) peripheral for the bike nav protocol.
// Decodes NAV_STATE / STREET writes and prints them; replace printState() with your display code.
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>

#define SERVICE_UUID "0000ff00-0000-1000-8000-00805f9b34fb"
#define NAV_UUID     "0000ff01-0000-1000-8000-00805f9b34fb"
#define STREET_UUID  "0000ff02-0000-1000-8000-00805f9b34fb"
#define STATUS_UUID  "0000ff03-0000-1000-8000-00805f9b34fb"

static const char *ICONS[] = {"none", "straight", "slight-left", "left", "sharp-left", "slight-right",
                              "right", "sharp-right", "u-turn", "roundabout", "arrive", "depart"};

class NavCb : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *c) override {
    String v = c->getValue();
    const uint8_t *d = (const uint8_t *)v.c_str();
    if (v.length() != 13 || d[0] != 1) return;
    uint8_t x = 0;
    for (int i = 0; i < 12; i++) x ^= d[i];
    if (x != d[12]) return;  // corrupted
    uint16_t dist = d[3] | (d[4] << 8);
    uint16_t speed = d[5] | (d[6] << 8);
    uint16_t rem = d[7] | (d[8] << 8);
    uint16_t eta = d[9] | (d[10] << 8);
    Serial.printf("nav=%d off=%d arrived=%d icon=%s dist=%um speed=%.1f rem=%um eta=%umin seq=%u\n",
                  d[1] & 1, (d[1] >> 1) & 1, (d[1] >> 2) & 1, d[2] < 12 ? ICONS[d[2]] : "?", dist,
                  speed / 10.0, rem * 10, eta, d[11]);
  }
};

class StreetCb : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *c) override { Serial.printf("street: %s\n", c->getValue().c_str()); }
};

void setup() {
  Serial.begin(115200);
  BLEDevice::init("BikeDisplay");
  BLEServer *server = BLEDevice::createServer();
  BLEService *svc = server->createService(SERVICE_UUID);
  svc->createCharacteristic(NAV_UUID, BLECharacteristic::PROPERTY_WRITE_NR)->setCallbacks(new NavCb());
  svc->createCharacteristic(STREET_UUID, BLECharacteristic::PROPERTY_WRITE)->setCallbacks(new StreetCb());
  svc->createCharacteristic(STATUS_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  svc->start();
  BLEAdvertising *adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(SERVICE_UUID);
  adv->start();
}

void loop() { delay(1000); }

# BLE display protocol (v1)

The phone is the BLE **central**; the bike display is the **peripheral** and must advertise service `0000FF00-0000-1000-8000-00805F9B34FB`.

| Characteristic | UUID suffix | Props | Purpose |
|---|---|---|---|
| NAV_STATE | `FF01` | Write Without Response | 13-byte state, sent at 1 Hz while navigating |
| STREET | `FF02` | Write | UTF-8 next street name (≤20 bytes), sent only when it changes |
| STATUS | `FF03` | Notify | Display → phone (reserved: battery %, ack) |

## NAV_STATE (13 bytes, little-endian)

| Byte | Field | Notes |
|---|---|---|
| 0 | version | `1` |
| 1 | flags | bit0 navigating, bit1 off-route, bit2 arrived |
| 2 | icon | see table below |
| 3–4 | distToTurn | u16, meters (saturates at 65535) |
| 5–6 | speed | u16, 0.1 km/h units |
| 7–8 | remainingDist | u16, 10 m units |
| 9–10 | etaMin | u16, minutes to destination |
| 11 | seq | u8 rolling counter |
| 12 | checksum | XOR of bytes 0–11 |

When the rider stops navigation the phone sends one packet with `navigating = 0`; the display should return to its idle screen. If no packet arrives for ~5 s, treat the link as stale.

## Icons

0 none · 1 straight · 2 slight left · 3 left · 4 sharp left · 5 slight right · 6 right · 7 sharp right · 8 U-turn · 9 roundabout · 10 arrive · 11 depart

## Testing without the display

Use nRF Connect (phone) or `firmware/bike_display/bike_display.ino` on an ESP32 — it prints each decoded packet to Serial.

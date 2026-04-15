# YATS - Yet Another TRMNL Server

YATS is a self-hosted server for [TRMNL](https://trmnl.com) e-paper dashboard devices, built
with Vue 3, TypeScript, and Vite.

TRMNL is an e-paper display that shows personalized information at a glance. It features a
low-power e-ink screen, customizable layouts through an extensible plugin ecosystem, and a
privacy-focused one-way communication architecture.

YATS gives you full control over your TRMNL device without relying on the official cloud
service. Upload images, manage a screen playlist, and monitor device status from a local web
interface.

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A TRMNL device with firmware v1.5.2 or later

### Installation

```bash
git clone https://github.com/klaushofrichter/YATS.git
cd YATS
npm install
```

### Start the Server

```bash
npm run dev
```

The server starts on `http://localhost:3000`. Open this URL in a browser to access the admin
interface.

### Connect Your TRMNL Device

TRMNL firmware v1.5+ supports custom server URLs natively through the WiFi captive portal.
No firmware modifications are required.

1. Put your TRMNL device into setup mode by holding the button on the back for 5 seconds
   until the screen shows a QR code / setup instructions.
2. On your phone or computer, connect to the **TRMNL** WiFi access point that the device
   creates.
3. A captive portal will open. Enter your WiFi credentials (SSID and password).
4. Look for the **Custom Server** field and enter your YATS server URL, for example:
   `http://192.168.1.100:3000` (use your machine's LAN IP address, not `localhost`).
5. Save the configuration. The device will reboot, connect to your WiFi, and contact
   YATS at `GET /api/setup` to register itself.
6. The device should appear in the YATS admin interface under the **Devices** tab.

**Finding your LAN IP address:**

```bash
# macOS
ipconfig getifaddr en0

# Linux
hostname -I | awk '{print $1}'
```

**Important:** The TRMNL device and your YATS server must be on the same network. Use your
machine's LAN IP address (e.g., `192.168.x.x`), not `localhost` or `127.0.0.1`.

### Upload Screens

1. Open the YATS admin interface at `http://localhost:3000`.
2. Go to the **Screens** tab.
3. Click the upload area and select one or more images (PNG, BMP, or JPEG).
4. Images are recommended to be **800x480 pixels** in black and white or 2-bit grayscale
   for best results on the e-paper display.
5. Uploaded screens are served to connected devices in a playlist rotation. Each time the
   device wakes and requests content, it receives the next image in the sequence.

### Build for Production

```bash
npm run build
npm run preview
```

## Architecture

YATS is a Vue 3 + TypeScript application built with Vite. The Vite dev server plugin
(`src/server/api-plugin.ts`) handles the TRMNL device API endpoints as middleware, while
the Vue frontend serves as the admin interface.

```
YATS/
├── src/
│   ├── server/              # Vite plugin handling API endpoints
│   │   ├── api-plugin.ts    # Route handlers for device + admin APIs
│   │   ├── store.ts         # File-based persistence layer
│   │   └── types.ts         # TypeScript type definitions
│   ├── components/          # Vue admin UI components
│   │   ├── DevicesPanel.vue
│   │   ├── ScreensPanel.vue
│   │   └── LogsPanel.vue
│   ├── App.vue
│   ├── main.ts
│   └── style.css
├── data/                    # Runtime data (git-ignored)
│   ├── devices.json
│   ├── screens.json
│   ├── logs.json
│   └── images/              # Uploaded screen images
├── vite.config.ts
└── package.json
```

### Device API Endpoints

These endpoints implement the TRMNL firmware protocol. The device calls them automatically.

| Endpoint | Method | Description |
|---|---|---|
| `/api/setup` | GET | Device provisioning. Device sends MAC address in the `ID` header. Server responds with `api_key`, `friendly_id`, and an initial `image_url`. |
| `/api/display` | GET | Content delivery. Device sends `Access-Token`, `ID`, `Battery-Voltage`, `FW-Version`, `RSSI`, `Width`, `Height` headers. Server responds with `image_url`, `filename`, `refresh_rate`, and firmware flags. |
| `/api/log` | POST | Device log submission. Device sends diagnostic data in JSON body. |
| `/api/images/:filename` | GET | Image file serving. Returns the actual image file for the device to download and render. |

### Admin API Endpoints

These endpoints are used by the Vue frontend.

| Endpoint | Method | Description |
|---|---|---|
| `/api/admin/devices` | GET | List all registered devices |
| `/api/admin/devices/:mac` | PATCH | Update device name or refresh rate |
| `/api/admin/devices/:mac` | DELETE | Remove a device |
| `/api/admin/screens` | GET | List all screens |
| `/api/admin/screens` | POST | Upload a new screen image (multipart form) |
| `/api/admin/screens/:id` | DELETE | Delete a screen |
| `/api/admin/logs` | GET | View device logs |

## TRMNL Device Communication

The TRMNL device communicates with the server using a pull-based model:

1. **Setup** (first boot): Device calls `GET /api/setup` with its MAC address in the `ID`
   header. YATS auto-registers the device and returns an API key.
2. **Display** (periodic): Device wakes from deep sleep and calls `GET /api/display` with
   its API key and device metrics (battery voltage, WiFi signal strength, firmware version).
   YATS responds with the next image URL from the playlist and a refresh interval.
3. **Image download**: Device fetches the image from the URL provided in the display
   response and renders it on the 800x480 e-paper screen.
4. **Sleep**: Device enters deep sleep for the configured refresh interval (default 900
   seconds / 15 minutes).

### Supported Image Formats

The TRMNL e-paper display is 800x480 pixels. Supported formats:

- **BMP** (BMP3, 1-bit monochrome) - native format, smallest file size
- **PNG** (1-bit monochrome or 2-bit grayscale) - good compatibility
- **JPEG** - supported but not ideal for e-paper (lossy compression creates artifacts)

For best results, prepare images as 800x480 black and white. ImageMagick examples:

```bash
# Convert to 1-bit monochrome BMP
magick input.png -monochrome -colors 2 -depth 1 -strip bmp3:output.bmp

# Convert to 1-bit monochrome PNG
magick input.png -monochrome -colors 2 -depth 1 -strip png:output.png
```

## Related Projects

YATS is part of a broader ecosystem of self-hosted TRMNL servers. TRMNL actively encourages
self-hosting under their "BYOS" (Bring Your Own Server) initiative:

- [Terminus](https://github.com/usetrmnl/terminus) - Official flagship BYOS server (Ruby/Hanami)
- [LaraPaper](https://github.com/usetrmnl/larapaper) - Official PHP/Laravel server
- [Inker](https://github.com/usetrmnl/inker) - Drag-and-drop screen designer (TypeScript/React)
- [Kuroshiro](https://github.com/PhyberApex/kuroshiro) - NestJS + Vue.js server
- [awesome-TRMNL](https://github.com/eindpunt/awesome-TRMNL) - Curated list of TRMNL resources

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

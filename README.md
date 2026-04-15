# YATS - Yet Another TRMNL Server

YATS is an alternative server implementation for [TRMNL](https://trmnl.com) e-paper dashboard
devices.

TRMNL is an e-paper display that shows personalized information at a glance. It features a
low-power e-ink screen, customizable layouts through an extensible plugin ecosystem, and a
privacy-focused one-way communication architecture.

YATS aims to provide a self-hosted server backend for TRMNL devices, giving users full control
over their data and display content.

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The server starts on `http://localhost:3000`. Point your TRMNL device's base URL to this address.

### Build

```bash
npm run build
```

## Architecture

YATS is a Vue 3 + TypeScript application built with Vite. The Vite dev server plugin handles
the TRMNL device API endpoints:

- `GET /api/setup` - Device provisioning (exchanges MAC address for API key)
- `GET /api/display` - Content delivery (returns image URL and metadata)
- `POST /api/log` - Device log submission

The Vue frontend provides an admin interface for managing devices and screen content.

## TRMNL Device Communication

The TRMNL device communicates with the server using a pull-based model:

1. Device wakes from deep sleep
2. Calls `GET /api/setup` on first boot (sends MAC address, receives API key)
3. Calls `GET /api/display` periodically (sends device metrics, receives image URL)
4. Downloads and renders the image on the 800x480 e-paper display
5. Returns to deep sleep for the configured refresh interval

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

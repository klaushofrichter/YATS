import type { Plugin, ViteDevServer } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { store } from './store'
import type { Device } from './types'

function generateFriendlyId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString()))
    req.on('error', reject)
  })
}

function parseMultipartFile(req: IncomingMessage, body: Buffer): { filename: string; data: Buffer } | null {
  const contentType = req.headers['content-type'] || ''
  const boundaryMatch = contentType.match(/boundary=(.+)/)
  if (!boundaryMatch) return null

  const boundary = boundaryMatch[1]
  const boundaryBuffer = Buffer.from(`--${boundary}`)
  const bodyStr = body.toString('latin1')

  const headerEnd = bodyStr.indexOf('\r\n\r\n')
  if (headerEnd === -1) return null

  const headers = bodyStr.slice(0, headerEnd)
  const filenameMatch = headers.match(/filename="([^"]+)"/)
  if (!filenameMatch) return null

  const dataStart = headerEnd + 4
  const endBoundary = bodyStr.lastIndexOf(`\r\n--${boundary}`)
  if (endBoundary === -1) return null

  return {
    filename: filenameMatch[1],
    data: body.subarray(dataStart, endBoundary),
  }
}

function readBodyRaw(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function handleApiSetup(req: IncomingMessage, res: ServerResponse): void {
  const macAddress = (req.headers['id'] as string) || ''
  const firmwareVersion = (req.headers['fw-version'] as string) || 'unknown'
  const model = (req.headers['model'] as string) || 'unknown'

  if (!macAddress) {
    sendJson(res, 400, { status: 400, message: 'Missing ID header' })
    return
  }

  console.log(`[YATS] Setup request from device: ${macAddress}`)

  let device = store.getDevice(macAddress)
  if (!device) {
    device = {
      id: randomUUID(),
      macAddress,
      apiKey: randomUUID(),
      friendlyId: generateFriendlyId(),
      name: `TRMNL ${macAddress.slice(-5).replace(/:/g, '')}`,
      firmwareVersion,
      model,
      batteryVoltage: 0,
      rssi: 0,
      width: 800,
      height: 480,
      refreshRate: 900,
      lastSeen: new Date().toISOString(),
      registered: true,
    }
    store.upsertDevice(device)
    console.log(`[YATS] New device registered: ${device.friendlyId} (${macAddress})`)
  } else {
    device.firmwareVersion = firmwareVersion
    device.model = model
    device.lastSeen = new Date().toISOString()
    store.upsertDevice(device)
  }

  const screen = store.getCurrentScreen(macAddress)
  const baseUrl = `http://${req.headers.host}`

  sendJson(res, 200, {
    status: 200,
    api_key: device.apiKey,
    friendly_id: device.friendlyId,
    image_url: screen ? `${baseUrl}/api/images/${screen.imageFilename}` : '',
    message: 'Welcome to YATS',
  })
}

function handleApiDisplay(req: IncomingMessage, res: ServerResponse): void {
  const macAddress = (req.headers['id'] as string) || ''
  const apiKey = (req.headers['access-token'] as string) || ''
  const batteryVoltage = parseFloat((req.headers['battery-voltage'] as string) || '0')
  const rssi = parseInt((req.headers['rssi'] as string) || '0', 10)
  const firmwareVersion = (req.headers['fw-version'] as string) || ''
  const model = (req.headers['model'] as string) || ''
  const width = parseInt((req.headers['width'] as string) || '800', 10)
  const height = parseInt((req.headers['height'] as string) || '480', 10)

  if (!apiKey) {
    sendJson(res, 401, { status: 401, message: 'Missing Access-Token header' })
    return
  }

  const device = store.getDeviceByApiKey(apiKey)
  if (!device) {
    sendJson(res, 202, {
      status: 202,
      image_url: '',
      filename: '',
      refresh_rate: 60,
      update_firmware: false,
      firmware_url: null,
      reset_firmware: false,
    })
    return
  }

  device.batteryVoltage = batteryVoltage
  device.rssi = rssi
  device.lastSeen = new Date().toISOString()
  if (firmwareVersion) device.firmwareVersion = firmwareVersion
  if (model) device.model = model
  device.width = width
  device.height = height
  store.upsertDevice(device)

  console.log(
    `[YATS] Display request from ${device.friendlyId} (${device.macAddress}) ` +
      `battery=${batteryVoltage}V rssi=${rssi}dBm`
  )

  const screen = store.getNextScreen(device.macAddress)
  const baseUrl = `http://${req.headers.host}`

  if (!screen) {
    sendJson(res, 200, {
      status: 0,
      image_url: '',
      filename: 'no-content',
      refresh_rate: device.refreshRate,
      update_firmware: false,
      firmware_url: null,
      reset_firmware: false,
    })
    return
  }

  sendJson(res, 200, {
    status: 0,
    image_url: `${baseUrl}/api/images/${screen.imageFilename}`,
    filename: screen.imageFilename,
    refresh_rate: device.refreshRate,
    update_firmware: false,
    firmware_url: null,
    reset_firmware: false,
  })
}

async function handleApiLog(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const macAddress = (req.headers['id'] as string) || ''
  const body = await readBody(req)

  let logs: unknown[]
  try {
    logs = JSON.parse(body)
  } catch {
    logs = [{ raw: body }]
  }

  console.log(`[YATS] Log from device ${macAddress}:`, JSON.stringify(logs).slice(0, 200))

  store.addLog({
    deviceId: macAddress,
    macAddress,
    timestamp: new Date().toISOString(),
    logs,
  })

  sendJson(res, 200, { status: 200 })
}

function handleImageServe(res: ServerResponse, filename: string): void {
  const imagesDir = store.getImagesDir()
  const filePath = path.join(imagesDir, path.basename(filename))

  if (!fs.existsSync(filePath)) {
    res.writeHead(404)
    res.end('Image not found')
    return
  }

  const ext = path.extname(filePath).toLowerCase()
  const contentTypes: Record<string, string> = {
    '.png': 'image/png',
    '.bmp': 'image/bmp',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
  }

  const data = fs.readFileSync(filePath)
  res.writeHead(200, {
    'Content-Type': contentTypes[ext] || 'application/octet-stream',
    'Content-Length': data.length,
    'Accept-Encoding': 'identity',
  })
  res.end(data)
}

// Admin API handlers

function handleGetDevices(_req: IncomingMessage, res: ServerResponse): void {
  sendJson(res, 200, store.getAllDevices())
}

function handleGetScreens(_req: IncomingMessage, res: ServerResponse): void {
  sendJson(res, 200, store.getScreens())
}

async function handleUploadScreen(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readBodyRaw(req)
  const file = parseMultipartFile(req, body)

  if (!file) {
    sendJson(res, 400, { error: 'No file uploaded' })
    return
  }

  const ext = path.extname(file.filename).toLowerCase()
  if (!['.png', '.bmp', '.jpg', '.jpeg'].includes(ext)) {
    sendJson(res, 400, { error: 'Unsupported image format. Use PNG, BMP, or JPEG.' })
    return
  }

  const id = randomUUID()
  const imageFilename = `${id}${ext}`
  const imagesDir = store.getImagesDir()

  fs.writeFileSync(path.join(imagesDir, imageFilename), file.data)

  const screen = {
    id,
    name: file.filename,
    imageFilename,
    createdAt: new Date().toISOString(),
  }

  store.addScreen(screen)
  console.log(`[YATS] Screen uploaded: ${file.filename} -> ${imageFilename}`)
  sendJson(res, 201, screen)
}

function handleDeleteScreen(res: ServerResponse, id: string): void {
  if (store.deleteScreen(id)) {
    sendJson(res, 200, { status: 'deleted' })
  } else {
    sendJson(res, 404, { error: 'Screen not found' })
  }
}

async function handleUpdateDevice(req: IncomingMessage, res: ServerResponse, macAddress: string): Promise<void> {
  const device = store.getDevice(macAddress)
  if (!device) {
    sendJson(res, 404, { error: 'Device not found' })
    return
  }

  const body = await readBody(req)
  const updates = JSON.parse(body) as Partial<Device>

  if (updates.name !== undefined) device.name = updates.name
  if (updates.refreshRate !== undefined) device.refreshRate = updates.refreshRate

  store.upsertDevice(device)
  sendJson(res, 200, device)
}

function handleDeleteDevice(res: ServerResponse, macAddress: string): void {
  if (store.deleteDevice(macAddress)) {
    sendJson(res, 200, { status: 'deleted' })
  } else {
    sendJson(res, 404, { error: 'Device not found' })
  }
}

function handleGetLogs(_req: IncomingMessage, res: ServerResponse): void {
  sendJson(res, 200, store.getLogs())
}

export function trmnlApiPlugin(): Plugin {
  return {
    name: 'yats-trmnl-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url || ''
        const method = req.method || 'GET'

        // Add CORS headers for admin API
        if (url.startsWith('/api/')) {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', '*')

          if (method === 'OPTIONS') {
            res.writeHead(204)
            res.end()
            return
          }
        }

        try {
          // TRMNL Device API
          if (url === '/api/setup' && method === 'GET') {
            handleApiSetup(req, res)
            return
          }

          if (url === '/api/display' && method === 'GET') {
            handleApiDisplay(req, res)
            return
          }

          if (url === '/api/log' && method === 'POST') {
            await handleApiLog(req, res)
            return
          }

          // Image serving
          const imageMatch = url.match(/^\/api\/images\/([^/]+)$/)
          if (imageMatch && method === 'GET') {
            handleImageServe(res, imageMatch[1])
            return
          }

          // Admin API
          if (url === '/api/admin/devices' && method === 'GET') {
            handleGetDevices(req, res)
            return
          }

          const deviceMatch = url.match(/^\/api\/admin\/devices\/([^/]+)$/)
          if (deviceMatch && method === 'PATCH') {
            await handleUpdateDevice(req, res, decodeURIComponent(deviceMatch[1]))
            return
          }
          if (deviceMatch && method === 'DELETE') {
            handleDeleteDevice(res, decodeURIComponent(deviceMatch[1]))
            return
          }

          if (url === '/api/admin/screens' && method === 'GET') {
            handleGetScreens(req, res)
            return
          }

          if (url === '/api/admin/screens' && method === 'POST') {
            await handleUploadScreen(req, res)
            return
          }

          const screenMatch = url.match(/^\/api\/admin\/screens\/([^/]+)$/)
          if (screenMatch && method === 'DELETE') {
            handleDeleteScreen(res, screenMatch[1])
            return
          }

          if (url === '/api/admin/logs' && method === 'GET') {
            handleGetLogs(req, res)
            return
          }
        } catch (err) {
          console.error('[YATS] API error:', err)
          sendJson(res, 500, { error: 'Internal server error' })
          return
        }

        next()
      })
    },
  }
}

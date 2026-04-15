import fs from 'node:fs'
import path from 'node:path'
import type { Device, Screen, DeviceLog, ServerState } from './types'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const DEVICES_FILE = path.join(DATA_DIR, 'devices.json')
const SCREENS_FILE = path.join(DATA_DIR, 'screens.json')
const LOGS_FILE = path.join(DATA_DIR, 'logs.json')
const IMAGES_DIR = path.join(DATA_DIR, 'images')

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true })
}

function loadJson<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
    }
  } catch {
    // ignore parse errors, return fallback
  }
  return fallback
}

function saveJson(filePath: string, data: unknown): void {
  ensureDataDir()
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

class Store {
  private state: ServerState

  constructor() {
    ensureDataDir()
    const devicesArray = loadJson<Device[]>(DEVICES_FILE, [])
    const devices = new Map<string, Device>()
    for (const d of devicesArray) {
      devices.set(d.macAddress, d)
    }
    this.state = {
      devices,
      screens: loadJson<Screen[]>(SCREENS_FILE, []),
      currentScreenIndex: new Map(),
      logs: loadJson<DeviceLog[]>(LOGS_FILE, []),
    }
  }

  getDevice(macAddress: string): Device | undefined {
    return this.state.devices.get(macAddress)
  }

  getDeviceByApiKey(apiKey: string): Device | undefined {
    for (const d of this.state.devices.values()) {
      if (d.apiKey === apiKey) return d
    }
    return undefined
  }

  getAllDevices(): Device[] {
    return Array.from(this.state.devices.values())
  }

  upsertDevice(device: Device): void {
    this.state.devices.set(device.macAddress, device)
    this.saveDevices()
  }

  deleteDevice(macAddress: string): boolean {
    const deleted = this.state.devices.delete(macAddress)
    if (deleted) this.saveDevices()
    return deleted
  }

  private saveDevices(): void {
    saveJson(DEVICES_FILE, Array.from(this.state.devices.values()))
  }

  getScreens(): Screen[] {
    return this.state.screens
  }

  addScreen(screen: Screen): void {
    this.state.screens.push(screen)
    saveJson(SCREENS_FILE, this.state.screens)
  }

  deleteScreen(id: string): boolean {
    const idx = this.state.screens.findIndex((s) => s.id === id)
    if (idx === -1) return false
    const screen = this.state.screens[idx]
    const imgPath = path.join(IMAGES_DIR, screen.imageFilename)
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath)
    this.state.screens.splice(idx, 1)
    saveJson(SCREENS_FILE, this.state.screens)
    return true
  }

  getNextScreen(macAddress: string): Screen | undefined {
    const screens = this.state.screens
    if (screens.length === 0) return undefined
    const idx = this.state.currentScreenIndex.get(macAddress) ?? 0
    const screen = screens[idx % screens.length]
    this.state.currentScreenIndex.set(macAddress, (idx + 1) % screens.length)
    return screen
  }

  getCurrentScreen(macAddress: string): Screen | undefined {
    const screens = this.state.screens
    if (screens.length === 0) return undefined
    const idx = this.state.currentScreenIndex.get(macAddress) ?? 0
    return screens[idx % screens.length]
  }

  addLog(log: DeviceLog): void {
    this.state.logs.push(log)
    if (this.state.logs.length > 1000) {
      this.state.logs = this.state.logs.slice(-500)
    }
    saveJson(LOGS_FILE, this.state.logs)
  }

  getLogs(): DeviceLog[] {
    return this.state.logs
  }

  getImagesDir(): string {
    return IMAGES_DIR
  }
}

export const store = new Store()

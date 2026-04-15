export interface Device {
  id: string
  macAddress: string
  apiKey: string
  friendlyId: string
  name: string
  firmwareVersion: string
  model: string
  batteryVoltage: number
  rssi: number
  width: number
  height: number
  refreshRate: number
  lastSeen: string
  registered: boolean
}

export interface Screen {
  id: string
  name: string
  imageFilename: string
  createdAt: string
}

export interface DeviceLog {
  deviceId: string
  macAddress: string
  timestamp: string
  logs: unknown[]
}

export interface ApiSetupResponse {
  status: number
  api_key: string
  friendly_id: string
  image_url: string
  message: string
}

export interface ApiDisplayResponse {
  status: number
  image_url: string
  filename: string
  refresh_rate: number
  update_firmware: boolean
  firmware_url: string | null
  reset_firmware: boolean
}

export interface ServerState {
  devices: Map<string, Device>
  screens: Screen[]
  currentScreenIndex: Map<string, number>
  logs: DeviceLog[]
}

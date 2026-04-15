<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Device {
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

const devices = ref<Device[]>([])
const editingDevice = ref<Device | null>(null)
const editName = ref('')
const editRefreshRate = ref(900)

async function fetchDevices() {
  const res = await fetch('/api/admin/devices')
  devices.value = await res.json()
}

function isOnline(lastSeen: string): boolean {
  const diff = Date.now() - new Date(lastSeen).getTime()
  return diff < 30 * 60 * 1000 // 30 minutes
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString()
}

function startEdit(device: Device) {
  editingDevice.value = device
  editName.value = device.name
  editRefreshRate.value = device.refreshRate
}

async function saveEdit() {
  if (!editingDevice.value) return
  await fetch(`/api/admin/devices/${encodeURIComponent(editingDevice.value.macAddress)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: editName.value, refreshRate: editRefreshRate.value }),
  })
  editingDevice.value = null
  await fetchDevices()
}

async function deleteDevice(macAddress: string) {
  if (!confirm('Remove this device?')) return
  await fetch(`/api/admin/devices/${encodeURIComponent(macAddress)}`, { method: 'DELETE' })
  await fetchDevices()
}

onMounted(fetchDevices)
</script>

<template>
  <div class="card">
    <div class="card-header">
      <h2>Registered Devices</h2>
      <button class="btn btn-primary btn-small" @click="fetchDevices">Refresh</button>
    </div>

    <div v-if="devices.length === 0" class="empty-state">
      <p>No devices registered yet.</p>
      <p>Point your TRMNL device's base URL to this server and it will appear here.</p>
    </div>

    <table v-else>
      <thead>
        <tr>
          <th>Name</th>
          <th>Friendly ID</th>
          <th>MAC Address</th>
          <th>Model</th>
          <th>Battery</th>
          <th>RSSI</th>
          <th>Refresh</th>
          <th>Status</th>
          <th>Last Seen</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="device in devices" :key="device.id">
          <td>{{ device.name }}</td>
          <td><code>{{ device.friendlyId }}</code></td>
          <td><code>{{ device.macAddress }}</code></td>
          <td>{{ device.model }}</td>
          <td>{{ device.batteryVoltage.toFixed(2) }}V</td>
          <td>{{ device.rssi }} dBm</td>
          <td>{{ device.refreshRate }}s</td>
          <td>
            <span :class="['badge', isOnline(device.lastSeen) ? 'badge-online' : 'badge-offline']">
              {{ isOnline(device.lastSeen) ? 'Online' : 'Offline' }}
            </span>
          </td>
          <td>{{ formatTime(device.lastSeen) }}</td>
          <td>
            <button class="btn btn-primary btn-small" @click="startEdit(device)">Edit</button>
            <button class="btn btn-danger btn-small" @click="deleteDevice(device.macAddress)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <div v-if="editingDevice" class="card">
    <div class="card-header">
      <h2>Edit Device: {{ editingDevice.friendlyId }}</h2>
    </div>
    <div class="device-detail">
      <dt>Name</dt>
      <dd><input type="text" v-model="editName" /></dd>
      <dt>Refresh Rate (seconds)</dt>
      <dd><input type="number" v-model.number="editRefreshRate" min="60" max="86400" /></dd>
      <dt>API Key</dt>
      <dd><code>{{ editingDevice.apiKey }}</code></dd>
      <dt>Firmware</dt>
      <dd>{{ editingDevice.firmwareVersion }}</dd>
      <dt>Display</dt>
      <dd>{{ editingDevice.width }} x {{ editingDevice.height }}</dd>
    </div>
    <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
      <button class="btn btn-primary" @click="saveEdit">Save</button>
      <button class="btn btn-danger" @click="editingDevice = null">Cancel</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface DeviceLog {
  deviceId: string
  macAddress: string
  timestamp: string
  logs: unknown[]
}

const logs = ref<DeviceLog[]>([])

async function fetchLogs() {
  const res = await fetch('/api/admin/logs')
  logs.value = (await res.json()).reverse()
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString()
}

function formatLog(log: unknown[]): string {
  return JSON.stringify(log, null, 2)
}

onMounted(fetchLogs)
</script>

<template>
  <div class="card">
    <div class="card-header">
      <h2>Device Logs</h2>
      <button class="btn btn-primary btn-small" @click="fetchLogs">Refresh</button>
    </div>

    <div v-if="logs.length === 0" class="empty-state">
      <p>No device logs received yet.</p>
      <p>Logs will appear here when devices report errors via POST /api/log.</p>
    </div>

    <div v-else>
      <div v-for="(log, idx) in logs" :key="idx" class="log-entry">
        <span class="timestamp">{{ formatTime(log.timestamp) }}</span>
        <strong>{{ log.macAddress }}</strong>
        <pre style="margin-top: 0.3rem; white-space: pre-wrap; color: var(--text-muted);">{{ formatLog(log.logs) }}</pre>
      </div>
    </div>
  </div>
</template>

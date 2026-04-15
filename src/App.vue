<script setup lang="ts">
import { ref } from 'vue'
import DevicesPanel from './components/DevicesPanel.vue'
import ScreensPanel from './components/ScreensPanel.vue'
import LogsPanel from './components/LogsPanel.vue'

const activeTab = ref<'devices' | 'screens' | 'logs'>('devices')
</script>

<template>
  <div class="app">
    <header>
      <h1>YATS</h1>
      <span>Yet Another TRMNL Server</span>
    </header>

    <div class="tabs">
      <button :class="{ active: activeTab === 'devices' }" @click="activeTab = 'devices'">
        Devices
      </button>
      <button :class="{ active: activeTab === 'screens' }" @click="activeTab = 'screens'">
        Screens
      </button>
      <button :class="{ active: activeTab === 'logs' }" @click="activeTab = 'logs'">
        Logs
      </button>
    </div>

    <DevicesPanel v-if="activeTab === 'devices'" />
    <ScreensPanel v-if="activeTab === 'screens'" />
    <LogsPanel v-if="activeTab === 'logs'" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Screen {
  id: string
  name: string
  imageFilename: string
  createdAt: string
}

const screens = ref<Screen[]>([])

async function fetchScreens() {
  const res = await fetch('/api/admin/screens')
  screens.value = await res.json()
}

async function uploadFile(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  for (const file of input.files) {
    const formData = new FormData()
    formData.append('file', file)

    await fetch('/api/admin/screens', {
      method: 'POST',
      body: formData,
    })
  }

  input.value = ''
  await fetchScreens()
}

async function deleteScreen(id: string) {
  if (!confirm('Delete this screen?')) return
  await fetch(`/api/admin/screens/${id}`, { method: 'DELETE' })
  await fetchScreens()
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString()
}

onMounted(fetchScreens)
</script>

<template>
  <div class="card">
    <div class="card-header">
      <h2>Screen Playlist</h2>
      <button class="btn btn-primary btn-small" @click="fetchScreens">Refresh</button>
    </div>

    <div class="upload-area" @click="($refs.fileInput as HTMLInputElement).click()">
      <input ref="fileInput" type="file" accept=".png,.bmp,.jpg,.jpeg" multiple @change="uploadFile" />
      <p><strong>Click to upload images</strong></p>
      <p>PNG, BMP, or JPEG - 800x480 recommended</p>
    </div>
  </div>

  <div v-if="screens.length === 0" class="card empty-state">
    <p>No screens uploaded yet.</p>
    <p>Upload images above. They will be served to connected TRMNL devices in a playlist rotation.</p>
  </div>

  <div v-else class="screen-grid">
    <div v-for="screen in screens" :key="screen.id" class="screen-card">
      <img :src="`/api/images/${screen.imageFilename}`" :alt="screen.name" />
      <div class="info">
        <div>
          <div class="name">{{ screen.name }}</div>
          <div class="date">{{ formatDate(screen.createdAt) }}</div>
        </div>
        <button class="btn btn-danger btn-small" @click="deleteScreen(screen.id)">Delete</button>
      </div>
    </div>
  </div>
</template>

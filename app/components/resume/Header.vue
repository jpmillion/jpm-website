<script setup lang="ts">
import type { Resume } from '~/data/resume'

defineProps<{
  name: Resume['name']
  headline: Resume['headline']
  contact: Resume['contact']
}>()
</script>

<template>
  <header class="py-20 px-6">
    <UContainer>
      <div class="max-w-3xl">
        <h1 class="text-5xl font-bold tracking-tight mb-3">
          {{ name }}
        </h1>
        <p class="text-xl text-primary font-medium mb-6">
          {{ headline }}
        </p>

        <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
          <span class="inline-flex items-center gap-1.5">
            <UIcon name="i-heroicons-map-pin" class="w-4 h-4" />
            {{ contact.location }}
          </span>
          <span class="inline-flex items-center gap-1.5">
            <UIcon name="i-heroicons-phone" class="w-4 h-4" />
            {{ contact.phone }}
          </span>
          <span class="inline-flex items-center gap-1.5">
            <UIcon name="i-heroicons-envelope" class="w-4 h-4" />
            {{ contact.email }}
          </span>
        </div>

        <div class="flex flex-wrap gap-3">
          <UButton
            :to="contact.github"
            target="_blank"
            rel="noopener"
            variant="outline"
            icon="i-simple-icons-github"
          >
            GitHub
          </UButton>
          <UButton
            :to="contact.linkedin"
            target="_blank"
            rel="noopener"
            variant="outline"
            icon="i-simple-icons-linkedin"
          >
            LinkedIn
          </UButton>
        </div>
      </div>
    </UContainer>
  </header>
</template>

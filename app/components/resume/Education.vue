<script setup lang="ts">
import type { Resume } from '~/data/resume'

defineProps<{
  schools: Resume['education']
}>()
</script>

<template>
  <section class="py-14 px-6">
    <UContainer>
      <h2 class="text-sm font-semibold uppercase tracking-wider text-primary mb-6">
        Education
      </h2>
      <ul class="space-y-4">
        <li
          v-for="school in schools"
          :key="`${school.school}-${school.program}`"
          class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
        >
          <div>
            <p class="font-semibold">
              {{ school.school }}
              <span class="text-gray-500 dark:text-gray-400 font-normal">&middot; {{ school.location }}</span>
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ school.program }}
            </p>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {{ school.dates }}
          </p>
        </li>
      </ul>
    </UContainer>
  </section>
</template>

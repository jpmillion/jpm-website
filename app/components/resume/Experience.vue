<script setup lang="ts">
import type { Resume } from '~/data/resume'

defineProps<{
  jobs: Resume['experience']
}>()
</script>

<template>
  <section class="py-14 px-6">
    <UContainer>
      <h2 class="text-sm font-semibold uppercase tracking-wider text-primary mb-6">
        Experience
      </h2>
      <div class="space-y-6">
        <UCard v-for="job in jobs" :key="`${job.company}-${job.title}`">
          <template #header>
            <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <div>
                <h3 class="text-lg font-semibold">
                  {{ job.title }} &middot;
                  <span class="text-primary">{{ job.company }}</span>
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ job.location }}
                </p>
              </div>
              <p class="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {{ job.dates }}
              </p>
            </div>
          </template>
          <ul class="space-y-2 text-gray-700 dark:text-gray-300 list-disc pl-5">
            <li v-for="bullet in job.bullets" :key="bullet" class="leading-relaxed">
              {{ bullet }}
            </li>
          </ul>
        </UCard>
      </div>
    </UContainer>
  </section>
</template>

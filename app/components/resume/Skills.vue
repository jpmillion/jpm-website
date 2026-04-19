<script setup lang="ts">
import type { Resume } from '~/data/resume'

defineProps<{
  groups: Resume['skillGroups']
}>()
</script>

<template>
  <section class="py-14 px-6 bg-white dark:bg-gray-900">
    <UContainer>
      <h2 class="text-sm font-semibold uppercase tracking-wider text-primary mb-6">
        Skills
      </h2>
      <div class="grid gap-6 md:grid-cols-2">
        <div v-for="group in groups" :key="group.label">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {{ group.label }}
          </h3>
          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="item in group.items"
              :key="item"
              color="neutral"
              variant="subtle"
              size="md"
            >
              {{ item }}
            </UBadge>
          </div>
        </div>
      </div>
    </UContainer>
  </section>
</template>

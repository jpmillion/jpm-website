<script setup lang="ts">
defineProps<{
  summary: string
}>()
</script>

<template>
  <section class="py-14 px-6 bg-white dark:bg-gray-900">
    <UContainer>
      <div class="max-w-3xl">
        <h2 class="text-sm font-semibold uppercase tracking-wider text-primary mb-3">
          About
        </h2>
        <p class="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
          {{ summary }}
        </p>
      </div>
    </UContainer>
  </section>
</template>

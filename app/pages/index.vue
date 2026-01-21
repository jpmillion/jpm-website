<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <!-- Hero Section -->
    <section class="py-24 px-6">
      <UContainer>
        <div class="max-w-3xl">
          <h1 class="text-5xl font-bold tracking-tight mb-6">
            Hi, I'm <span class="text-primary">JP Million</span>
          </h1>
          <p class="text-xl text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
            Software developer passionate about building great products.
            Feel free to explore my projects or chat with my AI assistant to learn more about me.
          </p>
          <div class="flex gap-4">
            <UButton size="lg" to="#projects">View Projects</UButton>
            <UButton size="lg" variant="outline" to="#chat">Chat with AI</UButton>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- Projects Section -->
    <section id="projects" class="py-20 px-6 bg-white dark:bg-gray-900">
      <UContainer>
        <h2 class="text-3xl font-bold mb-2">Projects</h2>
        <p class="text-gray-500 dark:text-gray-400 mb-10">Some things I've built</p>

        <div v-if="pending" class="text-gray-500">Loading projects...</div>
        <div v-else-if="projects?.length" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <UCard
            v-for="project in projects"
            :key="project.id"
            class="hover:shadow-lg transition-shadow"
          >
            <template #header>
              <h3 class="text-lg font-semibold">{{ project.name }}</h3>
            </template>
            <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              {{ project.description }}
            </p>
            <template #footer>
              <div class="flex gap-3">
                <UButton
                  v-if="project.url"
                  :to="project.url"
                  target="_blank"
                  size="sm"
                  icon="i-heroicons-arrow-top-right-on-square"
                >
                  Live
                </UButton>
                <UButton
                  v-if="project.repo_url"
                  :to="project.repo_url"
                  target="_blank"
                  variant="ghost"
                  size="sm"
                  icon="i-heroicons-code-bracket"
                >
                  Code
                </UButton>
              </div>
            </template>
          </UCard>
        </div>
        <p v-else class="text-gray-500">No projects yet.</p>
      </UContainer>
    </section>

    <!-- Chat Section Placeholder -->
    <section id="chat" class="py-20 px-6">
      <UContainer>
        <div class="max-w-2xl mx-auto text-center">
          <h2 class="text-3xl font-bold mb-4">Ask Me Anything</h2>
          <p class="text-gray-500 dark:text-gray-400 mb-8">
            Chat with my AI assistant to learn more about my experience, skills, and projects.
          </p>
          <UCard class="text-left">
            <p class="text-gray-500 text-center py-8">AI Chat coming soon...</p>
          </UCard>
        </div>
      </UContainer>
    </section>
  </div>
</template>

<script setup lang="ts">
const { data: projects, pending } = await useFetch('/api/projects')
</script>

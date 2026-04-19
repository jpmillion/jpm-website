<script setup lang="ts">
import { resume } from '~/data/resume'
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <ResumeHeader
      :name="resume.name"
      :headline="resume.headline"
      :contact="resume.contact"
    />

    <ResumeSummary :summary="resume.summary" />

    <ResumeExperience :jobs="resume.experience" />

    <ResumeSkills :groups="resume.skillGroups" />

    <ResumeEducation :schools="resume.education" />

    <!-- Chat placeholder — RAG-backed chatbot comes in a separate branch. -->
    <section id="chat" class="py-20 px-6 bg-white dark:bg-gray-900">
      <UContainer>
        <div class="max-w-2xl mx-auto text-center">
          <h2 class="text-3xl font-bold mb-4">Ask Me Anything</h2>
          <p class="text-gray-500 dark:text-gray-400 mb-8">
            Chat with an AI assistant grounded in my resume and project history.
          </p>
          <UCard>
            <p class="text-gray-500 text-center py-8">AI chat coming soon…</p>
          </UCard>
        </div>
      </UContainer>
    </section>
  </div>
</template>

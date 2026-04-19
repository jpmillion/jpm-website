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

    <ResumeChat />
  </div>
</template>

import { db } from '../../database'
import { projects } from '../../database/schema'

export default defineEventHandler(async () => {
  const allProjects = await db.select().from(projects)
  return allProjects
})
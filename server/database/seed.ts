import 'dotenv/config'
import { db } from './index'
import { projects } from './schema'

const projectsData = [
  {
    name: 'Finance',
    description: 'Finance is a personal finance management app built with Nuxt 3 and Drizzle ORM.',
    url: null,
    repo_url: 'https://github.com/jpmillion/Finance',
  },
  {
    name: 'Stock Screeners',
    description: 'A collection of stock screeners to help identify investment opportunities.',
    url: null,
    repo_url: 'https://github.com/jpmillion/stock_screeners',
  },
]

async function seed() {
  console.log('Seeding database...')

  // Clear existing projects
  await db.delete(projects)

  // Insert new projects
  await db.insert(projects).values(projectsData)

  console.log(`Seeded ${projectsData.length} projects`)
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})

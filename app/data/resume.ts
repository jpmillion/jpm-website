// Structured resume content for the site.
// this module is a hand-maintained, UI-friendly translation of it.

export interface ResumeContact {
  location: string
  phone: string
  email: string
  github: string
  linkedin: string
}

export interface ResumeSkillGroup {
  label: string
  items: string[]
}

export interface ResumeJob {
  company: string
  location: string
  title: string
  dates: string
  bullets: string[]
}

export interface ResumeSchool {
  school: string
  location: string
  program: string
  dates: string
}

export interface Resume {
  name: string
  headline: string
  contact: ResumeContact
  summary: string
  skillGroups: ResumeSkillGroup[]
  experience: ResumeJob[]
  education: ResumeSchool[]
}

export const resume: Resume = {
  name: 'John Million',
  headline: 'Software Engineer — Full-Stack & AI Applications',

  contact: {
    location: 'New Castle, PA 16101',
    phone: '724-971-8602',
    email: 'jpmillion28@gmail.com',
    github: 'https://github.com/jpmillion',
    linkedin: 'https://www.linkedin.com/in/john-million-7655a3212',
  },

  summary:
    'Full-stack software engineer with experience building AI-powered and enterprise web applications across logistics, compliance, financial analysis, executive assessment, and franchise operations. Strong background in React, Vue, Angular, Django, FastAPI, Express, ASP.NET Core, PostgreSQL, SQL Server, AWS, Azure, Docker, Terraform, and CI/CD. Pragmatic problem solver who can quickly learn unfamiliar systems, translate business needs into working software, and support delivery from architecture through production.',

  skillGroups: [
    {
      label: 'Languages',
      items: ['Python', 'TypeScript', 'JavaScript', 'C#', 'Java', 'SQL'],
    },
    {
      label: 'Frontend',
      items: ['React', 'Next.js', 'Vue', 'Nuxt', 'Angular'],
    },
    {
      label: 'Backend',
      items: ['Django', 'FastAPI', 'Express', 'ASP.NET Core', 'Spring Boot'],
    },
    {
      label: 'Data',
      items: [
        'PostgreSQL',
        'SQL Server',
        'MongoDB',
        'Drizzle ORM',
        'Dapper',
        'pgvector',
      ],
    },
    {
      label: 'Cloud & DevOps',
      items: [
        'AWS',
        'Azure',
        'Docker',
        'Terraform',
        'GitHub Actions',
        'Azure DevOps',
        'ECS/Fargate',
        'EC2',
        'RDS',
        'S3',
      ],
    },
    {
      label: 'AI / LLMs',
      items: ['OpenAI', 'Gemini', 'Embeddings / RAG'],
    },
    {
      label: 'Integrations',
      items: [
        'REST APIs',
        'GraphQL',
        'gRPC',
        'WebSockets',
        'Server-Sent Events',
        'OAuth / SSO',
        'JWT',
      ],
    },
  ],

  experience: [
    {
      company: 'RTS Labs',
      location: 'Glen Allen, VA',
      title: 'Software Engineer',
      dates: '10/2021 – Present',
      bullets: [
        'Deliver full-stack and AI-enabled applications for clients across logistics, compliance, finance, executive assessment, and franchise operations, working across React, Vue, Angular, Django, FastAPI, Express, ASP.NET Core, SQL Server, and PostgreSQL.',
        'Support and enhance HSI\u2019s CLD enterprise content platform using Angular, .NET 8, SQL Server, and Azure, including production issue investigation, QA and release support, reporting validation, and database change workflows.',
        'Built IllumeAFS AI capabilities for audited financial statement analysis, including PDF ingestion, semantic chunking, vector embeddings, policy evaluations, financial data extraction, real-time report updates, and AWS/Terraform-based deployment.',
        'Built Schachter\u2019s AI-powered executive assessment platform using FastAPI, Next.js, PostgreSQL, S3, and OpenAI to ingest interview transcripts, generate polished 360-degree feedback reports, support revisions, and enable report Q&A.',
        'Developed SAS, an AI-driven transportation analytics platform that ingests large Excel datasets, powers interactive dashboards, and enables conversational analysis of routing, fleet, and cost decisions.',
        'Contributed to EZ Track, a multi-tenant franchise operations platform for dumpster rental logistics with real-time dispatch, payment processing, customer portal workflows, AWS ECS/Fargate infrastructure, and CI/CD automation.',
        'Partnered on discovery and high-level architecture planning for multi-tenant modernization initiatives, including workflow analysis, technical audits, rollout strategy, and integration planning across business divisions.',
      ],
    },
  ],

  education: [
    {
      school: 'Flatiron School',
      location: 'New York, NY',
      program: 'Full Stack Web Development — Ruby on Rails and JavaScript',
      dates: '11/2020 – 05/2021',
    },
    {
      school: 'Slippery Rock University',
      location: 'Slippery Rock, PA',
      program: 'B.S. in Exercise Science',
      dates: '09/1999 – 05/2002',
    },
  ],
}

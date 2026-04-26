/**
 * Standalone migration script.
 * Run: npx tsx src/db/migrate.ts
 * Ensures pgvector extension exists, then defers schema push to drizzle-kit CLI.
 */
import 'dotenv/config'
import postgres from 'postgres'

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL is not set')
    process.exit(1)
  }

  const sql = postgres(url, { max: 1 })

  try {
    await sql`CREATE EXTENSION IF NOT EXISTS vector`
    console.log('pgvector extension ready')
  } finally {
    await sql.end()
  }

  // Schema push is handled by: npm run db:push
  console.log('Run "npm run db:push" to apply schema changes.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

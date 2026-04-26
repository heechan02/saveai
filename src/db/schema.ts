import { pgTable, uuid, text, integer, numeric, timestamp, pgEnum, index, vector } from 'drizzle-orm/pg-core'

export const roleEnum = pgEnum('role', ['user', 'assistant', 'system'])
export const savingsKindEnum = pgEnum('savings_kind', ['cost_cliff', 'context_trim', 'duplicate'])

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    role: roleEnum('role').notNull(),
    content: text('content').notNull(),
    tokensIn: integer('tokens_in'),
    tokensOut: integer('tokens_out'),
    costUsd: numeric('cost_usd', { precision: 12, scale: 8 }),
    waterMl: numeric('water_ml', { precision: 10, scale: 4 }),
    carbonG: numeric('carbon_g', { precision: 10, scale: 4 }),
    model: text('model'),
    tier: integer('tier'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    /** text-embedding-004 produces 768-dim vectors */
    embedding: vector('embedding', { dimensions: 768 }),
  },
  (t) => [index('messages_conversation_id_idx').on(t.conversationId)]
)

export const savingsEvents = pgTable('savings_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: savingsKindEnum('kind').notNull(),
  amountUsd: numeric('amount_usd', { precision: 12, scale: 8 }).notNull(),
  amountWaterMl: numeric('amount_water_ml', { precision: 10, scale: 4 }).notNull(),
  amountCarbonG: numeric('amount_carbon_g', { precision: 10, scale: 4 }).notNull(),
  messageId: uuid('message_id').references(() => messages.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

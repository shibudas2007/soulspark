import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  username: text('username').notNull().unique(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  bio: text('bio').notNull().default(''),
  interests: text('interests').array().notNull().default([]),
  isMinorProtected: boolean('is_minor_protected').notNull().default(false),
  connectionPrivacy: text('connection_privacy').notNull().default('connections'),
  commentPrivacy: text('comment_privacy').notNull().default('everyone'),
  recoveryHintEmail: text('recovery_hint_email'),
  onboardingComplete: boolean('onboarding_complete').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const expressions = pgTable('expressions', {
  id: serial('id').primaryKey(),
  authorUid: text('author_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  tags: text('tags').array().notNull().default([]),
  allowComments: text('allow_comments').notNull().default('everyone'),
  moderationStatus: text('moderation_status').notNull().default('approved'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const reactions = pgTable(
  'reactions',
  {
    id: serial('id').primaryKey(),
    expressionId: integer('expression_id')
      .references(() => expressions.id, { onDelete: 'cascade' })
      .notNull(),
    userUid: text('user_uid')
      .references(() => users.uid, { onDelete: 'cascade' })
      .notNull(),
    type: text('type').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('reactions_expression_user_type_idx').on(
      table.expressionId,
      table.userUid,
      table.type
    ),
  ]
);

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  expressionId: integer('expression_id')
    .references(() => expressions.id, { onDelete: 'cascade' })
    .notNull(),
  authorUid: text('author_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const connections = pgTable(
  'connections',
  {
    id: serial('id').primaryKey(),
    requesterUid: text('requester_uid')
      .references(() => users.uid, { onDelete: 'cascade' })
      .notNull(),
    recipientUid: text('recipient_uid')
      .references(() => users.uid, { onDelete: 'cascade' })
      .notNull(),
    status: text('status').notNull().default('pending'),
    introNote: text('intro_note').notNull().default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('connections_requester_recipient_idx').on(
      table.requesterUid,
      table.recipientUid
    ),
  ]
);

export const collectiveSpaces = pgTable('collective_spaces', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  kind: text('kind').notNull(),
  prompt: text('prompt').notNull(),
  coverImageUrl: text('cover_image_url'),
  tags: text('tags').array().notNull().default([]),
  creatorUid: text('creator_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const collectiveContributions = pgTable('collective_contributions', {
  id: serial('id').primaryKey(),
  spaceId: integer('space_id')
    .references(() => collectiveSpaces.id, { onDelete: 'cascade' })
    .notNull(),
  authorUid: text('author_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const blocks = pgTable(
  'blocks',
  {
    id: serial('id').primaryKey(),
    blockerUid: text('blocker_uid')
      .references(() => users.uid, { onDelete: 'cascade' })
      .notNull(),
    blockedUid: text('blocked_uid')
      .references(() => users.uid, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('blocks_blocker_blocked_idx').on(table.blockerUid, table.blockedUid),
  ]
);

export const reports = pgTable('reports', {
  id: serial('id').primaryKey(),
  reporterUid: text('reporter_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  reason: text('reason').notNull(),
  details: text('details').notNull().default(''),
  status: text('status').notNull().default('open'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const mediaUploads = pgTable('media_uploads', {
  id: serial('id').primaryKey(),
  uploaderUid: text('uploader_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  mimeType: text('mime_type').notNull(),
  base64Data: text('base64_data').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  expressions: many(expressions),
  comments: many(comments),
  reactions: many(reactions),
}));

export const expressionsRelations = relations(expressions, ({ one, many }) => ({
  author: one(users, {
    fields: [expressions.authorUid],
    references: [users.uid],
  }),
  comments: many(comments),
  reactions: many(reactions),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  expression: one(expressions, {
    fields: [comments.expressionId],
    references: [expressions.id],
  }),
  author: one(users, {
    fields: [comments.authorUid],
    references: [users.uid],
  }),
}));

export const reactionsRelations = relations(reactions, ({ one }) => ({
  expression: one(expressions, {
    fields: [reactions.expressionId],
    references: [expressions.id],
  }),
  user: one(users, {
    fields: [reactions.userUid],
    references: [users.uid],
  }),
}));

export const collectiveSpacesRelations = relations(collectiveSpaces, ({ one, many }) => ({
  creator: one(users, {
    fields: [collectiveSpaces.creatorUid],
    references: [users.uid],
  }),
  contributions: many(collectiveContributions),
}));

export const collectiveContributionsRelations = relations(
  collectiveContributions,
  ({ one }) => ({
    space: one(collectiveSpaces, {
      fields: [collectiveContributions.spaceId],
      references: [collectiveSpaces.id],
    }),
    author: one(users, {
      fields: [collectiveContributions.authorUid],
      references: [users.uid],
    }),
  })
);

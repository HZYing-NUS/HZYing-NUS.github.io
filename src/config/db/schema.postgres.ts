import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { envConfigs } from '@/config';

const schemaName = (envConfigs.db_schema || 'public').trim();
// Drizzle forbids pgSchema('public'); for public schema use pgTable().
// For non-public schema (e.g. 'web'), use pgSchema(name).table() to generate "schema"."table".
const customSchema =
  schemaName && schemaName !== 'public' ? pgSchema(schemaName) : null;
const table: typeof pgTable = customSchema
  ? (customSchema.table.bind(customSchema) as unknown as typeof pgTable)
  : pgTable;

export const user = table(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text('image'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    // Track first-touch acquisition channel (e.g. google, twitter, newsletter)
    utmSource: text('utm_source').notNull().default(''),
    ip: text('ip').notNull().default(''),
    locale: text('locale').notNull().default(''),
    aiAccessStatus: text('ai_access_status').notNull().default('active'),
    globalMemoryEnabled: boolean('global_memory_enabled')
      .notNull()
      .default(true),
  },
  (table) => [
    // Search users by name in admin dashboard
    index('idx_user_name').on(table.name),
    // Order users by registration time for latest users list
    index('idx_user_created_at').on(table.createdAt),
  ]
);

export const session = table(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    // Composite: Query user sessions and filter by expiration
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_session_user_expires').on(table.userId, table.expiresAt),
  ]
);

export const account = table(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Query all linked accounts for a user
    index('idx_account_user_id').on(table.userId),
    // Composite: OAuth login (most critical)
    // Can also be used for: WHERE providerId = ? (left-prefix)
    index('idx_account_provider_account').on(table.providerId, table.accountId),
  ]
);

export const verification = table(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Find verification code by identifier (e.g., find code by email)
    index('idx_verification_identifier').on(table.identifier),
  ]
);

export const config = table('config', {
  name: text('name').unique().notNull(),
  value: text('value'),
});

export const taxonomy = table(
  'taxonomy',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    parentId: text('parent_id'),
    slug: text('slug').unique().notNull(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    image: text('image'),
    icon: text('icon'),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    sort: integer('sort').default(0).notNull(),
  },
  (table) => [
    // Composite: Query taxonomies by type and status
    // Can also be used for: WHERE type = ? (left-prefix)
    index('idx_taxonomy_type_status').on(table.type, table.status),
  ]
);

export const post = table(
  'post',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    parentId: text('parent_id'),
    slug: text('slug').unique().notNull(),
    type: text('type').notNull(),
    title: text('title'),
    description: text('description'),
    image: text('image'),
    content: text('content'),
    categories: text('categories'),
    tags: text('tags'),
    authorName: text('author_name'),
    authorImage: text('author_image'),
    status: text('status').notNull(),
    locale: text('locale'),
    summaryZh: text('summary_zh'),
    summaryEn: text('summary_en'),
    contentZh: text('content_zh'),
    contentEn: text('content_en'),
    coverImageUrl: text('cover_image_url'),
    seoTitleZh: text('seo_title_zh'),
    seoTitleEn: text('seo_title_en'),
    seoDescriptionZh: text('seo_description_zh'),
    seoDescriptionEn: text('seo_description_en'),
    allowAiCitation: boolean('allow_ai_citation').default(true).notNull(),
    featured: boolean('featured').default(false).notNull(),
    legacyFileName: text('legacy_file_name'),
    translationGroup: text('translation_group'),
    publishedAt: timestamp('published_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    sort: integer('sort').default(0).notNull(),
  },
  (table) => [
    // Composite: Query posts by type and status
    // Can also be used for: WHERE type = ? (left-prefix)
    index('idx_post_type_status').on(table.type, table.status),
  ]
);

export const order = table(
  'order',
  {
    id: text('id').primaryKey(),
    orderNo: text('order_no').unique().notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    userEmail: text('user_email'), // checkout user email
    status: text('status').notNull(), // created, paid, failed
    amount: integer('amount').notNull(), // checkout amount in cents
    currency: text('currency').notNull(), // checkout currency
    productId: text('product_id'),
    paymentType: text('payment_type'), // one_time, subscription
    paymentInterval: text('payment_interval'), // day, week, month, year
    paymentProvider: text('payment_provider').notNull(),
    paymentSessionId: text('payment_session_id'),
    checkoutInfo: text('checkout_info').notNull(), // checkout request info
    checkoutResult: text('checkout_result'), // checkout result
    paymentResult: text('payment_result'), // payment result
    discountCode: text('discount_code'), // discount code
    discountAmount: integer('discount_amount'), // discount amount in cents
    discountCurrency: text('discount_currency'), // discount currency
    paymentEmail: text('payment_email'), // actual payment email
    paymentAmount: integer('payment_amount'), // actual payment amount
    paymentCurrency: text('payment_currency'), // actual payment currency
    paidAt: timestamp('paid_at'), // paid at
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    description: text('description'), // order description
    productName: text('product_name'), // product name
    subscriptionId: text('subscription_id'), // provider subscription id
    subscriptionResult: text('subscription_result'), // provider subscription result
    checkoutUrl: text('checkout_url'), // checkout url
    callbackUrl: text('callback_url'), // callback url, after handle callback
    creditsAmount: integer('credits_amount'), // credits amount
    creditsValidDays: integer('credits_valid_days'), // credits validity days
    planName: text('plan_name'), // subscription plan name
    paymentProductId: text('payment_product_id'), // payment product id
    invoiceId: text('invoice_id'),
    invoiceUrl: text('invoice_url'),
    subscriptionNo: text('subscription_no'), // order subscription no
    transactionId: text('transaction_id'), // payment transaction id
    paymentUserName: text('payment_user_name'), // payment user name
    paymentUserId: text('payment_user_id'), // payment user id
  },
  (table) => [
    // Composite: Query user orders by status (most common)
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_order_user_status_payment_type').on(
      table.userId,
      table.status,
      table.paymentType
    ),
    // Composite: Prevent duplicate payments
    // Can also be used for: WHERE transactionId = ? (left-prefix)
    uniqueIndex('idx_order_transaction_provider').on(
      table.transactionId,
      table.paymentProvider
    ),
    // Order orders by creation time for listing
    index('idx_order_created_at').on(table.createdAt),
  ]
);

export const subscription = table(
  'subscription',
  {
    id: text('id').primaryKey(),
    subscriptionNo: text('subscription_no').unique().notNull(), // subscription no
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    userEmail: text('user_email'), // subscription user email
    status: text('status').notNull(), // subscription status
    paymentProvider: text('payment_provider').notNull(),
    subscriptionId: text('subscription_id').notNull(), // provider subscription id
    subscriptionResult: text('subscription_result'), // provider subscription result
    productId: text('product_id'), // product id
    description: text('description'), // subscription description
    amount: integer('amount'), // subscription amount
    currency: text('currency'), // subscription currency
    interval: text('interval'), // subscription interval, day, week, month, year
    intervalCount: integer('interval_count'), // subscription interval count
    trialPeriodDays: integer('trial_period_days'), // subscription trial period days
    currentPeriodStart: timestamp('current_period_start'), // subscription current period start
    currentPeriodEnd: timestamp('current_period_end'), // subscription current period end
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    planName: text('plan_name'),
    billingUrl: text('billing_url'),
    productName: text('product_name'), // subscription product name
    creditsAmount: integer('credits_amount'), // subscription credits amount
    creditsValidDays: integer('credits_valid_days'), // subscription credits valid days
    paymentProductId: text('payment_product_id'), // subscription payment product id
    paymentUserId: text('payment_user_id'), // subscription payment user id
    canceledAt: timestamp('canceled_at'), // subscription canceled apply at
    canceledEndAt: timestamp('canceled_end_at'), // subscription canceled end at
    canceledReason: text('canceled_reason'), // subscription canceled reason
    canceledReasonType: text('canceled_reason_type'), // subscription canceled reason type
  },
  (table) => [
    // Composite: Query user's subscriptions by status (most common)
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_subscription_user_status_interval').on(
      table.userId,
      table.status,
      table.interval
    ),
    // Composite: Prevent duplicate subscriptions
    // Can also be used for: WHERE paymentProvider = ? (left-prefix)
    index('idx_subscription_provider_id').on(
      table.subscriptionId,
      table.paymentProvider
    ),
    // Order subscriptions by creation time for listing
    index('idx_subscription_created_at').on(table.createdAt),
  ]
);

export const credit = table(
  'credit',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }), // user id
    userEmail: text('user_email'), // user email
    orderNo: text('order_no'), // payment order no
    subscriptionNo: text('subscription_no'), // subscription no
    transactionNo: text('transaction_no').unique().notNull(), // transaction no
    transactionType: text('transaction_type').notNull(), // transaction type, grant / consume
    transactionScene: text('transaction_scene'), // transaction scene, payment / subscription / gift / award
    credits: integer('credits').notNull(), // credits amount, n or -n
    remainingCredits: integer('remaining_credits').notNull().default(0), // remaining credits amount
    description: text('description'), // transaction description
    expiresAt: timestamp('expires_at'), // transaction expires at
    status: text('status').notNull(), // transaction status
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    consumedDetail: text('consumed_detail'), // consumed detail
    metadata: text('metadata'), // transaction metadata
    idempotencyKey: text('idempotency_key'),
  },
  (table) => [
    // Critical composite index for credit consumption (FIFO queue)
    // Query: WHERE userId = ? AND transactionType = 'grant' AND status = 'active'
    //        AND remainingCredits > 0 ORDER BY expiresAt
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_credit_consume_fifo').on(
      table.userId,
      table.status,
      table.transactionType,
      table.remainingCredits,
      table.expiresAt
    ),
    // Query credits by order number
    index('idx_credit_order_no').on(table.orderNo),
    // Query credits by subscription number
    index('idx_credit_subscription_no').on(table.subscriptionNo),
    uniqueIndex('idx_credit_idempotency_key').on(table.idempotencyKey),
  ]
);

export const creditIdentityClaim = table(
  'credit_identity_claim',
  {
    id: text('id').primaryKey(),
    identityHash: text('identity_hash').notNull().unique(),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('idx_credit_identity_claim_user').on(table.userId)]
);

export const apikey = table(
  'apikey',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    title: text('title').notNull(),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    // Composite: Query user's API keys by status
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_apikey_user_status').on(table.userId, table.status),
    // Composite: Validate active API key (most common for auth)
    // Can also be used for: WHERE key = ? (left-prefix)
    index('idx_apikey_key_status').on(table.key, table.status),
  ]
);

// RBAC Tables
export const role = table(
  'role',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(), // admin, editor, viewer
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    sort: integer('sort').default(0).notNull(),
  },
  (table) => [
    // Query active roles
    index('idx_role_status').on(table.status),
  ]
);

export const permission = table(
  'permission',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(), // admin.users.read, admin.posts.write
    resource: text('resource').notNull(), // users, posts, categories
    action: text('action').notNull(), // read, write, delete
    title: text('title').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Composite: Query permissions by resource and action
    // Can also be used for: WHERE resource = ? (left-prefix)
    index('idx_permission_resource_action').on(table.resource, table.action),
  ]
);

export const rolePermission = table(
  'role_permission',
  {
    id: text('id').primaryKey(),
    roleId: text('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id')
      .notNull()
      .references(() => permission.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    // Composite: Query permissions for a role
    // Can also be used for: WHERE roleId = ? (left-prefix)
    index('idx_role_permission_role_permission').on(
      table.roleId,
      table.permissionId
    ),
  ]
);

export const userRole = table(
  'user_role',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    roleId: text('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    expiresAt: timestamp('expires_at'),
  },
  (table) => [
    // Composite: Query user's active roles (most critical for auth)
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_user_role_user_expires').on(table.userId, table.expiresAt),
  ]
);

export const aiTask = table(
  'ai_task',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    mediaType: text('media_type').notNull(),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    prompt: text('prompt').notNull(),
    options: text('options'),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    taskId: text('task_id'), // provider task id
    taskInfo: text('task_info'), // provider task info
    taskResult: text('task_result'), // provider task result
    costCredits: integer('cost_credits').notNull().default(0),
    scene: text('scene').notNull().default(''),
    creditId: text('credit_id'), // credit consumption record id
  },
  (table) => [
    // Composite: Query user's AI tasks by status
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_ai_task_user_media_type').on(table.userId, table.mediaType),
    // Composite: Query user's AI tasks by media type and provider
    // Can also be used for: WHERE mediaType = ? AND provider = ? (left-prefix)
    index('idx_ai_task_media_type_status').on(table.mediaType, table.status),
  ]
);

export const aiProvider = table(
  'ai_provider',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    apiBaseUrl: text('api_base_url'),
    apiKeyEnvName: text('api_key_env_name'),
    status: text('status').notNull().default('active'),
    priority: integer('priority').notNull().default(0),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('idx_ai_provider_status').on(table.status, table.priority)]
);

export const aiModel = table(
  'ai_model',
  {
    id: text('id').primaryKey(),
    publicId: text('public_id').notNull().unique(),
    visibleName: text('visible_name').notNull(),
    description: text('description'),
    providerId: text('provider_id')
      .notNull()
      .references(() => aiProvider.id, { onDelete: 'restrict' }),
    providerModelId: text('provider_model_id').notNull(),
    fallbackProviderId: text('fallback_provider_id').references(
      () => aiProvider.id,
      { onDelete: 'restrict' }
    ),
    fallbackProviderModelId: text('fallback_provider_model_id'),
    fallbackIsSameModel: boolean('fallback_is_same_model')
      .notNull()
      .default(true),
    fallbackInputPricePerMillion: numeric('fallback_input_price_per_million', {
      precision: 18,
      scale: 8,
    }),
    fallbackOutputPricePerMillion: numeric(
      'fallback_output_price_per_million',
      { precision: 18, scale: 8 }
    ),
    fallbackCacheReadPricePerMillion: numeric(
      'fallback_cache_read_price_per_million',
      { precision: 18, scale: 8 }
    ),
    fallbackCacheWritePricePerMillion: numeric(
      'fallback_cache_write_price_per_million',
      { precision: 18, scale: 8 }
    ),
    inputPricePerMillion: numeric('input_price_per_million', {
      precision: 18,
      scale: 8,
    }).notNull(),
    outputPricePerMillion: numeric('output_price_per_million', {
      precision: 18,
      scale: 8,
    }).notNull(),
    cacheReadPricePerMillion: numeric('cache_read_price_per_million', {
      precision: 18,
      scale: 8,
    }),
    cacheWritePricePerMillion: numeric('cache_write_price_per_million', {
      precision: 18,
      scale: 8,
    }),
    currency: text('currency').notNull().default('USD'),
    pricingVersion: text('pricing_version').notNull(),
    pricingSource: text('pricing_source'),
    pricingEffectiveAt: timestamp('pricing_effective_at').notNull(),
    contextWindow: integer('context_window').notNull(),
    maxOutputTokens: integer('max_output_tokens').notNull(),
    supportsVision: boolean('supports_vision').notNull().default(false),
    supportsTools: boolean('supports_tools').notNull().default(false),
    supportsStreaming: boolean('supports_streaming').notNull().default(true),
    supportsReasoning: boolean('supports_reasoning').notNull().default(false),
    reasoningEffort: text('reasoning_effort').notNull().default('medium'),
    enabled: boolean('enabled').notNull().default(true),
    recommendationMode: text('recommendation_mode'),
    sort: integer('sort').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('idx_ai_model_enabled_sort').on(table.enabled, table.sort),
    index('idx_ai_model_provider').on(table.providerId),
    index('idx_ai_model_fallback_provider').on(table.fallbackProviderId),
  ]
);

export const skill = table(
  'skill',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),
    suitableFor: text('suitable_for'),
    unsuitableFor: text('unsuitable_for'),
    status: text('status').notNull().default('draft'),
    userEnabled: boolean('user_enabled').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('idx_skill_status').on(table.status, table.userEnabled)]
);

export const skillVersion = table(
  'skill_version',
  {
    id: text('id').primaryKey(),
    skillId: text('skill_id')
      .notNull()
      .references(() => skill.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    methodology: text('methodology').notNull(),
    systemPrompt: text('system_prompt').notNull(),
    diagnosticSteps: jsonb('diagnostic_steps').notNull(),
    followUpQuestions: jsonb('follow_up_questions').notNull(),
    quickOutputFormat: text('quick_output_format').notNull(),
    deepOutputFormat: text('deep_output_format').notNull(),
    completionConditions: text('completion_conditions').notNull(),
    referenceMaterials: jsonb('reference_materials'),
    auditMetadata: jsonb('audit_metadata'),
    status: text('status').notNull().default('draft'),
    publishedAt: timestamp('published_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('idx_skill_version_unique').on(table.skillId, table.version),
    index('idx_skill_version_status').on(table.skillId, table.status),
  ]
);

export const project = table(
  'project',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    targetAudience: text('target_audience'),
    stage: text('stage'),
    technology: text('technology'),
    confirmedDecisions: text('confirmed_decisions'),
    completedItems: text('completed_items'),
    currentProblem: text('current_problem'),
    nextSteps: text('next_steps'),
    importantConclusions: text('important_conclusions'),
    recentProgress: text('recent_progress'),
    autoMemoryEnabled: boolean('auto_memory_enabled').notNull().default(true),
    status: text('status').notNull().default('active'),
    deletedAt: timestamp('deleted_at'),
    purgeAt: timestamp('purge_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('idx_project_user_status').on(table.userId, table.status)]
);

export const chat = table(
  'chat',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    model: text('model').notNull(),
    provider: text('provider').notNull(),
    title: text('title').notNull().default(''),
    parts: text('parts').notNull(),
    metadata: text('metadata'),
    content: text('content'),
    projectId: text('project_id').references(() => project.id, {
      onDelete: 'cascade',
    }),
    skillVersionId: text('skill_version_id').references(() => skillVersion.id, {
      onDelete: 'restrict',
    }),
    skillDisabledAt: timestamp('skill_disabled_at'),
    webSearchEnabled: boolean('web_search_enabled').notNull().default(false),
    deletedAt: timestamp('deleted_at'),
    purgeAt: timestamp('purge_at'),
  },
  (table) => [
    index('idx_chat_user_status').on(table.userId, table.status),
    index('idx_chat_project').on(table.userId, table.projectId),
  ]
);

export const chatMessage = table(
  'chat_message',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    chatId: text('chat_id')
      .notNull()
      .references(() => chat.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
    role: text('role').notNull(),
    parts: text('parts').notNull(),
    metadata: text('metadata'),
    model: text('model').notNull(),
    provider: text('provider').notNull(),
    content: text('content'),
    skillVersionId: text('skill_version_id').references(() => skillVersion.id, {
      onDelete: 'restrict',
    }),
    webSearchEnabled: boolean('web_search_enabled').notNull().default(false),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    cacheReadTokens: integer('cache_read_tokens'),
    cacheWriteTokens: integer('cache_write_tokens'),
    estimatedCredits: integer('estimated_credits'),
    reservedCredits: integer('reserved_credits'),
    settledCredits: integer('settled_credits'),
    refundedCredits: integer('refunded_credits'),
    reservationId: text('reservation_id').references(
      () => creditReservation.id,
      { onDelete: 'set null' }
    ),
    sourceDetails: jsonb('source_details'),
    fileIds: jsonb('file_ids'),
    errorReason: text('error_reason'),
    fallbackConfirmedAt: timestamp('fallback_confirmed_at'),
  },
  (table) => [
    index('idx_chat_message_chat_id').on(table.chatId, table.status),
    index('idx_chat_message_user_id').on(table.userId, table.status),
  ]
);

export const projectMemory = table(
  'project_memory',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    projectId: text('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    content: text('content').notNull(),
    importance: integer('importance').notNull().default(0),
    sourceChatId: text('source_chat_id').references(() => chat.id, {
      onDelete: 'cascade',
    }),
    sourceMessageId: text('source_message_id').references(
      () => chatMessage.id,
      { onDelete: 'cascade' }
    ),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('idx_project_memory_owner').on(
      table.userId,
      table.projectId,
      table.status
    ),
    index('idx_project_memory_source_chat').on(table.sourceChatId),
  ]
);

export const globalMemory = table(
  'global_memory',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    sourceChatId: text('source_chat_id').references(() => chat.id, {
      onDelete: 'set null',
    }),
    sourceMessageId: text('source_message_id').references(
      () => chatMessage.id,
      { onDelete: 'set null' }
    ),
    confirmedAt: timestamp('confirmed_at'),
    status: text('status').notNull().default('pending'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('idx_global_memory_owner').on(table.userId, table.status)]
);

export const aiFile = table(
  'ai_file',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    projectId: text('project_id').references(() => project.id, {
      onDelete: 'cascade',
    }),
    chatId: text('chat_id').references(() => chat.id, { onDelete: 'cascade' }),
    originalName: text('original_name').notNull(),
    objectKey: text('object_key').notNull().unique(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    contentHash: text('content_hash').notNull(),
    parseStatus: text('parse_status').notNull().default('pending'),
    parseError: text('parse_error'),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    index('idx_ai_file_owner_project').on(
      table.userId,
      table.projectId,
      table.status
    ),
    index('idx_ai_file_owner_chat').on(
      table.userId,
      table.chatId,
      table.status
    ),
  ]
);

export const aiRequestLease = table(
  'ai_request_lease',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_ai_request_lease_owner').on(table.userId, table.expiresAt),
  ]
);

export const paymentRiskEvent = table(
  'payment_risk_event',
  {
    id: text('id').primaryKey(),
    provider: text('provider').notNull(),
    providerEventId: text('provider_event_id').notNull(),
    eventType: text('event_type').notNull(),
    orderNo: text('order_no'),
    transactionId: text('transaction_id'),
    userId: text('user_id').references(() => user.id, { onDelete: 'restrict' }),
    status: text('status').notNull(),
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_payment_risk_event_provider_id').on(
      table.provider,
      table.providerEventId
    ),
    index('idx_payment_risk_event_order').on(table.provider, table.orderNo),
  ]
);

export const fileChunk = table(
  'file_chunk',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    fileId: text('file_id')
      .notNull()
      .references(() => aiFile.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    content: text('content').notNull(),
    tokenCount: integer('token_count'),
    retrievalMetadata: jsonb('retrieval_metadata'),
    embedding: jsonb('embedding'),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_file_chunk_unique').on(table.fileId, table.chunkIndex),
    index('idx_file_chunk_owner').on(table.userId, table.fileId, table.status),
  ]
);

export const creditReservation = table(
  'credit_reservation',
  {
    id: text('id').primaryKey(),
    requestId: text('request_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    idempotencyKey: text('idempotency_key').notNull(),
    reservedCredits: integer('reserved_credits').notNull(),
    settledCredits: integer('settled_credits').notNull().default(0),
    refundedCredits: integer('refunded_credits').notNull().default(0),
    status: text('status').notNull(),
    priceSnapshot: jsonb('price_snapshot').notNull(),
    costBreakdown: jsonb('cost_breakdown').notNull(),
    consumedDetail: jsonb('consumed_detail').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    settledAt: timestamp('settled_at'),
    failureReason: text('failure_reason'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('idx_credit_reservation_idempotency').on(
      table.userId,
      table.idempotencyKey
    ),
    index('idx_credit_reservation_owner').on(table.userId, table.createdAt),
    index('idx_credit_reservation_request').on(table.userId, table.requestId),
  ]
);

export const usageLedger = table(
  'usage_ledger',
  {
    id: text('id').primaryKey(),
    requestId: text('request_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    reservationId: text('reservation_id').references(
      () => creditReservation.id,
      {
        onDelete: 'restrict',
      }
    ),
    entryType: text('entry_type').notNull(),
    providerId: text('provider_id').references(() => aiProvider.id, {
      onDelete: 'restrict',
    }),
    modelId: text('model_id').references(() => aiModel.id, {
      onDelete: 'restrict',
    }),
    skillVersionId: text('skill_version_id').references(() => skillVersion.id, {
      onDelete: 'restrict',
    }),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    cacheReadTokens: integer('cache_read_tokens').notNull().default(0),
    cacheWriteTokens: integer('cache_write_tokens').notNull().default(0),
    webSearchCostUsd: numeric('web_search_cost_usd', {
      precision: 18,
      scale: 8,
    })
      .notNull()
      .default('0'),
    fileCostUsd: numeric('file_cost_usd', { precision: 18, scale: 8 })
      .notNull()
      .default('0'),
    memoryCostUsd: numeric('memory_cost_usd', { precision: 18, scale: 8 })
      .notNull()
      .default('0'),
    internalCostUsd: numeric('internal_cost_usd', { precision: 18, scale: 8 })
      .notNull()
      .default('0'),
    retailCostUsd: numeric('retail_cost_usd', { precision: 18, scale: 8 })
      .notNull()
      .default('0'),
    rawCredits: numeric('raw_credits', { precision: 18, scale: 8 })
      .notNull()
      .default('0'),
    chargedCredits: integer('charged_credits').notNull().default(0),
    refundedCredits: integer('refunded_credits').notNull().default(0),
    status: text('status').notNull(),
    failureReason: text('failure_reason'),
    priceSnapshot: jsonb('price_snapshot').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_usage_ledger_owner').on(table.userId, table.createdAt),
    index('idx_usage_ledger_request').on(table.userId, table.requestId),
    index('idx_usage_ledger_reservation').on(table.reservationId),
  ]
);

export const stage = table(
  'stage',
  {
    id: text('id').primaryKey(),
    nameZh: text('name_zh').notNull(),
    nameEn: text('name_en'),
    slug: text('slug').notNull().unique(),
    descriptionZh: text('description_zh'),
    descriptionEn: text('description_en'),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('idx_stage_slug').on(table.slug)]
);

export const category = table(
  'category',
  {
    id: text('id').primaryKey(),
    nameZh: text('name_zh').notNull(),
    nameEn: text('name_en'),
    slug: text('slug').notNull().unique(),
    descriptionZh: text('description_zh'),
    descriptionEn: text('description_en'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('idx_category_slug').on(table.slug)]
);

export const tag = table(
  'tag',
  {
    id: text('id').primaryKey(),
    nameZh: text('name_zh').notNull(),
    nameEn: text('name_en'),
    slug: text('slug').notNull().unique(),
    descriptionZh: text('description_zh'),
    descriptionEn: text('description_en'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('idx_tag_slug').on(table.slug)]
);

export const resource = table(
  'resource',
  {
    id: text('id').primaryKey(),
    nameZh: text('name_zh').notNull(),
    nameEn: text('name_en'),
    slug: text('slug').notNull().unique(),
    websiteUrl: text('website_url'),
    resourceType: text('resource_type').notNull(),
    stageId: text('stage_id').references(() => stage.id, {
      onDelete: 'set null',
    }),
    categoryId: text('category_id').references(() => category.id, {
      onDelete: 'set null',
    }),
    summaryZh: text('summary_zh'),
    summaryEn: text('summary_en'),
    reasonZh: text('reason_zh'),
    reasonEn: text('reason_en'),
    useCaseZh: text('use_case_zh'),
    useCaseEn: text('use_case_en'),
    pricingType: text('pricing_type').default('unknown').notNull(),
    iconUrl: text('icon_url'),
    screenshotUrl: text('screenshot_url'),
    sourceNote: text('source_note'),
    seoTitleZh: text('seo_title_zh'),
    seoTitleEn: text('seo_title_en'),
    seoDescriptionZh: text('seo_description_zh'),
    seoDescriptionEn: text('seo_description_en'),
    featured: boolean('featured').default(false).notNull(),
    status: text('status').default('draft').notNull(),
    allowAiCitation: boolean('allow_ai_citation').default(true).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_resource_slug').on(table.slug),
    index('idx_resource_status').on(table.status),
    index('idx_resource_type').on(table.resourceType),
    index('idx_resource_featured').on(table.featured),
  ]
);

export const collection = table(
  'collection',
  {
    id: text('id').primaryKey(),
    titleZh: text('title_zh').notNull(),
    titleEn: text('title_en'),
    slug: text('slug').notNull().unique(),
    summaryZh: text('summary_zh'),
    summaryEn: text('summary_en'),
    contentZh: text('content_zh'),
    contentEn: text('content_en'),
    stageId: text('stage_id').references(() => stage.id, {
      onDelete: 'set null',
    }),
    categoryId: text('category_id').references(() => category.id, {
      onDelete: 'set null',
    }),
    seoTitleZh: text('seo_title_zh'),
    seoTitleEn: text('seo_title_en'),
    seoDescriptionZh: text('seo_description_zh'),
    seoDescriptionEn: text('seo_description_en'),
    featured: boolean('featured').default(false).notNull(),
    status: text('status').default('draft').notNull(),
    allowAiCitation: boolean('allow_ai_citation').default(true).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_collection_slug').on(table.slug),
    index('idx_collection_status').on(table.status),
    index('idx_collection_featured').on(table.featured),
  ]
);

export const submission = table(
  'submission',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    url: text('url'),
    description: text('description'),
    suggestedTags: text('suggested_tags'),
    relatedContentType: text('related_content_type'),
    relatedContentId: text('related_content_id'),
    submitterUserId: text('submitter_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    status: text('status').default('pending').notNull(),
    adminNote: text('admin_note'),
    convertedContentType: text('converted_content_type'),
    convertedContentId: text('converted_content_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_submission_status').on(table.status),
    index('idx_submission_type').on(table.type),
    index('idx_submission_submitter').on(table.submitterUserId),
  ]
);

export const profileContent = table('profile_content', {
  id: text('id').primaryKey(),
  locale: text('locale').notNull(),
  content: jsonb('content').notNull(),
  status: text('status').default('published').notNull(),
  allowAiCitation: boolean('allow_ai_citation').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const resourceTag = table(
  'resource_tag',
  {
    resourceId: text('resource_id')
      .notNull()
      .references(() => resource.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.resourceId, table.tagId] })]
);

export const resourceStage = table(
  'resource_stage',
  {
    resourceId: text('resource_id')
      .notNull()
      .references(() => resource.id, { onDelete: 'cascade' }),
    stageId: text('stage_id')
      .notNull()
      .references(() => stage.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.resourceId, table.stageId] }),
    index('idx_resource_stage_stage').on(table.stageId),
  ]
);

export const collectionTag = table(
  'collection_tag',
  {
    collectionId: text('collection_id')
      .notNull()
      .references(() => collection.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.collectionId, table.tagId] })]
);

export const postTag = table(
  'post_tag',
  {
    postId: text('post_id')
      .notNull()
      .references(() => post.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.postId, table.tagId] })]
);

export const collectionResource = table(
  'collection_resource',
  {
    collectionId: text('collection_id')
      .notNull()
      .references(() => collection.id, { onDelete: 'cascade' }),
    resourceId: text('resource_id')
      .notNull()
      .references(() => resource.id, { onDelete: 'cascade' }),
    stepTitleZh: text('step_title_zh'),
    stepTitleEn: text('step_title_en'),
    stepDescriptionZh: text('step_description_zh'),
    stepDescriptionEn: text('step_description_en'),
    relationType: text('relation_type').default('required').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => [primaryKey({ columns: [table.collectionId, table.resourceId] })]
);

export const collectionPost = table(
  'collection_post',
  {
    collectionId: text('collection_id')
      .notNull()
      .references(() => collection.id, { onDelete: 'cascade' }),
    postId: text('post_id')
      .notNull()
      .references(() => post.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => [primaryKey({ columns: [table.collectionId, table.postId] })]
);

export const postResource = table(
  'post_resource',
  {
    postId: text('post_id')
      .notNull()
      .references(() => post.id, { onDelete: 'cascade' }),
    resourceId: text('resource_id')
      .notNull()
      .references(() => resource.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.postId, table.resourceId] })]
);

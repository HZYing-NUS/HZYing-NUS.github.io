DO $$
DECLARE
  missing_resources text;
  missing_stages text;
  missing_categories text;
BEGIN
  SELECT string_agg(required.slug, ', ' ORDER BY required.slug)
  INTO missing_resources
  FROM (VALUES ($webtools$reddit$webtools$), ($webtools$product-hunt$webtools$), ($webtools$theres-an-ai-for-that$webtools$), ($webtools$toolify$webtools$), ($webtools$similarweb$webtools$), ($webtools$trustmrr$webtools$), ($webtools$design-lab$webtools$), ($webtools$one-page-love$webtools$), ($webtools$stitch$webtools$), ($webtools$bolt$webtools$), ($webtools$lovable$webtools$)) AS required(slug)
  LEFT JOIN resource ON resource.slug = required.slug AND resource.status = 'published'
  WHERE resource.id IS NULL;

  SELECT string_agg(required.slug, ', ' ORDER BY required.slug)
  INTO missing_stages
  FROM (VALUES ($webtools$discover-demand$webtools$), ($webtools$validate-the-idea$webtools$), ($webtools$design-and-prototype$webtools$)) AS required(slug)
  LEFT JOIN stage ON stage.slug = required.slug
  WHERE stage.id IS NULL;

  SELECT string_agg(required.slug, ', ' ORDER BY required.slug)
  INTO missing_categories
  FROM (VALUES ($webtools$community-and-building-in-public$webtools$), ($webtools$market-and-competitor-intelligence$webtools$), ($webtools$ai-builders-and-prototypes$webtools$)) AS required(slug)
  LEFT JOIN category ON category.slug = required.slug
  WHERE category.id IS NULL;

  IF missing_resources IS NOT NULL OR missing_stages IS NOT NULL OR missing_categories IS NOT NULL THEN
    RAISE EXCEPTION 'Action guides P0 prerequisites missing. Resources: %, stages: %, categories: %',
      COALESCE(missing_resources, 'none'),
      COALESCE(missing_stages, 'none'),
      COALESCE(missing_categories, 'none');
  END IF;
END $$;
--> statement-breakpoint
INSERT INTO tag (id, slug, name_zh, name_en, created_at, updated_at)
VALUES ($webtools$platform:tag:problem-discovery$webtools$, $webtools$problem-discovery$webtools$, $webtools$问题发现$webtools$, $webtools$Problem discovery$webtools$, now(), now())
ON CONFLICT (slug) DO UPDATE SET
  name_zh = EXCLUDED.name_zh,
  name_en = EXCLUDED.name_en,
  updated_at = now();
--> statement-breakpoint
INSERT INTO tag (id, slug, name_zh, name_en, created_at, updated_at)
VALUES ($webtools$platform:tag:user-research$webtools$, $webtools$user-research$webtools$, $webtools$用户研究$webtools$, $webtools$User research$webtools$, now(), now())
ON CONFLICT (slug) DO UPDATE SET
  name_zh = EXCLUDED.name_zh,
  name_en = EXCLUDED.name_en,
  updated_at = now();
--> statement-breakpoint
INSERT INTO tag (id, slug, name_zh, name_en, created_at, updated_at)
VALUES ($webtools$platform:tag:competitor-scan$webtools$, $webtools$competitor-scan$webtools$, $webtools$竞品扫描$webtools$, $webtools$Competitor scan$webtools$, now(), now())
ON CONFLICT (slug) DO UPDATE SET
  name_zh = EXCLUDED.name_zh,
  name_en = EXCLUDED.name_en,
  updated_at = now();
--> statement-breakpoint
INSERT INTO tag (id, slug, name_zh, name_en, created_at, updated_at)
VALUES ($webtools$platform:tag:demand-validation$webtools$, $webtools$demand-validation$webtools$, $webtools$需求验证$webtools$, $webtools$Demand validation$webtools$, now(), now())
ON CONFLICT (slug) DO UPDATE SET
  name_zh = EXCLUDED.name_zh,
  name_en = EXCLUDED.name_en,
  updated_at = now();
--> statement-breakpoint
INSERT INTO tag (id, slug, name_zh, name_en, created_at, updated_at)
VALUES ($webtools$platform:tag:riskiest-assumption$webtools$, $webtools$riskiest-assumption$webtools$, $webtools$最危险假设$webtools$, $webtools$Riskiest assumption$webtools$, now(), now())
ON CONFLICT (slug) DO UPDATE SET
  name_zh = EXCLUDED.name_zh,
  name_en = EXCLUDED.name_en,
  updated_at = now();
--> statement-breakpoint
INSERT INTO tag (id, slug, name_zh, name_en, created_at, updated_at)
VALUES ($webtools$platform:tag:decision-evidence$webtools$, $webtools$decision-evidence$webtools$, $webtools$决策证据$webtools$, $webtools$Decision evidence$webtools$, now(), now())
ON CONFLICT (slug) DO UPDATE SET
  name_zh = EXCLUDED.name_zh,
  name_en = EXCLUDED.name_en,
  updated_at = now();
--> statement-breakpoint
INSERT INTO tag (id, slug, name_zh, name_en, created_at, updated_at)
VALUES ($webtools$platform:tag:rapid-prototype$webtools$, $webtools$rapid-prototype$webtools$, $webtools$快速原型$webtools$, $webtools$Rapid prototype$webtools$, now(), now())
ON CONFLICT (slug) DO UPDATE SET
  name_zh = EXCLUDED.name_zh,
  name_en = EXCLUDED.name_en,
  updated_at = now();
--> statement-breakpoint
INSERT INTO tag (id, slug, name_zh, name_en, created_at, updated_at)
VALUES ($webtools$platform:tag:user-testing$webtools$, $webtools$user-testing$webtools$, $webtools$用户测试$webtools$, $webtools$User testing$webtools$, now(), now())
ON CONFLICT (slug) DO UPDATE SET
  name_zh = EXCLUDED.name_zh,
  name_en = EXCLUDED.name_en,
  updated_at = now();
--> statement-breakpoint
INSERT INTO tag (id, slug, name_zh, name_en, created_at, updated_at)
VALUES ($webtools$platform:tag:mvp-reduction$webtools$, $webtools$mvp-reduction$webtools$, $webtools$MVP 降级$webtools$, $webtools$MVP reduction$webtools$, now(), now())
ON CONFLICT (slug) DO UPDATE SET
  name_zh = EXCLUDED.name_zh,
  name_en = EXCLUDED.name_en,
  updated_at = now();
--> statement-breakpoint
UPDATE resource SET
  website_url = 'https://trustmrr.co',
  resource_type = 'startup-revenue-database',
  summary_zh = '展示经过平台验证的创业项目收入，用于观察不同产品类型的公开收入信号。',
  summary_en = 'A database of platform-verified startup revenue for observing public revenue signals across product categories.',
  reason_zh = '比产品榜单更接近商业结果，但只能证明被收录项目的收入，不能代表整个市场。',
  reason_en = 'Closer to business outcomes than a product directory, but it only verifies listed startups and does not represent the whole market.',
  use_case_zh = '按产品类型查看已验证收入案例，记录商业模式、收入区间和可进一步核查的同类产品。',
  use_case_en = 'Browse verified revenue examples by product type and record business models, revenue ranges, and comparable products for further research.',
  source_note = $webtools${"usageStatus":"used","verifiedAt":"2026-07-24","caution":{"zh":"已验证收入不等于业务健康，也不能证明你的想法会成功；成本、留存和渠道仍需单独核查。","en":"Verified revenue does not prove business health or guarantee your idea will work; costs, retention, and acquisition still require separate checks."},"notFor":null}$webtools$,
  updated_at = now()
WHERE slug = 'trustmrr';
--> statement-breakpoint
INSERT INTO collection (
  id, slug, title_zh, title_en, summary_zh, summary_en, content_zh, content_en,
  stage_id, category_id, featured, status, allow_ai_citation, sort_order, created_at, updated_at
)
VALUES (
  $webtools$platform:collection:find-a-product-problem$webtools$,
  $webtools$find-a-product-problem$webtools$,
  $webtools$找到一个值得验证的产品问题$webtools$,
  $webtools$Find a product problem worth validating$webtools$,
  $webtools$从真实讨论和现有产品中提取重复问题，先形成证据，再决定做什么。$webtools$,
  $webtools$Extract recurring problems from real discussions and existing products before deciding what to build.$webtools$,
  $webtools$这条路线不负责帮你想一个听起来新奇的点子。它只做一件事：把零散观察整理成可以继续验证的问题。

不要把单条抱怨、榜单热度或工具数量当成需求证明。先保留用户原话和使用场景，再寻找重复模式。$webtools$,
  $webtools$This guide does not invent a clever idea for you. It turns scattered observations into a problem that is specific enough to validate.

Do not treat one complaint, launch-day attention, or the number of existing tools as proof of demand. Keep the user language and context, then look for repeated patterns.$webtools$,
  (SELECT id FROM stage WHERE slug = $webtools$discover-demand$webtools$),
  (SELECT id FROM category WHERE slug = $webtools$community-and-building-in-public$webtools$),
  true,
  'published',
  true,
  1,
  now(),
  now()
)
ON CONFLICT (slug) DO UPDATE SET
  title_zh = EXCLUDED.title_zh,
  title_en = EXCLUDED.title_en,
  summary_zh = EXCLUDED.summary_zh,
  summary_en = EXCLUDED.summary_en,
  content_zh = EXCLUDED.content_zh,
  content_en = EXCLUDED.content_en,
  stage_id = EXCLUDED.stage_id,
  category_id = EXCLUDED.category_id,
  featured = EXCLUDED.featured,
  status = EXCLUDED.status,
  allow_ai_citation = EXCLUDED.allow_ai_citation,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
--> statement-breakpoint
DELETE FROM collection_tag
WHERE collection_id = (SELECT id FROM collection WHERE slug = $webtools$find-a-product-problem$webtools$);
--> statement-breakpoint
INSERT INTO collection_tag (collection_id, tag_id)
SELECT collection.id, tag.id
FROM collection, tag
WHERE collection.slug = $webtools$find-a-product-problem$webtools$ AND tag.slug = $webtools$problem-discovery$webtools$;
--> statement-breakpoint
INSERT INTO collection_tag (collection_id, tag_id)
SELECT collection.id, tag.id
FROM collection, tag
WHERE collection.slug = $webtools$find-a-product-problem$webtools$ AND tag.slug = $webtools$user-research$webtools$;
--> statement-breakpoint
INSERT INTO collection_tag (collection_id, tag_id)
SELECT collection.id, tag.id
FROM collection, tag
WHERE collection.slug = $webtools$find-a-product-problem$webtools$ AND tag.slug = $webtools$competitor-scan$webtools$;
--> statement-breakpoint
DELETE FROM collection_resource
WHERE collection_id = (SELECT id FROM collection WHERE slug = $webtools$find-a-product-problem$webtools$);
--> statement-breakpoint
INSERT INTO collection_resource (
  collection_id, resource_id, step_title_zh, step_title_en,
  step_description_zh, step_description_en, relation_type, sort_order
)
SELECT
  collection.id,
  resource.id,
  $webtools$收集用户原话$webtools$,
  $webtools$Collect the words users use$webtools$,
  $webtools$动作：在目标人群所在的 Subreddit 搜索核心词，查看帖子、评论、发布时间和讨论背景。
产出：至少 10 条原话，分别记录用户、场景、问题和当前做法。
通过标准：素材来自至少 3 个独立讨论，不只来自一篇高赞帖子。
避免：把情绪强烈的一次抱怨直接当成普遍需求。$webtools$,
  $webtools$Action: Search relevant subreddits, then inspect posts, comments, dates, and discussion context.
Output: At least 10 quotes recording the user, context, problem, and current workaround.
Pass: The evidence comes from at least three independent discussions, not one popular post.
Avoid: Treating one emotional complaint as a common need.$webtools$,
  $webtools$required$webtools$,
  0
FROM collection, resource
WHERE collection.slug = $webtools$find-a-product-problem$webtools$ AND resource.slug = $webtools$reddit$webtools$;
--> statement-breakpoint
INSERT INTO collection_resource (
  collection_id, resource_id, step_title_zh, step_title_en,
  step_description_zh, step_description_en, relation_type, sort_order
)
SELECT
  collection.id,
  resource.id,
  $webtools$找到用户正在尝试的产品$webtools$,
  $webtools$Find products users are already trying$webtools$,
  $webtools$动作：按任务词和分类寻找相近产品，阅读定位、功能、定价和评论。
产出：5 个现有产品及其主要承诺、目标用户和评论中的问题。
通过标准：能够区分产品解决的问题与它宣传的功能。
避免：把发布当天票数当成长期需求或收入。$webtools$,
  $webtools$Action: Search by task and category, then review positioning, features, pricing, and comments.
Output: Five existing products with their promise, audience, and problems mentioned in comments.
Pass: You can separate the user problem from the features being marketed.
Avoid: Treating launch-day upvotes as durable demand or revenue.$webtools$,
  $webtools$required$webtools$,
  1
FROM collection, resource
WHERE collection.slug = $webtools$find-a-product-problem$webtools$ AND resource.slug = $webtools$product-hunt$webtools$;
--> statement-breakpoint
INSERT INTO collection_resource (
  collection_id, resource_id, step_title_zh, step_title_en,
  step_description_zh, step_description_en, relation_type, sort_order
)
SELECT
  collection.id,
  resource.id,
  $webtools$用任务语言检查 AI 替代方案$webtools$,
  $webtools$Check AI alternatives using task language$webtools$,
  $webtools$动作：用用户原话中的任务描述搜索，而不是只搜你设想的产品名称。
产出：相近工具的卖点、覆盖范围和未解决环节。
通过标准：能判断市场是完全空白、已有零散工具，还是已经非常拥挤。
避免：把没有搜到结果理解为没有需求。$webtools$,
  $webtools$Action: Search with the task language found in user quotes, not only your imagined product name.
Output: Comparable tools, their claims, scope, and unresolved parts.
Pass: You can describe whether the space is empty, fragmented, or crowded.
Avoid: Interpreting no search result as proof that no demand exists.$webtools$,
  $webtools$required$webtools$,
  2
FROM collection, resource
WHERE collection.slug = $webtools$find-a-product-problem$webtools$ AND resource.slug = $webtools$theres-an-ai-for-that$webtools$;
--> statement-breakpoint
INSERT INTO collection_resource (
  collection_id, resource_id, step_title_zh, step_title_en,
  step_description_zh, step_description_en, relation_type, sort_order
)
SELECT
  collection.id,
  resource.id,
  $webtools$交叉检查工具密度和定位$webtools$,
  $webtools$Cross-check tool density and positioning$webtools$,
  $webtools$动作：用 Toolify 的分类、榜单和工具页面补充检查主要竞品。
产出：补充遗漏产品，并标记常见定位和差异点。
通过标准：新增信息能够改变或加强前一步的判断。
避免：为了凑数量重复记录同质工具。$webtools$,
  $webtools$Action: Use Toolify categories, rankings, and tool pages to cross-check major competitors.
Output: Add missed products and mark common positioning and differences.
Pass: The new evidence changes or strengthens the previous conclusion.
Avoid: Listing many near-identical tools only to increase the count.$webtools$,
  $webtools$alternative$webtools$,
  3
FROM collection, resource
WHERE collection.slug = $webtools$find-a-product-problem$webtools$ AND resource.slug = $webtools$toolify$webtools$;
--> statement-breakpoint
INSERT INTO collection (
  id, slug, title_zh, title_en, summary_zh, summary_en, content_zh, content_en,
  stage_id, category_id, featured, status, allow_ai_citation, sort_order, created_at, updated_at
)
VALUES (
  $webtools$platform:collection:validate-product-idea$webtools$,
  $webtools$validate-product-idea$webtools$,
  $webtools$验证一个产品想法有没有人需要$webtools$,
  $webtools$Validate whether people need the product idea$webtools$,
  $webtools$用问题证据、现有选择、流量和收入信号做一轮案头验证，决定继续、调整还是停止。$webtools$,
  $webtools$Use problem evidence, alternatives, traffic, and revenue signals to decide whether to continue, adjust, or stop.$webtools$,
  $webtools$案头研究不能证明用户一定会付费，但能快速暴露最危险的假设。你的目标不是收集支持自己的材料，而是主动寻找能否定这个方向的证据。

最终只做五类结论之一：继续验证、缩小人群、改变问题、降低 MVP，或暂时停止。$webtools$,
  $webtools$Desk research cannot prove that users will pay, but it can expose the most dangerous assumption quickly. Do not collect only supportive evidence. Look for evidence that could disprove the direction.

End with one of five decisions: continue validating, narrow the audience, change the problem, reduce the MVP, or stop for now.$webtools$,
  (SELECT id FROM stage WHERE slug = $webtools$validate-the-idea$webtools$),
  (SELECT id FROM category WHERE slug = $webtools$market-and-competitor-intelligence$webtools$),
  true,
  'published',
  true,
  2,
  now(),
  now()
)
ON CONFLICT (slug) DO UPDATE SET
  title_zh = EXCLUDED.title_zh,
  title_en = EXCLUDED.title_en,
  summary_zh = EXCLUDED.summary_zh,
  summary_en = EXCLUDED.summary_en,
  content_zh = EXCLUDED.content_zh,
  content_en = EXCLUDED.content_en,
  stage_id = EXCLUDED.stage_id,
  category_id = EXCLUDED.category_id,
  featured = EXCLUDED.featured,
  status = EXCLUDED.status,
  allow_ai_citation = EXCLUDED.allow_ai_citation,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
--> statement-breakpoint
DELETE FROM collection_tag
WHERE collection_id = (SELECT id FROM collection WHERE slug = $webtools$validate-product-idea$webtools$);
--> statement-breakpoint
INSERT INTO collection_tag (collection_id, tag_id)
SELECT collection.id, tag.id
FROM collection, tag
WHERE collection.slug = $webtools$validate-product-idea$webtools$ AND tag.slug = $webtools$demand-validation$webtools$;
--> statement-breakpoint
INSERT INTO collection_tag (collection_id, tag_id)
SELECT collection.id, tag.id
FROM collection, tag
WHERE collection.slug = $webtools$validate-product-idea$webtools$ AND tag.slug = $webtools$riskiest-assumption$webtools$;
--> statement-breakpoint
INSERT INTO collection_tag (collection_id, tag_id)
SELECT collection.id, tag.id
FROM collection, tag
WHERE collection.slug = $webtools$validate-product-idea$webtools$ AND tag.slug = $webtools$decision-evidence$webtools$;
--> statement-breakpoint
DELETE FROM collection_resource
WHERE collection_id = (SELECT id FROM collection WHERE slug = $webtools$validate-product-idea$webtools$);
--> statement-breakpoint
INSERT INTO collection_resource (
  collection_id, resource_id, step_title_zh, step_title_en,
  step_description_zh, step_description_en, relation_type, sort_order
)
SELECT
  collection.id,
  resource.id,
  $webtools$重新检查问题是否持续出现$webtools$,
  $webtools$Recheck whether the problem keeps appearing$webtools$,
  $webtools$动作：围绕明确问题重新搜索讨论，主动寻找相反观点和满意的现有做法。
产出：支持证据、反对证据和仍未知的问题。
通过标准：能够说明什么证据会让你放弃或修改想法。
避免：只保存支持自己判断的帖子。$webtools$,
  $webtools$Action: Search the defined problem again and deliberately look for opposing views and satisfactory workarounds.
Output: Supporting evidence, opposing evidence, and remaining unknowns.
Pass: You can state what evidence would make you change or abandon the idea.
Avoid: Saving only posts that support your current belief.$webtools$,
  $webtools$required$webtools$,
  0
FROM collection, resource
WHERE collection.slug = $webtools$validate-product-idea$webtools$ AND resource.slug = $webtools$reddit$webtools$;
--> statement-breakpoint
INSERT INTO collection_resource (
  collection_id, resource_id, step_title_zh, step_title_en,
  step_description_zh, step_description_en, relation_type, sort_order
)
SELECT
  collection.id,
  resource.id,
  $webtools$拆解用户已经可以选择什么$webtools$,
  $webtools$Map what users can already choose$webtools$,
  $webtools$动作：选择 3～5 个最相近产品，比较目标用户、核心承诺、价格和评论。
产出：竞品对比表，以及用户为什么可能切换或不切换。
通过标准：差异来自用户结果或使用方式，不只是功能名称不同。
避免：只看首页文案，不看评论和实际产品范围。$webtools$,
  $webtools$Action: Compare three to five close products by audience, promise, price, and comments.
Output: A competitor table and reasons users may or may not switch.
Pass: The difference is about user outcomes or workflow, not renamed features.
Avoid: Reading only homepage copy without checking comments and product scope.$webtools$,
  $webtools$required$webtools$,
  1
FROM collection, resource
WHERE collection.slug = $webtools$validate-product-idea$webtools$ AND resource.slug = $webtools$product-hunt$webtools$;
--> statement-breakpoint
INSERT INTO collection_resource (
  collection_id, resource_id, step_title_zh, step_title_en,
  step_description_zh, step_description_en, relation_type, sort_order
)
SELECT
  collection.id,
  resource.id,
  $webtools$检查成熟竞品是否有持续访问$webtools$,
  $webtools$Check whether established competitors attract sustained visits$webtools$,
  $webtools$动作：比较可获得数据的成熟竞品，查看流量规模、主要国家和来源变化。
产出：3 个竞品的流量估算和来源线索。
通过标准：结论明确写着“估算”，并与社区、搜索或收入证据一起使用。
避免：用小网站的单月估算值做确定性判断。$webtools$,
  $webtools$Action: Compare established competitors with available data, including estimated visits, countries, and acquisition sources.
Output: Traffic estimates and source clues for three competitors.
Pass: The conclusion labels figures as estimates and combines them with community, search, or revenue evidence.
Avoid: Making a definite decision from one month of estimates for a small site.$webtools$,
  $webtools$required$webtools$,
  2
FROM collection, resource
WHERE collection.slug = $webtools$validate-product-idea$webtools$ AND resource.slug = $webtools$similarweb$webtools$;
--> statement-breakpoint
INSERT INTO collection_resource (
  collection_id, resource_id, step_title_zh, step_title_en,
  step_description_zh, step_description_en, relation_type, sort_order
)
SELECT
  collection.id,
  resource.id,
  $webtools$寻找公开收入信号$webtools$,
  $webtools$Look for public revenue signals$webtools$,
  $webtools$动作：按产品类型查看已验证收入项目，寻找相近商业模式。
产出：可比收入案例、收费方式和需要继续核查的差异。
通过标准：只把被收录项目当作案例，不把数据库缺席当成没有收入。
避免：把收入等同于利润、留存或长期健康。$webtools$,
  $webtools$Action: Browse platform-verified revenue examples by product type and look for comparable business models.
Output: Comparable revenue cases, pricing models, and differences that still need checking.
Pass: Listed startups are treated as examples, while absence from the database is not treated as no revenue.
Avoid: Equating revenue with profit, retention, or long-term health.$webtools$,
  $webtools$alternative$webtools$,
  3
FROM collection, resource
WHERE collection.slug = $webtools$validate-product-idea$webtools$ AND resource.slug = $webtools$trustmrr$webtools$;
--> statement-breakpoint
INSERT INTO collection (
  id, slug, title_zh, title_en, summary_zh, summary_en, content_zh, content_en,
  stage_id, category_id, featured, status, allow_ai_citation, sort_order, created_at, updated_at
)
VALUES (
  $webtools$platform:collection:build-testable-prototype$webtools$,
  $webtools$build-testable-prototype$webtools$,
  $webtools$把想法做成可测试的产品原型$webtools$,
  $webtools$Turn the idea into a testable product prototype$webtools$,
  $webtools$只实现最关键的用户路径，让目标用户可以理解、点击并暴露问题。$webtools$,
  $webtools$Build only the critical user path so target users can understand it, use it, and reveal problems.$webtools$,
  $webtools$原型的任务不是看起来像完整产品，而是验证用户能否理解价值并完成核心动作。先固定一个核心任务，再决定页面和工具。

如果静态页面已经能验证理解度，就不要提前加入登录、数据库或支付。只有测试必须保存数据时，才选择全栈方案。$webtools$,
  $webtools$A prototype does not need to look like a finished product. It needs to test whether users understand the value and can complete the core action. Fix one core task before choosing screens and tools.

If a static flow can test comprehension, do not add authentication, databases, or payments early. Choose a full-stack path only when the test must save data.$webtools$,
  (SELECT id FROM stage WHERE slug = $webtools$design-and-prototype$webtools$),
  (SELECT id FROM category WHERE slug = $webtools$ai-builders-and-prototypes$webtools$),
  true,
  'published',
  true,
  3,
  now(),
  now()
)
ON CONFLICT (slug) DO UPDATE SET
  title_zh = EXCLUDED.title_zh,
  title_en = EXCLUDED.title_en,
  summary_zh = EXCLUDED.summary_zh,
  summary_en = EXCLUDED.summary_en,
  content_zh = EXCLUDED.content_zh,
  content_en = EXCLUDED.content_en,
  stage_id = EXCLUDED.stage_id,
  category_id = EXCLUDED.category_id,
  featured = EXCLUDED.featured,
  status = EXCLUDED.status,
  allow_ai_citation = EXCLUDED.allow_ai_citation,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
--> statement-breakpoint
DELETE FROM collection_tag
WHERE collection_id = (SELECT id FROM collection WHERE slug = $webtools$build-testable-prototype$webtools$);
--> statement-breakpoint
INSERT INTO collection_tag (collection_id, tag_id)
SELECT collection.id, tag.id
FROM collection, tag
WHERE collection.slug = $webtools$build-testable-prototype$webtools$ AND tag.slug = $webtools$rapid-prototype$webtools$;
--> statement-breakpoint
INSERT INTO collection_tag (collection_id, tag_id)
SELECT collection.id, tag.id
FROM collection, tag
WHERE collection.slug = $webtools$build-testable-prototype$webtools$ AND tag.slug = $webtools$user-testing$webtools$;
--> statement-breakpoint
INSERT INTO collection_tag (collection_id, tag_id)
SELECT collection.id, tag.id
FROM collection, tag
WHERE collection.slug = $webtools$build-testable-prototype$webtools$ AND tag.slug = $webtools$mvp-reduction$webtools$;
--> statement-breakpoint
DELETE FROM collection_resource
WHERE collection_id = (SELECT id FROM collection WHERE slug = $webtools$build-testable-prototype$webtools$);
--> statement-breakpoint
INSERT INTO collection_resource (
  collection_id, resource_id, step_title_zh, step_title_en,
  step_description_zh, step_description_en, relation_type, sort_order
)
SELECT
  collection.id,
  resource.id,
  $webtools$先选一种与定位一致的设计语言$webtools$,
  $webtools$Choose one design language that fits the positioning$webtools$,
  $webtools$动作：比较少量风格，选择一种能支持产品语气和目标用户的方向。
产出：一个设计方向和可交给 AI 的风格提示。
通过标准：能说明选择如何服务内容层级，而不只是“看起来好看”。
避免：混合多种风格，或让视觉掩盖核心任务。$webtools$,
  $webtools$Action: Compare a small set of styles and choose one that fits the product voice and audience.
Output: One design direction and a style prompt for an AI builder.
Pass: You can explain how the choice supports content hierarchy, not only that it looks good.
Avoid: Mixing multiple styles or letting visuals hide the core task.$webtools$,
  $webtools$required$webtools$,
  0
FROM collection, resource
WHERE collection.slug = $webtools$build-testable-prototype$webtools$ AND resource.slug = $webtools$design-lab$webtools$;
--> statement-breakpoint
INSERT INTO collection_resource (
  collection_id, resource_id, step_title_zh, step_title_en,
  step_description_zh, step_description_en, relation_type, sort_order
)
SELECT
  collection.id,
  resource.id,
  $webtools$拆出页面顺序和转化入口$webtools$,
  $webtools$Study page order and conversion points$webtools$,
  $webtools$动作：选择 3 个同类单页案例，只记录首屏信息、内容顺序、证明方式和 CTA。
产出：适合你的页面结构草图。
通过标准：每个区块都服务理解、信任或行动中的一个目标。
避免：直接复制配色、图片或品牌表达。$webtools$,
  $webtools$Action: Select three comparable one-page examples and record only hero information, content order, proof, and calls to action.
Output: A page-structure sketch for your product.
Pass: Every section serves comprehension, trust, or action.
Avoid: Copying colors, imagery, or brand expression directly.$webtools$,
  $webtools$required$webtools$,
  1
FROM collection, resource
WHERE collection.slug = $webtools$build-testable-prototype$webtools$ AND resource.slug = $webtools$one-page-love$webtools$;
--> statement-breakpoint
INSERT INTO collection_resource (
  collection_id, resource_id, step_title_zh, step_title_en,
  step_description_zh, step_description_en, relation_type, sort_order
)
SELECT
  collection.id,
  resource.id,
  $webtools$比较核心页面的界面方案$webtools$,
  $webtools$Compare interface options for the core screens$webtools$,
  $webtools$动作：输入目标用户、核心任务、必要页面和约束，生成并比较多个方案。
产出：选定的核心页面和关键状态。
通过标准：页面顺序支持用户完成任务，并包含空状态、错误状态或结果状态中的必要部分。
避免：只根据单张界面美观度选择。$webtools$,
  $webtools$Action: Describe the user, core task, required screens, and constraints, then compare multiple generated directions.
Output: Selected core screens and required states.
Pass: The sequence supports task completion and includes the necessary empty, error, or result state.
Avoid: Choosing based only on one attractive screen.$webtools$,
  $webtools$required$webtools$,
  2
FROM collection, resource
WHERE collection.slug = $webtools$build-testable-prototype$webtools$ AND resource.slug = $webtools$stitch$webtools$;
--> statement-breakpoint
INSERT INTO collection_resource (
  collection_id, resource_id, step_title_zh, step_title_en,
  step_description_zh, step_description_en, relation_type, sort_order
)
SELECT
  collection.id,
  resource.id,
  $webtools$实现最小可点击流程$webtools$,
  $webtools$Build the smallest clickable flow$webtools$,
  $webtools$动作：只实现核心输入、处理和结果，把非必要功能写进“不做清单”。
产出：可访问链接和一条可走通的核心路径。
通过标准：目标用户可以独立完成任务，测试过程中不需要开发者代操作。
避免：在验证前加入完整账号、支付、后台和复杂权限。$webtools$,
  $webtools$Action: Build only the essential input, processing, and result, while keeping nonessential features on the not-building list.
Output: An accessible link and one complete core path.
Pass: A target user can complete the task without the builder operating the product.
Avoid: Adding full accounts, payments, admin, or complex permissions before validation.$webtools$,
  $webtools$required$webtools$,
  3
FROM collection, resource
WHERE collection.slug = $webtools$build-testable-prototype$webtools$ AND resource.slug = $webtools$bolt$webtools$;
--> statement-breakpoint
INSERT INTO collection_resource (
  collection_id, resource_id, step_title_zh, step_title_en,
  step_description_zh, step_description_en, relation_type, sort_order
)
SELECT
  collection.id,
  resource.id,
  $webtools$需要保存数据时改用全栈原型$webtools$,
  $webtools$Use a full-stack prototype only when data must persist$webtools$,
  $webtools$动作：只有测试必须注册、提交表单或查看已保存数据时，才建立对应流程。
产出：包含必要数据交互的最小版本。
通过标准：每个新增数据功能都直接影响当前测试问题。
避免：因为工具支持全栈，就把模板能力全部加入产品。$webtools$,
  $webtools$Action: Add signup, forms, or saved data only when the test genuinely requires them.
Output: A minimum version with the required data interaction.
Pass: Every added data feature directly supports the current test question.
Avoid: Adding every full-stack capability simply because the tool supports it.$webtools$,
  $webtools$alternative$webtools$,
  4
FROM collection, resource
WHERE collection.slug = $webtools$build-testable-prototype$webtools$ AND resource.slug = $webtools$lovable$webtools$;
--> statement-breakpoint
UPDATE collection
SET status = 'archived', updated_at = now()
WHERE slug IN ($webtools$daily-information-radar$webtools$, $webtools$buy-analyze-rebuild$webtools$, $webtools$idea-to-testable-mvp$webtools$, $webtools$ai-saas-foundation$webtools$, $webtools$post-launch-data-loop$webtools$, $webtools$ai-capability-ecosystem$webtools$);
--> statement-breakpoint
DO $$
DECLARE
  published_count integer;
  relation_count integer;
BEGIN
  SELECT count(*) INTO published_count
  FROM collection
  WHERE slug IN ($webtools$find-a-product-problem$webtools$, $webtools$validate-product-idea$webtools$, $webtools$build-testable-prototype$webtools$)
    AND status = 'published';

  SELECT count(*) INTO relation_count
  FROM collection_resource
  INNER JOIN collection ON collection.id = collection_resource.collection_id
  WHERE collection.slug IN ($webtools$find-a-product-problem$webtools$, $webtools$validate-product-idea$webtools$, $webtools$build-testable-prototype$webtools$);

  IF published_count <> 3 OR relation_count <> 13 THEN
    RAISE EXCEPTION 'Action guides P0 verification failed. Published: %, relations: %', published_count, relation_count;
  END IF;
END $$;

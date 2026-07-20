# WebTools 社区 Blog V1 系统设计

## 1. 范围与边界

本设计落实 `webtools-community-blog-v1-spec.md` Phase 1～7 的共同基础。社区文章和公开资料使用独立 `community_*` 领域表，不复用 ShipAny `post` 或旧站 `profile_content`。用户文章、资料、About、评论、私密名单和私密内容夹不进入 WebTools AI 公共知识库；数据库使用不可变 `allow_ai_citation = false` 检查约束。

## 2. 数据模型与迁移

迁移 `0009_plain_shinko_yamashiro.sql` 基于 `0008_left_joseph.sql`，只创建新表、索引、外键和检查约束，不回填或修改生产数据，也不执行迁移。

| 领域     | 表                                                                                                              | 关键约束与索引                                                                                       |
| -------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 资料     | `community_user_profile`、`community_profile_revision`                                                          | 用户和用户名唯一；公开版／待审版指针；用户名查询与可见性索引；AI 引用强制关闭                        |
| 用户名   | `community_username_history`、`community_reserved_username`                                                     | 历史用户名永久唯一；旧用户名保存新用户名用于 301；保留词主键                                         |
| 隐私     | `community_privacy_setting`                                                                                     | 每用户一行；关注、粉丝、点赞、收藏分别控制                                                           |
| 文章     | `community_blog_article`、`community_article_revision`、`community_article_slug_history`                        | slug 永久唯一；文章版本号唯一；公开／工作版本指针；语言检查；状态、作者、回收站索引；AI 引用强制关闭 |
| 标签     | `community_blog_tag`、`community_article_tag`                                                                   | tag slug 唯一；复合主键避免重复关联                                                                  |
| 评论     | `community_comment`                                                                                             | 两层父子关系；禁止自引用；文章状态、作者队列、用户索引；软删除保留原文与回复                         |
| 社交     | `community_follow`、`community_article_like`、`community_comment_like`                                          | 复合主键去重；禁止关注自己；点赞按目标分表保证外键完整性                                             |
| 收藏     | 四个 `community_*_bookmark` 表                                                                                  | 用户和目标复合主键；资源、专题、文章和公开内容夹分别外键约束                                         |
| 内容夹   | `community_user_list` 与三类 item 表                                                                            | 所有者内 slug 唯一；公开／私密检查；三类目标复合主键                                                 |
| 审核治理 | `community_moderation_review`、`community_moderation_appeal`、`community_content_report`、`community_audit_log` | 对象版本＋指纹＋规则版本唯一；一次申诉；举报去重；对象和操作者审计索引                               |
| 异步任务 | `community_job`                                                                                                 | `type + business_key` 唯一；状态、执行时间和锁时间领取索引                                           |
| 邮件     | `community_email_preference`、`community_email_delivery`                                                        | 每用户偏好一行；发送幂等键唯一；待发送队列索引                                                       |

迁移上线前先在影子数据库执行并验证，再备份生产库、在维护窗口运行。新增表使回滚可通过反向迁移删除社区表；产生真实社区数据后禁止直接回滚，应先停止写入并导出数据。旧 About 不在本迁移绑定账号，待正式用户账号确认后使用独立幂等迁移脚本。

## 3. 状态机

### 3.1 文章与翻译

`draft → translating → translation_failed | pending_review → changes_requested | rejected | published → revision_draft → revision_pending_review → published → deleted_by_author → archived`。

原文和版本先在事务中保存，再创建唯一翻译任务。已发布修改只创建工作版本，公开版本指针保持不变；管理员通过后在一个事务中校验策略 Hook 并原子切换公开版本。删除设置 `deleted_at` 和 30 天 `restore_deadline_at`，恢复清除两者并复用删除前公开版本。

### 3.2 资料

`draft → moderation_pending → published | pending_admin | blocked`。公开资料与待审 revision 分离；低风险原子切换公开指针，中风险保留旧公开版，阻断不覆盖公开内容。用户名修改使用事务锁定资料，检查 90 天窗口、保留词、当前和历史唯一性，写历史后更新当前用户名。

### 3.3 评论

一级评论：`moderation_pending → blocked | pending_admin | pending_author → published | featured | rejected | reported → hidden → moderation_pending → published`。`pending_author` 满 30 天转 `closed_unhandled`。

回复：`moderation_pending → published | pending_admin | blocked`。只允许 `parent_id` 指向同文章一级评论，服务层禁止回复的回复。删除无回复时公开查询排除；有回复时渲染占位，原文只对本人和管理员返回。

### 3.4 审核与删除

审核：`pending → running → completed | failed → pending`，超过最大重试转 `pending_admin`。申诉：`pending → confirmed_violation | false_positive_recheck`。所有删除均先软删除；治理、版本、举报和审核记录不级联物理删除。

## 4. API 与权限矩阵

| 能力                                   | 游客 | 注册用户     | 作者／所有者 | 管理员                |
| -------------------------------------- | ---- | ------------ | ------------ | --------------------- |
| 读取公开文章、资料、评论、内容夹       | 允许 | 允许         | 允许         | 允许                  |
| 草稿、资料修改、评论、点赞、收藏、关注 | 禁止 | 仅自己的操作 | 允许         | 治理需要可读          |
| 读取草稿、退回原因、私密内容           | 禁止 | 仅本人       | 仅本人       | 允许并记录            |
| 一级评论放行／精选／拒绝／隐藏         | 禁止 | 禁止         | 仅自己文章   | 最终治理              |
| 发布文章、设置精华、人工复核           | 禁止 | 禁止         | 禁止         | RBAC 且策略 Hook 通过 |

API 分为公开 `GET /api/community/public/*`、登录用户 `/api/community/me/*`、文章作者 `/api/community/articles/:id/comments/*` 和管理员 `/api/admin/community/*`。所有写 API 从服务端 session 取得用户 ID，忽略客户端传入的作者、审核、精选、版本指针和公开状态。管理员复用现有 `canAccessAdmin`／RBAC；所有者检查由社区权限服务集中执行。

## 5. 事务、幂等与并发

- 保存并提交：锁定文章；校验作者和状态；保存原文 revision；按 `translate:{revisionId}:{fingerprint}` 插入任务；更新文章状态；写审计，全部同一事务。
- 翻译完成：领取任务使用 `FOR UPDATE SKIP LOCKED`；只在任务仍运行且 revision 指纹一致时写译文；创建审核任务和更新状态同一事务。
- 发布：锁定 article 和 revision；校验双语、翻译、内容指纹及最新审核；调用服务端策略 Hook；切换公开指针、状态、发布时间、审计和邮件事件同一事务。
- 互动：关注、点赞、收藏依靠复合主键，重复请求视为成功；评论提交使用客户端幂等键对应唯一 job／业务键。
- 邮件：先创建 `community_email_delivery`，唯一 `idempotency_key` 去重；每次重试向 Resend 传递同一稳定幂等键，Provider 成功后记录 message ID。数据库与外部邮件 API 无法形成单一事务，因此该链路是 at-least-once 投递，依赖 Resend 幂等能力避免 send-then-commit 崩溃窗口内重复发送，不声称数据库 exactly-once。
- Cron：固定扫描窗口和游标分批；每作者每天批次键唯一；重复 Cron 只读取已存在成功记录，不重复发送。

## 6. 持久化异步任务

`community_job` 是 V1 队列存储，任务类型为 `translate_article`、`moderate_content`、`send_email`、`close_unhandled_comments`。HTTP 请求只提交业务事务，不等待模型或邮件。Worker 原子领取到期任务并写 `locked_by/locked_at`，指数退避重试；锁超时可被其他 worker 恢复。业务键避免重复任务，结果写入对应版本、审核或邮件表。Provider 故障只转失败／人工复核，绝不默认公开。

正式执行器可以使用 Vercel 调度调用短时批处理 endpoint；若文章吞吐或执行时间超过 Vercel 限制，再替换外部队列，领域任务表和幂等协议不变。

## 7. 审核 Hook 与审计

发布链固定为：输入清理 → 确定性规则 → AI 结构化分类 → 发布前策略 Hook → 审计 Hook。AI 输出使用 Zod 固定 JSON Schema 校验，自然语言和解析失败均作为 `moderation_failed`。

策略 Hook 仅服务端调用，并强制检查：审核完成；当前指纹等于审核指纹；无强制禁止类别；审核服务未失败。管理员只能发起重新审核或误判复核，不能无日志覆盖。每一步记录原文、规范化文本、指纹、证据、模型／Provider／实际模型、规则和提示词版本、重试、最终策略与人工动作。

## 8. 发布与验证顺序

严格按 Phase 1～7 推进。每阶段验证中文、英文、游客、注册用户、作者和管理员；Phase 7 运行 lint、build、format:check，并验证失败恢复、重复提交／Cron、SEO、邮件与私密隔离。上线前仍必须人工确认审核阈值、欧美营销合规、成本预算和 About 正式账号。

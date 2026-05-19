# Frontend rules

- Use TypeScript
- Use Tailwind CSS
- Use shadcn/ui when suitable
- Keep components reusable
- Match Figma spacing, typography, color, and layout closely
- Do not hardcode unnecessary magic numbers
- Run build after changes
- No Allow inline-style
- Keep page files slim: page-specific `type` / `interface` definitions must live in dedicated type files under `src/types` or nearby domain type modules, not inline in page components
- Every code change must include concise comments for non-obvious logic, data normalization, side effects, and business-rule branching
- 所有新增注释必须使用中文，禁止新增英文注释
- 不要把样式都写在app.css里面
- 函数用

# 业务上下文

当前项目是“设计交付系统”，本质上是一套通用配置的流程流转系统。

- 每个项目都可以独立配置自己的流程
- 用户在项目内创建任务时，任务会关联到某个流程
- 系统需要保证任务按照所绑定流程持续流转
- 不同项目的流程节点、人员分配方式、文件规则都可能不同
- 代码要写注释
## 流程节点规则

- 流程配置是动态的，常见核心字段包括 `can_assign` 和 `file_rules`
- `can_assign` 表示当前流程节点是否允许当前处理人手动指定下一节点的操作人员
- `file_rules` 表示当前流程节点的文件上传规范，包括上传内容、数量、命名等限制
- 修改任务详情、流程配置、节点提交流转相关代码时，优先以流程配置驱动业务行为，不要写死固定流程

## 提交流转规则

- 当当前流程节点配置了 `can_assign` 时，当前节点处理人可以在提交流转时为下一节点指定人员
- 当当前流程节点没有配置 `can_assign` 时，系统默认把该节点流转给“创建任务时的任务所有者”
- 上述默认指派是在当前节点完成操作并提交时自动进行的，不需要用户手动干预
- 修改“下一节点人员”“提交流转”“候选人查询”相关逻辑时，必须优先考虑这条自动/手动指派规则

## 权限与可见性规则

- 用户只能操作属于自己流程节点的事情
- 当前任务流转到哪个节点，就只有该节点对应的用户可以执行提交流转操作
- 非当前节点用户通常只能查看任务状态、节点信息和必要的只读回填内容，不能推进流程
- 修改任务详情展示、只读逻辑、按钮显隐、节点权限判断时，必须以“当前节点对应用户才能操作”为前提

## 修改代码时的默认前提

- 先确认当前改动是否影响流程流转
- 先确认当前改动是否影响节点人员分配
- 先确认当前改动是否影响文件上传规则 `file_rules`
- 先确认当前改动是否破坏“未配置 `can_assign` 时默认流转给任务所有者”的规则
- 如果需求和以上业务前提冲突，先按业务规则解释清楚，再实施代码修改

# UI Design Rules

你生成的后台管理系统必须遵守以下规则：


## 视觉风格
- 整体风格：现代、简洁、企业级 SaaS 后台
- 页面背景使用 #f6f8fb 或浅灰背景
- 卡片使用白色背景、圆角 16px、轻阴影
- 主色使用蓝色或靛蓝色
- 字体层级清晰：标题 20-24px，正文 14px
- 表格要有筛选、搜索、分页、状态标签
- 表单要分组、留白充足、错误提示清晰

## 页面结构
- 左侧 Sidebar
- 顶部 Header
- 面包屑 Breadcrumb
- 主内容区使用 Card 布局
- Dashboard 首页必须包含：
  - 数据概览卡片
  - 趋势折线图
  - 最近订单表格
  - 快捷操作入口
# 函数风格
- 所有独立工具函数、纯函数**必须**使用箭头函数定义：`const fn = (param) => { ... }`
- 禁止使用 `function fn(param) {}` 声明

## 禁止
- 不要生成纯 HTML 默认样式
- 不要使用杂乱颜色
- 不要把所有内容堆在一页
- 不要使用过小间距

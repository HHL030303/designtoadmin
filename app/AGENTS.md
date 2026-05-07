# Frontend rules

- Use TypeScript
- Use Tailwind CSS
- Use shadcn/ui when suitable
- Keep components reusable
- Match Figma spacing, typography, color, and layout closely
- Do not hardcode unnecessary magic numbers
- Run build after changes
- No Allow inline-style

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

## 禁止
- 不要生成纯 HTML 默认样式
- 不要使用杂乱颜色
- 不要把所有内容堆在一页
- 不要使用过小间距
# HANDOFF

## 项目概况
- 仓库路径：`/Users/wanhao/byy/designtoadmin`
- 前端：React + TypeScript
- 后端：Python FastAPI
- 数据库：PostgreSQL

## 开发规范
- 使用 4 空格缩进
- 每行最多 100 字符
- 所有函数必须有类型注解
- Git 提交使用 Conventional Commits，提交信息描述“为什么”

## Review 关注点
- 不要记录 PII
- 校验认证中间件
- 注意 SQL 注入风险

## 本次沟通确定的核心规则

### 任务工单页
- 任务工单页已经从“一个通用大详情”改成“按角色展示不同详情”
- 计划员角色展开详情时，只保留：
  - 基础信息
  - 流程信息
- 其他角色展开详情时，需要显示当前角色自己的阶段任务
- 当前角色阶段任务的渲染规则：
  - 如果该流程节点配置了 `file_rules`，详情里就展示这些规则对应的上传项
  - 如果没有配置 `file_rules`，但有 `can_assign = true`，则该阶段任务表示“指定下一节点人员”
- 这块必须保持可扩展，不能写死教研、风格稿、内页几个固定场景

### 工作流配置
- 新建工作流节点时：
  - 节点中文名不需要默认值
  - 节点角色不需要默认值
  - 节点名称不需要默认值
- 保存工作流时：
  - 不再提交 `ownerRoleCode`
  - 仍保留 `operatorRoleCode`

### 创建任务
- 创建任务时，请求顶层需要增加 `owner_id`
- `stage_assignments` 各阶段内部不要再传 `owner_id`
- 注意：这里的“任务所有者”是一个额外新增字段
- 原先“第二阶段指定人员”的逻辑和字段需要保留，不能删除

### boolean 字段约定
- 在项目列表 -> 字段配置弹窗页面：
  - 所有 `boolean` 类型字段改为 `radio` 单选
  - 不再使用 `select`
  - `boolean` 类型字段不依赖 `option_config`
- 在任务工单页 -> 新建任务表单：
  - 所有 `boolean` 类型字段也改为 `radio` 单选
  - 不再使用 `select`

## UI 偏好
- boolean 的 radio 不要做成大块卡片
- 布局尽量紧凑、小巧
- 保留一定的精致感，但不要过度装饰
- 表单控件整体倾向于轻量、清爽

## 当前已经完成的改动

### 任务工单页详情
- 已将任务详情改成角色化结构
- 计划员只看基础信息和流程信息
- 其他角色增加“当前阶段任务”区域
- 当前阶段任务已支持基于 `file_rules` / `can_assign` 动态渲染

### 工作流节点编辑
- 已取消新建节点时的默认节点名
- 已取消节点角色自动默认值
- 保存工作流时已移除 `owner_role_code`

### 创建任务请求结构
- 顶层已支持 `owner_id`
- `stage_assignments` 内已移除 `owner_id`
- “任务所有者”字段已独立于“第二阶段指定人员”

### boolean 控件改造
- 字段配置弹窗预览页：已改为 radio
- 任务工单新建任务表单：已改为 radio
- boolean 字段导入、校验、保存链路已调整为不依赖 `option_config`

## 当前涉及到的主要文件
- `app/src/components/course/TaskDetailPanel.tsx`
- `app/src/pages/CoursesPage.tsx`
- `app/src/pages/ProjectManagementPage.tsx`
- `app/src/components/project/DynamicTaskFormPreview.tsx`
- `app/src/services/adminService.ts`
- `app/src/services/taskService.ts`
- `app/src/utils/formConfigImport.ts`
- `app/src/App.css`

## 当前未提交的本地改动
- `app/src/App.css`
- `app/src/components/project/DynamicTaskFormPreview.tsx`
- `app/src/pages/CoursesPage.tsx`
- `app/src/services/adminService.ts`
- `app/src/services/taskService.ts`
- `app/src/utils/formConfigImport.ts`

## 切换账号后的建议启动语
建议新账号进入这个项目后，第一条消息直接发：

```text
先读取 /Users/wanhao/byy/designtoadmin/HANDOFF.md 和项目规范，再继续当前任务。严格遵守其中约定，尤其是任务工单页角色化详情、工作流保存字段、创建任务 owner_id、以及 boolean 一律使用 radio 的规则。
```

## 继续开发时的注意事项
- 如果后端接口定义和当前前端约定冲突，先核对真实接口，再决定是否调整前端
- 如果后续需要继续优化任务工单页，优先保持“按流程配置驱动”而不是回退成写死页面
- 如果需要继续微调 radio 样式，优先做尺寸、间距、边框、选中态的轻量调整，不要再做大面积卡片背景

## 交接目标
- 新账号应当只靠：
  - 当前代码
  - 本文档
  - 项目规范
- 就能快速恢复上下文并继续开发，无需依赖旧账号聊天历史

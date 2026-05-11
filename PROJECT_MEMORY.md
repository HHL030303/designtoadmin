# PROJECT_MEMORY

> 用途：
> 这份文档用于沉淀“历史对话中已经确定的实现细节、约定和不可回退的决策”。
> 切换账号后，新账号应优先阅读本文件和 `HANDOFF.md`，再继续开发。

## 使用方式
- 按“主题”维护，不按聊天时间顺序维护
- 每次一个需求确定后，补充：
  - 背景
  - 最终约定
  - 涉及文件
  - 注意事项
- 对已经废弃的方案，不直接删除，移动到“历史方案 / 已废弃”区域

## 目录建议
- 1. 项目级长期约定
- 2. 任务工单页
- 3. 工作流配置
- 4. 创建任务请求结构
- 5. 字段配置弹窗
- 6. 表单控件与 UI 偏好
- 7. 历史方案 / 已废弃
- 8. 待补充的历史对话

---

## 1. 项目级长期约定

### 1.1 开发规范
- 前端：React + TypeScript
- 后端：Python FastAPI
- 数据库：PostgreSQL
- 使用 4 空格缩进
- 每行最多 100 字符
- 所有函数必须有类型注解

### 1.2 Git 约定
- 使用 Conventional Commits
- 提交信息描述“为什么”

### 1.3 Review 关注点
- 不要记录 PII
- 校验认证中间件
- 注意 SQL 注入风险

---

## 2. 任务工单页

### 2.1 任务详情的整体方向
#### 背景
- 原先任务工单展开详情过于臃肿，所有角色几乎共用一个通用大详情
- 旧静态页面里，不同角色看到的是不同的工作面板

#### 最终约定
- 任务工单页要按角色展示不同详情
- 不能再用“一个通用详情把所有信息堆满”的方式
- 详情必须支持后续流程扩展，不能写死教研、风格稿、内页几个节点

#### 涉及文件
- `app/src/components/course/TaskDetailPanel.tsx`
- `app/src/pages/CoursesPage.tsx`

#### 注意事项
- 新增流程节点时，优先走“流程配置驱动”
- 避免回退成静态写死的角色页面

### 2.2 计划员详情展示
#### 背景
- 计划员展开后看到的信息过多，不利于快速查看任务

#### 最终约定
- 计划员角色点击展开时，只保留：
  - 基础信息
  - 流程信息
- 不需要再展示一大堆泛化的详情区块

#### 涉及文件
- `app/src/components/course/TaskDetailPanel.tsx`

### 2.3 其他角色详情展示
#### 背景
- 所有角色共用任务工单页，但每个角色真正关心的阶段信息不一样

#### 最终约定
- 除计划员外，其他角色在基础信息之外，要展示“当前角色阶段任务”
- 当前角色阶段任务需要根据当前角色匹配到对应流程节点

#### 涉及文件
- `app/src/components/course/TaskDetailPanel.tsx`

### 2.4 基于 file_rules / can_assign 的动态渲染
#### 背景
- 每个角色阶段的任务，不是固定的
- 阶段任务来源于流程配置，而不是前端硬编码

#### 最终约定
- 如果某个流程节点配置了 `file_rules`：
  - 详情中就展示这些规则对应的上传项
- 如果某个流程节点没有 `file_rules`，但有 `can_assign = true`：
  - 这个阶段的核心任务就是“指定下一节点人员”
- 这块必须设计成可扩展结构，不能耦合具体角色名

#### 涉及文件
- `app/src/components/course/TaskDetailPanel.tsx`

#### 注意事项
- 后续如果流程节点增加新的动作类型，应继续扩展这一层，而不是加更多角色分支

---

## 3. 工作流配置

### 3.1 新建节点默认值
#### 背景
- 新建工作流节点时，界面曾自动填入节点中文名、节点角色、节点名称默认值
- 这会影响手工配置，容易造成误保存

#### 最终约定
- 新建工作流节点时：
  - 节点中文名不需要默认值
  - 节点角色不需要默认值
  - 节点名称不需要默认值

#### 涉及文件
- `app/src/pages/ProjectManagementPage.tsx`

### 3.2 工作流保存字段
#### 背景
- 保存工作流时，之前会带 `ownerRoleCode`

#### 最终约定
- 保存工作流时不再提交 `ownerRoleCode`
- 仍保留 `operatorRoleCode`

#### 涉及文件
- `app/src/pages/ProjectManagementPage.tsx`
- `app/src/services/adminService.ts`

#### 注意事项
- 如果后端未来重新引入 `ownerRoleCode`，需要先确认真实需求，再决定是否恢复

---

## 4. 创建任务请求结构

### 4.1 顶层 owner_id
#### 背景
- 创建任务时，需要在请求顶层增加任务所有者

#### 最终约定
- 创建任务 payload 顶层增加 `owner_id`
- 对应的表单字段名称为：`任务所有者`

#### 涉及文件
- `app/src/pages/CoursesPage.tsx`
- `app/src/services/taskService.ts`

### 4.2 stage_assignments 中移除 owner_id
#### 背景
- 之前 `stage_assignments` 各阶段内部也有 `owner_id`

#### 最终约定
- `stage_assignments` 各阶段内部不要再传 `owner_id`
- 只在顶层传 `owner_id`

#### 涉及文件
- `app/src/pages/CoursesPage.tsx`
- `app/src/services/taskService.ts`

### 4.3 任务所有者与第二阶段指定人员
#### 背景
- 曾经把“任务所有者”直接替换掉了原先的“第二阶段指定人员”字段
- 这个方向不对

#### 最终约定
- “任务所有者”是额外新增的独立字段
- 原来的“第二阶段指定人员”逻辑和字段必须保留
- 两者不能互相覆盖或替换

#### 涉及文件
- `app/src/pages/CoursesPage.tsx`

#### 注意事项
- 当前“任务所有者”和“第二阶段指定人员”共用同一批候选人数据源
- 如果后续业务要求不同数据源，需要单独拆开

---

## 5. 字段配置弹窗

### 5.1 boolean 类型控件
#### 背景
- 项目列表 -> 字段配置弹窗页面中，`boolean` 字段之前使用 `select`

#### 最终约定
- 所有 `boolean` 类型字段统一改成 `radio` 单选
- 不再使用 `select`

#### 涉及文件
- `app/src/components/project/DynamicTaskFormPreview.tsx`
- `app/src/App.css`

### 5.2 boolean 类型与 option_config
#### 背景
- 之前 `boolean` 类型也沿用了“选项字段”逻辑，要求 `option_config`

#### 最终约定
- `boolean` 类型字段不依赖 `option_config`
- Excel 导入时，`boolean` 不再要求有 `option_config`
- JSON 校验时，`boolean` 如果携带 `option_config`，应视为不符合约定
- 保存字段配置时，`boolean` 不再保存 `option_config`

#### 涉及文件
- `app/src/utils/formConfigImport.ts`
- `app/src/services/adminService.ts`

#### 注意事项
- `select` 类型仍然需要 `option_config`
- 不要把这条规则误扩展到 `select`

---

## 6. 表单控件与 UI 偏好

### 6.1 任务工单新建任务表单中的 boolean
#### 背景
- 任务工单页新建任务表单中的 `boolean` 字段之前也使用 `select`

#### 最终约定
- 新建任务表单中的 `boolean` 字段也统一改成 `radio`
- 不再使用 `select`

#### 涉及文件
- `app/src/pages/CoursesPage.tsx`
- `app/src/App.css`

### 6.2 radio 样式偏好
#### 背景
- 初版 radio 样式做成了较大的卡片块状效果，用户反馈“不好看、太大”

#### 最终约定
- radio 样式应更轻、更小、更紧凑
- 不要大块卡片式外观
- 可以保留适度精致感，但整体要偏轻量

#### 涉及文件
- `app/src/App.css`

#### UI 偏好总结
- 表单控件整体倾向紧凑
- boolean 选择更适合胶囊按钮或轻量单选
- 避免大面积背景块和过厚的选中态

---

## 7. 历史方案 / 已废弃

### 7.1 已废弃：把任务所有者直接替换成第二阶段指定人员
#### 问题
- 这会导致原有“第二阶段指定人员”逻辑丢失

#### 当前结论
- 已废弃
- 应改为：
  - 顶层新增独立“任务所有者”
  - 保留原第二阶段指定人员字段

---

## 8. 待补充的历史对话

> 这里留给另外六个历史对话继续补充。建议每个历史对话都按下面模板填。

### 模板
```md
## 主题名称

### 背景
- 当时为什么要改

### 最终约定
- 最后决定怎么做

### 涉及文件
- `文件路径`

### 注意事项
- 后续继续开发时不要踩的坑
```

### 待补充主题清单
- 对话 2：待补充
- 对话 3：待补充
- 对话 4：待补充
- 对话 5：待补充
- 对话 6：待补充
- 对话 7：待补充

---

## 新账号接手建议
- 先读：
  - `HANDOFF.md`
  - `PROJECT_MEMORY.md`
- 再读项目规范
- 再看当前未提交改动和相关文件

建议新账号进入项目后的第一句提示词：

```text
先读取 /Users/wanhao/byy/designtoadmin/HANDOFF.md 和 /Users/wanhao/byy/designtoadmin/PROJECT_MEMORY.md，再继续当前任务。严格遵守其中已经确认的业务规则、请求结构、UI 偏好和不可回退约定。
```

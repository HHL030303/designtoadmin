# 设计交付管理系统后台

基于 React + TypeScript + Vite 搭建的后台原型，围绕以下核心场景实现：

- 课件主单管理
- 教研 / 风格稿 / 内页 / 入库四阶段流转
- 设计统筹派单中心
- 设计师任务台
- 售后与迭代版本管理
- 文件规范、流程边界与自动触发规则展示

## 启动

```bash
npm install
npm run dev
```

## 打包

```bash
npm run build
```

## 当前实现说明

- 目前为前端原型，使用本地示例数据驱动页面
- 已支持在界面内推进状态、创建课件主单、发起售后与迭代
- 线下/企微审核未纳入系统，仅以“上传结果”和“确认入库”体现

## 目录结构

```text
src/
  components/   通用组件与业务组件
  constants/    导航与状态元信息
  domain/       流程规则、状态推进、版本号策略
  hooks/        页面数据装配与异步状态
  pages/        各一级页面
  services/     假数据与接口服务层
  types/        全局类型定义
```

## 可联调改造入口

- 假数据入口：[src/services/mockData.ts](/Users/wanhao/byy/designtoadmin/app/src/services/mockData.ts)
- 接口封装：[src/services/courseService.ts](/Users/wanhao/byy/designtoadmin/app/src/services/courseService.ts)
- 页面数据装配：[src/hooks/useCourseStore.ts](/Users/wanhao/byy/designtoadmin/app/src/hooks/useCourseStore.ts)
- 流程规则：[src/domain/courseWorkflow.ts](/Users/wanhao/byy/designtoadmin/app/src/domain/courseWorkflow.ts)

后续接真实后端时，优先替换 `courseService` 中的 `list/create/advance/createTicket` 四个方法，页面层基本不需要大改。

## 后续可继续扩展

- 接入真实后端接口与登录权限
- 将主单、阶段任务、子任务拆成独立 API 模型
- 增加表单校验、上传组件、日志筛选和统计图表
- 接入成品库接口与真实文件校验服务

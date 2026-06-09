export const menuPermission = [
    {
        "project_id": 1,
        "resource_code": "account",
        "resource_name": "账号管理",
        "id": 61
    },
    {
        "project_id": 1,
        "resource_code": "task",
        "resource_name": "任务",
        "id": 66
    },
    {
        "project_id": 1,
        "resource_code": "project",
        "resource_name": "项目管理",
        "id": 60
    },
    {
        "project_id": 1,
        "resource_code": "statistics",
        "resource_name": "统计",
        "id": 73
    },
]

export const btnPermission = [
    {
        "project_id": 1,
        "resource_code": "additional_work",
        "resource_name":  "子项",
        // 对应任务工单列表里面的需求变更 按钮，如果配置了create 或者 all，就在任务工单列表页面显示这个需求变更按钮，
        // 如果permission 配置了update,就在列表子项列的弹出层table列里面 显示 完成需求、取消需求、确认需求三个按钮
        "id": 70
    },
    {
        "project_id": 1,
        "resource_code": "aftersales",
        "resource_name": "售后",
        // 对应任务工单列表的售后按钮 ，如果配置了create 或者 all，就显示售后 这个按钮，如果如果permission配置了配置了update，就显示取消售后按钮
        "id": 68
    },
    {
        "project_id": 1,
        "resource_code": "complaint",
        "resource_name": "客诉",
        // 对应任务列表的客诉按钮，如果配置了create 或者 all，就在任务工单列表里面显示客诉按钮，如果permission配置了配置了update，就显示解决客诉、取消客诉按钮
        "id": 71
    },
  
    {
        "project_id": 1,
        "resource_code": "iteration",
        "resource_name": "迭代",
         // 对应任务列表的迭代按钮 ，如果配置了create 或者 all，对应任务列表的迭代按钮，如果配置了create 或者 all
        "id": 69
    },
    {
        "project_id": 1,
        "resource_code": "field",
        "resource_name": "字段管理",
        // 对应项目列表的字段配置按钮,点击字段配置 会弹出一个字段配置的drawer弹出层，如果接口返回的permissions 里面action_code
        //  是all，代表他对这个弹窗有增删改查的所有权限，否则弹窗里面就只显示对应action_code 对应的操作按钮
        "id": 64
    },
    {
        "project_id": 1,
        "resource_code": "member",
        "resource_name": "成员管理",
         // 对应项目列表的成员操作按钮,点击成员操作 会弹出一个项目成员的弹窗，如果接口返回的permissions 里面action_code
        //  是all，代表他对这个弹窗有增删改查的所有权限，否则弹窗里面就只显示对应action_code 对应的操作按钮
        "id": 62
    },
    {
        "project_id": 1,
        "resource_code": "role",
        "resource_name": "角色管理",
          // 对应项目列表的角色管理按钮,点击角色管理 会弹出角色管理弹窗，如果接口返回的permissions 里面action_code
        //  是all，代表他对这个弹窗有增删改查的所有权限，否则弹窗里面就只显示对应action_code 对应的操作按钮
        "id": 63
    },
    // {
    //     "project_id": 1,
    //     "resource_code": "stage",
    //     "resource_name": "阶段流转",
    //     "id": 67
    // },
  
    {
        "project_id": 1,
        "resource_code": "workflow_template",
        "resource_name": "工作流模板管理",
          // 对应项目列表的配置工作流程按钮，点击配置工作流程，弹出工作流配置弹窗，如果接口返回的permissions 里面action_code
        //  是all，代表他对这个弹窗有增删改查的所有权限，否则弹窗里面就只显示对应action_code 对应的操作按钮
        "id": 65
    },
    // {
    //     "project_id": 1,
    //     "resource_code": "file",
    //     "resource_name": "文件",
    //     "id": 72
    // },
]
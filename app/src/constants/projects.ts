import type { ProjectOption } from '../types'

export const projectOptions: ProjectOption[] = [
  {
    key: 'xinye-demo',
    id: 'xinye-demo',
    code: 'xinye_demo',
    name: '新业演示',
    description: '交付流程演示环境，覆盖课件主流程与设计协同场景。',
    permissions: [],
    roles: [],
    status: 'enabled',
  },
  {
    key: 'yiqi-courseware',
    id: 'yiqi-courseware',
    code: 'yiqi_courseware',
    name: '一起课件',
    description: '标准课件生产项目，侧重教研、风格稿、内页交付协作。',
    permissions: [],
    roles: [],
    status: 'enabled',
  },
  {
    key: 'medical-ppt',
    id: 'medical-ppt',
    code: 'medical_ppt',
    name: '医护PPT',
    description: '医护行业演示项目，适用于定制化交付与版权登记场景。',
    permissions: [],
    roles: [],
    status: 'enabled',
  },
]

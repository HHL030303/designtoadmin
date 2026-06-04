import { createRoot } from 'react-dom/client'
import { ConfigProvider, theme } from 'antd'
import { BrowserRouter } from 'react-router-dom'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import 'antd/dist/reset.css'
import '@xyflow/react/dist/style.css'
import './index.css'
import App from './App.tsx'
import { AppStateProvider } from './context/AppStateContext'

dayjs.locale('zh-cn')

const appLocale = {
  ...zhCN,
  Popconfirm: {
    cancelText: '取消',
    okText: '确认',
  },
}

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <ConfigProvider
      locale={appLocale}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#3b82f6',
          colorBgLayout: '#f8fafc',
          colorBorder: '#e5e7eb',
          colorText: '#111827',
          colorTextSecondary: '#6b7280',
          borderRadius: 8,
          controlOutline: '#3b82f6',
          controlOutlineWidth: 2,
          boxShadowSecondary: '0 1px 2px rgba(15, 23, 42, 0.06)',
          fontSize: 14,
        },
        components: {
          Layout: {
            bodyBg: '#f8fafc',
            siderBg: '#1e293b',
            headerBg: '#ffffff',
          },
          Card: {
            colorBorderSecondary: '#e5e7eb',
            bodyPadding: 24,
            headerHeight: 56,
          },
          Table: {
            headerBg: '#f9fafb',
            headerColor: '#374151',
            rowHoverBg: '#f8fafc',
            cellPaddingBlock: 12,
            cellPaddingInline: 16,
            headerSplitColor: '#e5e7eb',
            borderColor: '#e5e7eb',
          },
          Button: {
            defaultBorderColor: '#d1d5db',
            defaultColor: '#374151',
            primaryShadow: 'none',
          },
          Popconfirm: {
            colorBgElevated: '#ffffff',
          },
          Popover: {
            colorBgElevated: '#ffffff',
          },
          Input: {
            activeBorderColor: '#3b82f6',
            hoverBorderColor: '#94a3b8',
            colorBorder: '#d1d5db',
          },
          Select: {
            optionSelectedBg: '#eff6ff',
            colorBorder: '#d1d5db',
            activeBorderColor: '#3b82f6',
            hoverBorderColor: '#94a3b8',
          },
          DatePicker: {
            colorBorder: '#d1d5db',
            activeBorderColor: '#3b82f6',
            hoverBorderColor: '#94a3b8',
          },
        },
      }}
    >
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </ConfigProvider>
  </BrowserRouter>,
)

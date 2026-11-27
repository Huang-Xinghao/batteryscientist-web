import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntApp, ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { App } from './app/App';
import { RouteError } from './app/RouteError';
import { AuthGate } from './features/auth/AuthGate';
import 'antd/dist/reset.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import 'katex/dist/katex.min.css';
import './app/styles.css';
import './features/workbench/workbench.css';
import './app/monochrome.css';
import './app/theme.css';
import './app/effects.css';
import './app/shell.css';
import './features/workbench/workbench-fx.css';
import './features/workbench/workbench-layout.css';
const router = createBrowserRouter([{ path: '*', element: <App />, errorElement: <RouteError /> }]);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 3000, refetchOnWindowFocus: true },
    mutations: { retry: false },
  },
});
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm: antdTheme.darkAlgorithm,
          token: {
            colorPrimary: '#8f80ff',
            colorInfo: '#8f80ff',
            colorSuccess: '#3de0c4',
            colorWarning: '#ffb547',
            colorError: '#ff6b7a',
            colorLink: '#b9afff',
            colorText: '#eceef3',
            colorTextSecondary: '#97a0af',
            colorTextTertiary: '#7d8696',
            colorBgBase: '#0e1014',
            colorBgLayout: '#0e1014',
            colorBgContainer: '#161920',
            colorBgElevated: '#1c2029',
            colorBorder: '#3a4150',
            colorBorderSecondary: '#2a303b',
            borderRadius: 9,
            fontFamily:
              "'IBM Plex Sans', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', -apple-system, sans-serif",
          },
          components: {
            Button: { primaryColor: '#0e1014', fontWeight: 500 },
            Segmented: { itemSelectedBg: '#242935', trackBg: '#1c2029' },
            Tabs: { inkBarColor: '#8f80ff', itemSelectedColor: '#eceef3' },
            Modal: { contentBg: '#161920', headerBg: '#161920' },
            Drawer: { colorBgElevated: '#161920' },
          },
        }}
      >
        <AntApp>
          <AuthGate>
            <RouterProvider router={router} />
          </AuthGate>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);

// Fade out the boot screen from index.html once the first frame has painted.
requestAnimationFrame(() => {
  const boot = document.getElementById('boot');
  if (!boot) return;
  boot.classList.add('is-done');
  setTimeout(() => boot.remove(), 600);
});

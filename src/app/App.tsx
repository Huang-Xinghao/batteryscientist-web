import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Result, Spin } from 'antd';
import {
  ApartmentOutlined,
  BookOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { Projects } from '../features/projects/Projects';
import { Workbench } from '../features/workbench/Workbench';
import { Library } from '../features/library/Library';
import { Laboratory } from '../features/laboratory/Laboratory';
import { motion } from 'motion/react';
import { AmbientEffects } from '../components/fx/AmbientEffects';
import { useReducedMotion } from '../components/fx/motion';
import { BatteryMark } from '../components/BatteryMark';
import { ChargeTransitionProvider } from '../components/fx/ChargeTransition';
import { Landing } from '../features/landing/Landing';

const navItems = [
  {
    to: '/projects',
    label: '研究项目',
    short: '研究项目',
    icon: <ApartmentOutlined />,
    match: (path: string) => path.startsWith('/projects'),
  },
  {
    to: '/libraries/paradigms',
    label: '电池范式库',
    short: '范式库',
    icon: <BookOutlined />,
    match: (path: string) => path === '/libraries/paradigms',
  },
  {
    to: '/libraries/battery',
    label: '电池资源库',
    short: '资源库',
    icon: <DatabaseOutlined />,
    match: (path: string) => path === '/libraries/battery',
  },
  {
    to: '/laboratory',
    label: '物理实验室',
    short: '实验室',
    icon: <ExperimentOutlined />,
    match: (path: string) => path.startsWith('/laboratory'),
  },
];

export function App() {
  return (
    <ChargeTransitionProvider>
      <AppRoutes />
    </ChargeTransitionProvider>
  );
}

function AppRoutes() {
  const health = useQuery({ queryKey: ['health'], queryFn: api.health, refetchInterval: 30000 });
  const location = useLocation();
  const reduced = useReducedMotion();
  // Only animate when the page itself changes, not on query-string updates.
  const routeKey = location.pathname.startsWith('/projects/') ? 'project' : location.pathname;
  if (location.pathname === '/') return <Landing />;
  return (
    <div className="shell">
      <AmbientEffects />
      <aside className="sidebar rail" aria-label="主导航">
        <Link
          to="/"
          className="rail-brand"
          aria-label="BatteryScientist 首页"
          title="BatteryScientist"
        >
          <BatteryMark />
        </Link>
        <nav className="rail-nav">
          {navItems.map((item) => (
            <Link
              key={item.to}
              className={`nav-item rail-link ${item.match(location.pathname) ? 'selected' : ''}`}
              to={item.to}
              aria-label={item.label}
              title={item.label}
            >
              {item.icon}
              <span>{item.short}</span>
            </Link>
          ))}
        </nav>
        <Link
          className={`nav-item rail-link settings-link ${location.pathname === '/settings' ? 'selected' : ''}`}
          to="/settings"
          aria-label="工作台设置"
          title="工作台设置"
        >
          <SettingOutlined />
          <span>设置</span>
        </Link>
        <div
          className="sidebar-footer rail-status"
          title={health.isSuccess ? '已连接研究引擎' : '研究引擎未连接'}
        >
          <span className={`connection-dot ${health.isSuccess ? 'online fx-ping' : ''}`} />
          <span>{health.isSuccess ? '已连接' : '未连接'}</span>
        </div>
      </aside>
      <main
        className={`main-shell ${location.pathname.startsWith('/projects/') ? 'workbench-shell' : ''}`}
      >
        {health.isError && (
          <Alert
            className="connection-alert"
            type="error"
            showIcon
            message="无法连接后端服务"
            description="研究服务暂时不可用，请稍后重试。"
            action={<Button onClick={() => health.refetch()}>重试</Button>}
          />
        )}
        <motion.div
          key={routeKey}
          className="route-frame"
          initial={reduced ? false : { opacity: 0, y: 14, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.45, ease: [0.2, 0.9, 0.2, 1] }}
        >
          <Routes location={location}>
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<Workbench nodes={health.data?.nodes || []} />} />
            <Route path="/libraries/paradigms" element={<Library kind="paradigms" />} />
            <Route path="/libraries/battery" element={<Library kind="battery" />} />
            <Route path="/laboratory" element={<Laboratory />} />
            <Route
              path="/settings"
              element={
                <div className="page">
                  <div className="eyebrow">PREFERENCES</div>
                  <h1>工作台设置</h1>
                  <p className="page-description">运行环境与服务连接</p>
                  {health.isPending ? (
                    <Spin />
                  ) : health.data ? (
                    <div className="settings-card">
                      <h3>研究引擎</h3>
                      <dl>
                        <dt>运行解释器</dt>
                        <dd>
                          <code>{health.data.runtime}</code>
                        </dd>
                        <dt>项目根目录</dt>
                        <dd>
                          {health.data.project_roots.map((p) => (
                            <div key={p}>
                              <code>{p}</code>
                            </div>
                          ))}
                        </dd>
                        <dt>并发策略</dt>
                        <dd>
                          同时运行 {health.data.concurrency} 个项目；项目内实验按现有队列策略调度。
                        </dd>
                        <dt>接口文档</dt>
                        <dd>
                          <a href="/api/docs" target="_blank" rel="noopener noreferrer">
                            查看 OpenAPI 文档 ↗
                          </a>
                        </dd>
                      </dl>
                      <Alert
                        type="info"
                        showIcon
                        message="模型密钥保存在后端环境配置中。项目计算策略仍由 project-config.json 管理。"
                      />
                    </div>
                  ) : null}
                </div>
              }
            />
            <Route
              path="*"
              element={
                <Result
                  status="404"
                  title="页面不存在"
                  extra={<Link to="/projects">返回研究项目</Link>}
                />
              }
            />
          </Routes>
        </motion.div>
      </main>
    </div>
  );
}

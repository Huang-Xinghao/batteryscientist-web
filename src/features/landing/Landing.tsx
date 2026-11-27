import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ApartmentOutlined,
  ArrowRightOutlined,
  AuditOutlined,
  BookOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useEffect, useRef, type MouseEvent } from 'react';
import { active, api } from '../../api/client';
import { BatteryMark } from '../../components/BatteryMark';
import { CountUp } from '../../components/fx/CountUp';
import { ParticleField } from '../../components/fx/ParticleField';
import { useChargeNavigate } from '../../components/fx/chargeContext';
import { artifactStages } from '../workbench/artifactStages';
import { CycleLab } from './CycleLab';
import './landing.css';

const stageNotes: Record<string, string> = {
  literature: '检索论文，归纳研究 Gap',
  data_search: '定位可用的电池数据集',
  ideas: '提出候选研究方案',
  refine: '评审并收敛正式方案',
  experiment_plan: '拆解实验与评估指标',
  experiment_bridge: '编写代码并运行实验',
  paper_plan: '组织论文结构与论证',
  paper_figure: '生成论文图表',
  paper_write: '写成 LaTeX 稿件',
  paper_compile: '编译 PDF 交付',
  improvement: '模拟审稿后再修订',
};

const features = [
  {
    icon: <ApartmentOutlined />,
    title: '多 Agent 协同研究',
    body: '主控 Agent 拆解任务、分派给各阶段 Agent；每一步工具调用和模型思考都在对话里实时展开。',
    to: '/projects',
    cta: '查看研究项目',
  },
  {
    icon: <AuditOutlined />,
    title: '每个阶段由你把关',
    body: '“每阶段由我审阅”在检查点暂停，等你回答专家问题；也可切换为全自动，一路跑到论文交付。',
    to: '/projects',
    cta: '开始一个项目',
  },
  {
    icon: <BookOutlined />,
    title: '电池范式库与资源库',
    body: '沉淀领域研究范式、论文与数据资源，Agent 在检索和方案设计时直接引用。',
    to: '/libraries/paradigms',
    cta: '浏览范式库',
  },
  {
    icon: <ExperimentOutlined />,
    title: '连接物理实验室',
    body: '只读接入实验室设备与测试记录，让方案建立在真实的循环数据之上。',
    to: '/laboratory',
    cta: '查看实验室',
  },
];

const headline = ['从一个研究问题，', '到一篇可复现的电池论文'];
/** Each character with its position across both lines, for the staggered entrance. */
const headlineChars = headline.map((line, lineIndex) =>
  [...line].map((char, i) => ({
    char,
    index: headline.slice(0, lineIndex).reduce((sum, l) => sum + [...l].length, 0) + i,
  })),
);

/** Adds `is-shown` to `[data-reveal]` children the first time they scroll into view. */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const items = ref.current?.querySelectorAll('[data-reveal]') || [];
    if (typeof IntersectionObserver === 'undefined') {
      items.forEach((item) => item.classList.add('is-shown'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-shown');
          observer.unobserve(entry.target);
        }),
      { threshold: 0.2 },
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);
  return ref;
}

export function Landing() {
  const queryClient = useQueryClient();
  const charge = useChargeNavigate();
  const health = useQuery({ queryKey: ['health'], queryFn: api.health, refetchInterval: 30000 });
  const projects = useQuery({ queryKey: ['projects'], queryFn: api.projects });
  const running = projects.data?.filter((project) => active(project.status)).length || 0;
  const enter = (event: MouseEvent<HTMLElement>, to = '/projects') => {
    event.preventDefault();
    const box = event.currentTarget.getBoundingClientRect();
    charge({
      to,
      from: { x: box.left + box.width / 2, y: box.top + box.height / 2 },
      tasks: [
        {
          label: '研究引擎',
          run: () => queryClient.fetchQuery({ queryKey: ['health'], queryFn: api.health }),
        },
        {
          label: '研究项目',
          run: () => queryClient.fetchQuery({ queryKey: ['projects'], queryFn: api.projects }),
        },
        { label: '界面字体', run: () => document.fonts.ready },
      ],
    });
  };
  const root = useReveal();
  return (
    <div className="landing" ref={root}>
      <div className="landing-bg" aria-hidden="true">
        <div className="landing-aurora a" />
        <div className="landing-aurora b" />
        <div className="landing-floor" />
        <ParticleField density={0.7} className="landing-particles" />
      </div>

      <header className="landing-nav">
        <Link to="/" className="landing-brand" aria-label="BatteryScientist 首页">
          <BatteryMark size={30} />
          <span>BatteryScientist</span>
        </Link>
        <nav aria-label="首页导航">
          <a href="#pipeline">研究流程</a>
          <a href="#features">能力</a>
          <Link to="/libraries/paradigms">范式库</Link>
        </nav>
        <a href="/projects" className="landing-nav-cta" onClick={(e) => enter(e)}>
          进入工作台
        </a>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <div className="landing-eyebrow">
            <span className={`connection-dot ${health.isSuccess ? 'online fx-ping' : ''}`} />
            {health.isSuccess ? '研究引擎在线' : '研究引擎未连接'} · AUTONOMOUS BATTERY RESEARCH
          </div>
          <h1 aria-label={headline.join('')}>
            {headlineChars.map((chars, lineIndex) => (
              <span
                key={lineIndex}
                className={`landing-line ${lineIndex ? 'is-charged' : ''}`}
                aria-hidden="true"
              >
                {chars.map(({ char, index }) => (
                  <span
                    key={index}
                    className="landing-char"
                    style={{ '--i': index } as React.CSSProperties}
                  >
                    {char}
                  </span>
                ))}
              </span>
            ))}
          </h1>
          <p className="landing-lead">
            BatteryScientist 把文献调研、数据检索、方案精炼、实验执行和论文写作串成一条 11
            阶段的研究流水线。Agent 负责推进，你在关键节点把关。
          </p>
          <div className="landing-actions">
            <a href="/projects" className="landing-cta" data-burst onClick={(e) => enter(e)}>
              <span>进入工作台</span>
              <ArrowRightOutlined />
            </a>
            <a href="#pipeline" className="landing-ghost">
              了解研究流程
            </a>
          </div>
          <dl className="landing-stats">
            <div>
              <dt>研究项目</dt>
              <dd>
                <CountUp value={projects.data?.length || 0} />
              </dd>
            </div>
            <div>
              <dt>正在运行</dt>
              <dd>
                <CountUp value={running} />
              </dd>
            </div>
            <div>
              <dt>研究阶段</dt>
              <dd>
                <CountUp value={artifactStages.length} />
              </dd>
            </div>
          </dl>
        </div>
        <div className="landing-hero-visual">
          <CycleLab />
        </div>
      </section>

      <section id="pipeline" className="landing-section">
        <div className="landing-section-head">
          <span className="landing-kicker">PIPELINE</span>
          <h2>一条从问题到论文的充电回路</h2>
          <p>每个阶段都留下可查看的产物；可从任意阶段开始，也可停在任意阶段。</p>
        </div>
        <ol className="landing-pipeline" data-reveal>
          {artifactStages.map((stage, index) => (
            <li key={stage.id} style={{ '--i': index } as React.CSSProperties}>
              <span className="landing-stage-index">{String(index + 1).padStart(2, '0')}</span>
              <strong>{stage.label}</strong>
              <small>{stageNotes[stage.id]}</small>
            </li>
          ))}
          <li
            className="landing-stage-goal"
            style={{ '--i': artifactStages.length } as React.CSSProperties}
          >
            <span className="landing-stage-index">⚡</span>
            <strong>可复现的论文</strong>
            <small>代码、数据与 PDF 一起交付</small>
          </li>
        </ol>
      </section>

      <section id="features" className="landing-section">
        <div className="landing-section-head">
          <span className="landing-kicker">CAPABILITIES</span>
          <h2>为电池研究定制的工作台</h2>
        </div>
        <div className="landing-features" data-reveal>
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className="landing-feature spotlight tilt"
              style={{ '--i': index } as React.CSSProperties}
            >
              <span className="landing-feature-icon">{feature.icon}</span>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
              <a href={feature.to} onClick={(e) => enter(e, feature.to)}>
                {feature.cta} <ArrowRightOutlined />
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-final" data-reveal>
        <h2>
          给你的研究问题<span>充上电</span>
        </h2>
        <a href="/projects" className="landing-cta" data-burst onClick={(e) => enter(e)}>
          <span>开始研究</span>
          <ArrowRightOutlined />
        </a>
      </section>

      <footer className="landing-footer">
        <BatteryMark size={22} />
        BatteryScientist · 电池科研智能工作台
      </footer>
    </div>
  );
}

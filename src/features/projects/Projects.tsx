import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Empty, Form, Input, Modal, Segmented, Skeleton, Tooltip } from 'antd';
import {
  ArrowRightOutlined,
  AppstoreOutlined,
  RadarChartOutlined,
  ScanOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FolderAddOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  ThunderboltFilled,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { active, api } from '../../api/client';
import { Status } from '../../components/Status';
import { formatDate } from '../../lib/date';
import { CountUp } from '../../components/fx/CountUp';
import { ParticleField } from '../../components/fx/ParticleField';
import { burstFrom } from '../../components/fx/burst';
import './projects.css';

const STAGES = [
  'literature',
  'data_search',
  'ideas',
  'refine',
  'experiment_plan',
  'experiment_bridge',
  'paper_plan',
  'paper_figure',
  'paper_write',
  'paper_compile',
  'improvement',
];

/** A short project name from the first line of a research question. */
function nameFromGoal(goal: string) {
  const line = goal
    .trim()
    .split(/\n/)[0]
    .replace(/[。．.！!？?]+$/, '');
  return line.length > 24 ? `${line.slice(0, 24)}…` : line;
}
export function Projects() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const projects = useQuery({
    queryKey: ['projects'],
    queryFn: api.projects,
    refetchInterval: 7000,
  });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('全部项目');
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [form] = Form.useForm<{ name: string; path?: string }>();
  const [goal, setGoal] = useState('');
  const [mode, setMode] = useState<'expert' | 'auto'>('expert');
  const startButton = useRef<HTMLButtonElement>(null);
  const health = useQuery({ queryKey: ['health'], queryFn: api.health, staleTime: 60000 });
  const labels = Object.fromEntries((health.data?.nodes || []).map((n) => [n.id, n.label]));
  const start = useMutation({
    mutationFn: async (question: string) => {
      const project = await api.create({ name: nameFromGoal(question) });
      try {
        await api.message(project.id, { prompt: question, mode });
      } catch (error) {
        message.error(`项目已创建，但研究问题没有提交：${(error as Error).message}`);
      }
      return project;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setGoal('');
      navigate(`/projects/${project.id}`);
    },
    onError: (error: Error) => message.error(error.message),
  });
  function startResearch() {
    const question = goal.trim();
    if (!question) {
      message.info('先写下你想研究的问题');
      return;
    }
    burstFrom(startButton.current, { count: 90, power: 1.1 });
    start.mutate(question);
  }
  const create = useMutation({
    mutationFn: api.create,
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setOpen(false);
      form.resetFields();
      navigate(`/projects/${p.id}`);
    },
    onError: (error: Error) => message.error(error.message),
  });
  const all = useMemo(() => projects.data || [], [projects.data]);
  const filtered = useMemo(
    () =>
      all.filter(
        (p) =>
          `${p.name} ${p.state.project_goal || ''}`.toLowerCase().includes(search.toLowerCase()) &&
          (filter === '全部项目' ||
            (filter === '运行中'
              ? active(p.status)
              : filter === '待审阅'
                ? p.status === 'awaiting_user'
                : p.status === 'completed')),
      ),
    [all, filter, search],
  );
  const statIcons = [
    <AppstoreOutlined />,
    <RadarChartOutlined />,
    <ScanOutlined />,
    <CheckCircleOutlined />,
  ];
  const showCreate = (isImport: boolean) => {
    setImporting(isImport);
    form.resetFields();
    setOpen(true);
  };
  return (
    <div className="page projects-page">
      <section className="research-hero" aria-labelledby="research-hero-title">
        <ParticleField />
        <div className="research-hero-body">
          <h1 id="research-hero-title" className="gradient-text">
            想研究什么？
          </h1>
          <p>
            写下研究问题，主控 Agent 会先确认范围，再从文献研究开始推进。问题不清楚时它会先追问你。
          </p>
          <Input.TextArea
            aria-label="研究问题"
            className="research-hero-input"
            placeholder="例如：用早期循环数据预测磷酸铁锂电池的剩余寿命，并验证跨电芯泛化"
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            autoSize={{ minRows: 2, maxRows: 6 }}
            maxLength={20000}
            disabled={start.isPending}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                startResearch();
              }
            }}
          />
          <div className="research-hero-actions">
            <Segmented
              aria-label="协作方式"
              value={mode}
              onChange={(value) => setMode(value as 'expert' | 'auto')}
              options={[
                { value: 'expert', label: '每阶段由我审阅' },
                { value: 'auto', label: '全自动' },
              ]}
            />
            <span className="research-hero-hint">
              {mode === 'expert'
                ? '每个阶段完成后停下来，等你确认再继续'
                : '主控自己验收并推进，只在需要你决定时提问'}
            </span>
            <Button icon={<FolderOpenOutlined />} onClick={() => showCreate(true)}>
              导入项目
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => showCreate(false)}>
              新建研究项目
            </Button>
            <Button
              ref={startButton}
              type="primary"
              size="large"
              icon={<ThunderboltFilled />}
              loading={start.isPending}
              onClick={startResearch}
            >
              开始研究
            </Button>
          </div>
        </div>
      </section>
      <div className="overview-strip">
        {[
          ['全部项目', all.length, '持续积累研究成果'],
          ['正在运行', all.filter((p) => active(p.status)).length, '研究引擎执行中'],
          [
            '等待审阅',
            all.filter((p) => p.status === 'awaiting_user').length,
            '你的判断，让研究更进一步',
          ],
          ['已完成', all.filter((p) => p.status === 'completed').length, '阶段任务已完成'],
        ].map(([label, value, hint], i) => (
          <div className="overview-item" key={label}>
            <div>
              <span className={`stat-icon stat-${i}`} aria-hidden="true">
                {statIcons[i]}
              </span>
              {label}
            </div>
            <strong>
              <CountUp value={Number(value)} />
              <small>{hint}</small>
            </strong>
          </div>
        ))}
      </div>
      <div className="section-toolbar">
        <Segmented
          options={['全部项目', '运行中', '待审阅', '已完成']}
          value={filter}
          onChange={(value) => setFilter(value)}
        />
        <div className="search-actions">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索项目或研究目标"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Tooltip title="刷新项目">
            <Button
              aria-label="刷新项目"
              icon={<ReloadOutlined spin={projects.isFetching} />}
              onClick={() => projects.refetch()}
            />
          </Tooltip>
        </div>
      </div>
      {projects.isError && (
        <Alert
          type="error"
          showIcon
          message="项目加载失败"
          description={(projects.error as Error).message}
          action={<Button onClick={() => projects.refetch()}>重试</Button>}
        />
      )}
      {projects.isPending ? (
        <div className="project-grid">
          {[1, 2, 3].map((i) => (
            <div className="project-card" key={i}>
              <Skeleton active paragraph={{ rows: 4 }} />
            </div>
          ))}
        </div>
      ) : !filtered.length ? (
        <div className="empty-projects">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              search || filter !== '全部项目' ? '没有匹配的项目' : '从你的第一个研究问题开始'
            }
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => showCreate(false)}>
            创建研究项目
          </Button>
        </div>
      ) : (
        <div className="project-grid">
          {filtered.map((p, index) => {
            const history = new Set(p.state.history?.map((h) => h.node));
            const done = STAGES.filter((n) => history.has(n)).length;
            const current = p.state.current_node || '';
            return (
              <Link
                to={`/projects/${p.id}`}
                className="project-card spotlight tilt"
                key={p.id}
                style={{ animationDelay: `${index * 0.06}s` }}
              >
                <div className="project-card-top">
                  <span className={`project-icon tone-${index % 3}`}>
                    <FolderOpenOutlined />
                  </span>
                  <Status value={p.status} />
                </div>
                <h3>{p.name}</h3>
                <p className="project-summary">
                  {p.state.project_goal || '研究空间已准备就绪，进入项目开始新的探索。'}
                </p>
                <div className="project-phase">
                  <span>
                    {current ? `当前阶段：${labels[current] || current}` : '等待配置研究目标'}
                  </span>
                  <span>{done}/11</span>
                </div>
                <div className="mini-track" aria-hidden="true">
                  {STAGES.map((n) => (
                    <span
                      key={n}
                      className={
                        history.has(n)
                          ? 'done'
                          : n === current
                            ? p.status === 'awaiting_user'
                              ? 'review'
                              : active(p.status)
                                ? 'running'
                                : ''
                            : ''
                      }
                    />
                  ))}
                </div>
                <div className="project-card-bottom">
                  <span>
                    <ClockCircleOutlined />
                    {formatDate(p.runs[0]?.created_at || p.created_at)}
                  </span>
                  <span className="enter-project">
                    进入项目 <ArrowRightOutlined />
                  </span>
                </div>
              </Link>
            );
          })}
          <button className="new-project-card spotlight" onClick={() => showCreate(false)}>
            <span>
              <FolderAddOutlined />
            </span>
            <strong>开启新的研究</strong>
            <small>把下一个想法，变成项目</small>
          </button>
        </div>
      )}
      <Modal
        title={importing ? '导入已有项目' : '新建研究项目'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={create.isPending}
        okText={importing ? '导入项目' : '创建项目'}
        destroyOnHidden
      >
        <p className="muted">
          {importing
            ? '登记项目目录，保留其中已有的研究文件和运行状态。'
            : '先创建一个空项目，进入后再写研究问题。想直接开始，可以在上方输入研究问题。'}
        </p>
        <Form form={form} layout="vertical" onFinish={(values) => create.mutate(values)}>
          <Form.Item
            name="name"
            label="项目名称"
            rules={[{ required: true, whitespace: true, message: '请输入项目名称' }]}
          >
            <Input placeholder="例如：退役电池寿命预测研究" maxLength={100} />
          </Form.Item>
          {importing && (
            <Form.Item
              name="path"
              label="已有项目绝对路径"
              rules={[{ required: true, message: '请输入项目路径' }]}
            >
              <Input placeholder="/data/xinghao/batteryscientist-projects/my-research" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}

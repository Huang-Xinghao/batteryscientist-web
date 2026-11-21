import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Drawer, Empty, Input, Select, Skeleton, Switch, Tabs, Tooltip } from 'antd';
import {
  ApiOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExperimentOutlined,
  ReloadOutlined,
  SearchOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import {
  api,
  type LaboratoryChannel,
  type LaboratoryDevice,
  type LaboratorySource,
} from '../../api/client';
import './laboratory.css';

const filters = [
  ['all', '全部通道'],
  ['running', '运行中'],
  ['finished', '已结束'],
  ['paused', '已暂停'],
  ['stopped', '已停止'],
  ['idle', '空闲'],
  ['error', '异常'],
  ['offline', '离线'],
  ['unknown', '未知'],
] as const;

function value(number: number | null | undefined) {
  return number == null
    ? '—'
    : number.toLocaleString('zh-CN', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
        useGrouping: false,
      });
}

function receivedAt(timestamp: string | null | undefined) {
  if (!timestamp) return '尚无数据';
  return new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
}

function metrics(channel: LaboratoryChannel) {
  return [
    ['电压', value(channel.voltage_v), 'V'],
    ['电流', value(channel.current_a), 'A'],
    ['容量', value(channel.capacity_ah), 'Ah'],
    ['能量', value(channel.energy_wh), 'Wh'],
  ];
}

export function Laboratory() {
  const [params, setParams] = useSearchParams();
  const sourcesQuery = useQuery({
    queryKey: ['laboratory-sources'],
    queryFn: ({ signal }) => api.laboratorySources(signal),
  });
  const sources = sourcesQuery.data || [];
  const source = sources.find((item) => item.id === params.get('tab')) || sources[0];
  return (
    <div className="page laboratory-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">PHYSICAL LABORATORY</div>
          <h1>
            物理实验室<span className="title-dot">.</span>
          </h1>
          <p className="page-description">实验设备与通道运行状态</p>
        </div>
      </div>
      {sourcesQuery.isPending ? (
        <Skeleton active />
      ) : sourcesQuery.isError ? (
        <Alert
          type="warning"
          message="无法读取实验室设备列表"
          action={<Button onClick={() => void sourcesQuery.refetch()}>重试</Button>}
        />
      ) : (
        <>
          <Tabs
            className="laboratory-tabs"
            activeKey={source?.id}
            onChange={(key) => setParams({ tab: key })}
            items={sources.map((item) => ({
              key: item.id,
              label: (
                <span>
                  {item.kind === 'cycler' ? <ThunderboltOutlined /> : <ExperimentOutlined />}{' '}
                  {item.label}
                </span>
              ),
            }))}
          />
          {source?.kind === 'cycler' ? (
            <DeviceDashboard key={source.id} source={source} />
          ) : (
            <section className="laboratory-placeholder" aria-label={source?.label || '实验设备'}>
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂未接入设备" />
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ChannelCard({
  channel,
  stale,
  measurementsAvailable,
  statusAvailable,
  onOpen,
}: {
  channel: LaboratoryChannel;
  stale: boolean;
  measurementsAvailable: boolean;
  statusAvailable: boolean;
  onOpen: () => void;
}) {
  const outdated =
    stale ||
    (statusAvailable && channel.status_stale) ||
    (measurementsAvailable && channel.measurements_stale);
  return (
    <button
      className={`bts-channel state-${channel.state}${outdated ? ' is-stale' : ''}`}
      data-channel-id={channel.channel_id}
      aria-label={`单元 ${channel.unit_id} 通道 ${channel.number}，${outdated ? '数据未更新，' : ''}${channel.status_label}`}
      onClick={onOpen}
    >
      <div className="bts-channel-heading">
        <span>
          CH <strong>{channel.number.padStart(2, '0')}</strong>
        </span>
        <span className="bts-status-dot" />
      </div>
      <div className="bts-channel-state">
        {outdated && channel.observed_at ? '未更新' : channel.status_label}
      </div>
      {measurementsAvailable && (
        <dl className="bts-channel-metrics">
          {metrics(channel).map(([label, reading, unit]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                {reading}
                <small>{unit}</small>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </button>
  );
}

function DevicePanel({
  device,
  channels,
  stale,
  onOpen,
}: {
  device: LaboratoryDevice;
  channels: LaboratoryChannel[];
  stale: boolean;
  onOpen: (id: string) => void;
}) {
  const units = [...new Set(channels.map((channel) => channel.unit_id))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  return (
    <section className="bts-device" aria-label={`测试设备 ${device.device_id}`}>
      <header className="bts-device-header">
        <div className="bts-device-name">
          <span className="bts-device-icon">
            <ApiOutlined />
          </span>
          <div>
            <h2>设备 {device.device_id}</h2>
            <span>
              {device.vendor} · 类型 {device.device_type}
            </span>
          </div>
        </div>
        <span className="bts-device-count">
          {channels.length} / {device.channels.length} 个通道
        </span>
      </header>
      {units.map((unit) => (
        <div className="bts-unit" key={unit}>
          <div className="bts-unit-heading">
            <h3>单元 {unit.padStart(2, '0')}</h3>
            <span>{channels.filter((c) => c.unit_id === unit).length} 个通道</span>
          </div>
          <div className="bts-channel-grid">
            {channels
              .filter((c) => c.unit_id === unit)
              .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
              .map((channel) => (
                <ChannelCard
                  key={channel.channel_id}
                  channel={channel}
                  measurementsAvailable={device.capabilities.measurements}
                  statusAvailable={device.capabilities.status}
                  stale={stale}
                  onOpen={() => onOpen(channel.channel_id)}
                />
              ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function DeviceDashboard({ source }: { source: LaboratorySource }) {
  const brand = source.label;
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [deviceId, setDeviceId] = useState('all');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['laboratory', source.id],
    queryFn: ({ signal }) => api.laboratorySnapshot(source.id, signal),
    refetchInterval: autoRefresh ? 10000 : false,
    retry: false,
  });
  const snapshot = query.data;
  const devices = snapshot?.devices || [];
  const allChannels = devices.flatMap((device) => device.channels);
  const online = snapshot?.connection === 'online' && !query.isError;
  const disconnected = snapshot?.connection === 'offline' || query.isError;
  const stale = disconnected;
  const detail = allChannels.find((channel) => channel.channel_id === selected);
  const selectedDevice = devices.find((device) =>
    device.channels.some((c) => c.channel_id === selected),
  );
  const baseChannels = devices
    .filter((device) => deviceId === 'all' || device.id === deviceId)
    .flatMap((device) => device.channels);
  const searchText = search.trim().toLowerCase();
  const matches = (channel: LaboratoryChannel) =>
    (filter === 'all' || channel.state === filter) &&
    (!searchText ||
      `${channel.channel_id} 单元${channel.unit_id} 通道${channel.number} ${channel.status_label}`
        .toLowerCase()
        .includes(searchText));
  const count = (state: string) => baseChannels.filter((channel) => channel.state === state).length;
  const stats = [
    ['已发现设备', snapshot?.last_success_at ? devices.length : '—', '台'],
    ['通道总数', snapshot?.last_success_at ? allChannels.length : '—', '个'],
    [
      '运行中',
      online && snapshot?.capabilities.status
        ? allChannels.filter((c) => c.state === 'running' && !c.status_stale).length
        : '—',
      '个',
    ],
    [
      '已结束',
      online && snapshot?.capabilities.status
        ? allChannels.filter((c) => c.state === 'finished' && !c.status_stale).length
        : '—',
      '个',
    ],
    [
      '异常通道',
      online && snapshot?.capabilities.status
        ? allChannels.filter((c) => c.state === 'error' && !c.status_stale).length
        : '—',
      '个',
    ],
  ];
  return (
    <section className="bts-dashboard" aria-label={brand + ' 监控'}>
      <div className="bts-toolbar">
        <div className="bts-connection">
          <span className={`bts-connection-dot ${online ? 'online' : ''}`} />
          <strong>
            {query.isPending
              ? '正在连接设备'
              : online
                ? snapshot?.discovery_only
                  ? brand + '查询服务已连接'
                  : '设备已连接'
                : disconnected
                  ? '设备连接中断'
                  : '设备未连接'}
          </strong>
          <span className="bts-monitor-label">
            {snapshot?.discovery_only ? '通道目录' : '通道监控'}
          </span>
        </div>
        <div className="bts-refresh-tools">
          <Tooltip title="页面打开时每 10 秒刷新一次">
            <label className="bts-auto-refresh">
              自动刷新{' '}
              <Switch
                size="small"
                checked={autoRefresh}
                onChange={setAutoRefresh}
                aria-label="自动刷新"
              />
            </label>
          </Tooltip>
          <Button
            aria-label="刷新"
            icon={<ReloadOutlined />}
            loading={query.isFetching}
            onClick={() => void query.refetch()}
          >
            刷新
          </Button>
        </div>
      </div>
      {(disconnected || snapshot?.message) && (
        <Alert
          className="bts-notice"
          showIcon
          type={disconnected ? 'warning' : 'info'}
          message={
            disconnected
              ? '实验室连接暂时不可用'
              : snapshot?.discovery_only
                ? '已发现通道，实时状态尚未接入'
                : snapshot?.stale
                  ? '部分数据未更新'
                  : '等待设备连接'
          }
          description={
            query.isError
              ? '暂时无法获取设备数据，请稍后刷新。当前可见数据为上次接收值。'
              : snapshot?.message
          }
        />
      )}
      {query.isPending ? (
        <div className="bts-loading">
          <Skeleton active paragraph={{ rows: 8 }} />
        </div>
      ) : (
        <>
          <div className="bts-stats" aria-label="设备概况">
            {stats.map(([label, number, unit]) => (
              <div key={label} className="bts-stat">
                <span>{label}</span>
                <strong>
                  {number}
                  <small>{unit}</small>
                </strong>
              </div>
            ))}
          </div>
          <div className="bts-controls">
            <Select
              aria-label="选择设备"
              value={deviceId}
              onChange={setDeviceId}
              options={[
                { value: 'all', label: '全部设备' },
                ...devices.map((d) => ({ value: d.id, label: `设备 ${d.device_id}` })),
              ]}
            />
            <Input
              prefix={<SearchOutlined />}
              placeholder="搜索设备或通道"
              aria-label="搜索设备或通道"
              allowClear
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Tooltip title="设备响应的接收时间">
              <span className="bts-updated">
                <ClockCircleOutlined />
                {snapshot?.last_success_at
                  ? `更新于 ${receivedAt(snapshot.last_success_at)}`
                  : '尚无设备数据'}
              </span>
            </Tooltip>
          </div>
          <div className="bts-filters" aria-label="筛选通道状态">
            {filters
              .filter(([key]) => key === 'all' || count(key) > 0 || filter === key)
              .map(([key, label]) => (
                <button
                  key={key}
                  className={filter === key ? 'selected' : ''}
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                >
                  <span className={`bts-filter-dot state-${key}`} />
                  {label}
                  <span>{key === 'all' ? baseChannels.length : count(key)}</span>
                </button>
              ))}
          </div>
          {devices
            .filter((device) => deviceId === 'all' || device.id === deviceId)
            .map((device) => {
              const channels = device.channels.filter(matches);
              return channels.length > 0 ? (
                <DevicePanel
                  key={device.id}
                  device={device}
                  channels={channels}
                  stale={stale}
                  onOpen={setSelected}
                />
              ) : null;
            })}
          {baseChannels.filter(matches).length === 0 && (
            <div className="bts-empty">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  allChannels.length === 0
                    ? online
                      ? brand + ' 已连接，尚未发现通道'
                      : '暂无可显示的设备通道'
                    : '没有匹配的通道'
                }
              />
            </div>
          )}
          <div className="bts-legend">
            <CheckCircleOutlined />{' '}
            {disconnected
              ? '当前展示上次接收的数据'
              : snapshot?.discovery_only
                ? '通道来自设备目录查询，不代表设备在线或正在运行'
                : '数据来自设备实时查询'}
            <span>点击通道查看详情</span>
            {allChannels.some(
              (c) =>
                (snapshot?.capabilities.status && c.status_stale) ||
                (snapshot?.capabilities.measurements && c.measurements_stale),
            ) && <span className="bts-stale-label">部分通道为上次接收值或暂无数据</span>}
          </div>
        </>
      )}
      <Drawer
        title={
          detail
            ? `设备 ${selectedDevice?.device_id} · 单元 ${detail.unit_id} · 通道 ${detail.number}`
            : '通道详情'
        }
        open={selected !== null}
        onClose={() => setSelected(null)}
        width="min(440px, 100vw)"
      >
        {detail ? (
          <div className="bts-detail">
            <span className={`bts-detail-status state-${detail.state}`}>{detail.status_label}</span>
            {(stale || detail.status_stale || detail.measurements_stale) && (
              <Alert
                type="warning"
                showIcon
                message={
                  snapshot?.discovery_only
                    ? '该通道已发现，实时状态与测量值尚不可用'
                    : '数据未更新，仅供查看上次接收状态'
                }
              />
            )}
            {snapshot?.capabilities.measurements && (
              <dl className="bts-detail-metrics">
                {metrics(detail).map(([label, reading, unit]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>
                      {reading}
                      <small>{unit}</small>
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            <dl className="bts-detail-info">
              <dt>设备状态</dt>
              <dd>
                {detail.status_label} · {detail.status}
              </dd>
              <dt>循环序号</dt>
              <dd>{detail.cycle ?? '—'}</dd>
              <dt>当前工步</dt>
              <dd>{detail.step_type ?? '—'}</dd>
              <dt>最近接收</dt>
              <dd>{receivedAt(detail.observed_at)}</dd>
              <dt>通道标识</dt>
              <dd>
                <code>{detail.channel_id}</code>
              </dd>
            </dl>
            <p className="bts-detail-note">接收时间表示本次设备响应到达的时间。</p>
          </div>
        ) : (
          <Empty description="该通道已不在当前设备列表中" />
        )}
      </Drawer>
    </section>
  );
}

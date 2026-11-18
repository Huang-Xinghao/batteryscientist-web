import { expect, test } from '@playwright/test';

function snapshot() {
  const states = [
    'running',
    'finished',
    'paused',
    'idle',
    'error',
    'stopped',
    'offline',
    'unknown',
  ];
  const labels = ['充电中', '已结束', '已暂停', '空闲', '故障', '已停止', '离线', '未知'];
  return {
    connection: 'online',
    observed_at: '2026-11-12T08:00:00Z',
    last_success_at: '2026-11-12T08:00:01Z',
    stale: false,
    message: null,
    devices: [
      {
        id: 'local/27/239',
        device_id: '239',
        device_type: '27',
        channels: Array.from({ length: 40 }, (_, i) => ({
          channel_id: `local/27/239/${Math.floor(i / 8) + 1}/${(i % 8) + 1}`,
          unit_id: String(Math.floor(i / 8) + 1),
          number: String((i % 8) + 1),
          state: states[i % 8],
          status: i % 8 === 0 ? 'charge' : states[i % 8],
          status_label: labels[i % 8],
          status_stale: false,
          measurements_stale: false,
          observed_at: '2026-11-12T08:00:01Z',
          voltage_v: i === 1 ? null : 3.7123,
          current_a: 0,
          capacity_ah: 0.125,
          energy_wh: 0,
          cycle: '2',
          step_type: null,
        })),
      },
    ],
  };
}

test('laboratory navigation shows grouped channels, measurements, filtering and details', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/laboratory/bts', (route) => route.fulfill({ json: snapshot() }));
  await page.goto('/');
  await page.locator('.sidebar').getByRole('link', { name: '物理实验室', exact: true }).click();
  await expect(page.getByRole('heading', { name: /物理实验室/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: '新威 BTS' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByText('设备已连接', { exact: true })).toBeVisible();
  await expect(page.locator('.bts-channel')).toHaveCount(40);
  await expect(page.locator('.bts-unit')).toHaveCount(5);
  const first = page.locator('[data-channel-id="local/27/239/1/1"]');
  await expect(first).toContainText('3.7123');
  await expect(first).toContainText('0.0000');
  await first.click();
  await expect(page.locator('.ant-drawer-title')).toHaveText('设备 239 · 单元 1 · 通道 1');
  await expect(page.locator('.bts-detail-info')).toContainText('charge');
  await expect(page.locator('.bts-detail-info')).toContainText('local/27/239/1/1');
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('button', { name: /运行中/ }).click();
  await expect(page.locator('.bts-channel')).toHaveCount(5);
  await page.getByRole('button', { name: /全部通道/ }).click();
  await page.getByLabel('搜索设备或通道', { exact: true }).fill('local/27/239/1/2');
  await expect(page.locator('.bts-channel')).toHaveCount(1);
  await expect(page.locator('.bts-channel')).toContainText('—');
  await page.getByLabel('搜索设备或通道', { exact: true }).fill('不存在的通道');
  await expect(page.getByText('没有匹配的通道')).toBeVisible();
  await page.getByLabel('搜索设备或通道', { exact: true }).fill('');
  await page.screenshot({ path: 'artifacts/laboratory-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('refresh queries again and disconnection marks retained readings as stale', async ({
  page,
}) => {
  let connected = true;
  let calls = 0;
  await page.route('**/api/laboratory/bts', (route) => {
    calls++;
    const data = snapshot();
    if (!connected) {
      data.connection = 'offline';
      data.stale = true;
      Object.assign(data, { message: '实验室连接中断。当前展示上次接收的数据。' });
      for (const channel of data.devices[0].channels) {
        channel.status_stale = channel.measurements_stale = true;
      }
    }
    return route.fulfill({ json: data });
  });
  await page.goto('/laboratory');
  await expect(page.locator('.bts-channel')).toHaveCount(40);
  const initial = calls;
  connected = false;
  await page.getByRole('button', { name: '刷新', exact: true }).click();
  await expect.poll(() => calls).toBeGreaterThan(initial);
  await expect(page.getByText('设备连接中断', { exact: true })).toBeVisible();
  await expect(page.getByText('实验室连接暂时不可用')).toBeVisible();
  await expect(page.locator('.bts-channel.is-stale')).toHaveCount(40);
  await expect(page.locator('.bts-channel').first()).toContainText('未更新');
  await expect(page.locator('.bts-channel').first()).toContainText('3.7123');
  connected = true;
  await page.getByRole('button', { name: '刷新', exact: true }).click();
  await expect(page.getByText('设备已连接', { exact: true })).toBeVisible();
  await expect(page.locator('.bts-channel.is-stale')).toHaveCount(0);
});

test('mobile laboratory fits the viewport and coin cell section stays empty', async ({ page }) => {
  let calls = 0;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/laboratory/bts', (route) => {
    calls++;
    return route.fulfill({ json: snapshot() });
  });
  await page.goto('/laboratory');
  await expect(page.locator('.bts-channel')).toHaveCount(40);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: 'artifacts/laboratory-mobile.png', fullPage: true });
  await page.getByRole('tab', { name: '自动化扣电' }).click();
  await expect(page.getByRole('region', { name: '自动化扣电' })).toBeVisible();
  await expect(page.getByText('暂未接入设备')).toBeVisible();
  await expect(page.locator('.bts-channel')).toHaveCount(0);
  const count = calls;
  await page.reload();
  await expect(page.getByRole('tab', { name: '自动化扣电' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  expect(calls).toBe(count);
});

test('unavailable responses show a useful empty state and retry', async ({ page }) => {
  await page.route('**/api/laboratory/bts', (route) =>
    route.fulfill({ status: 503, json: { detail: 'unavailable' } }),
  );
  await page.goto('/laboratory');
  await expect(page.getByText('实验室连接暂时不可用')).toBeVisible();
  await expect(page.getByText('暂无可显示的设备通道')).toBeVisible();
  await page.route('**/api/laboratory/bts', (route) =>
    route.fulfill({ json: { ...snapshot(), devices: [] } }),
  );
  await page.getByRole('button', { name: '刷新', exact: true }).click();
  await expect(page.getByText('BTS 已连接，尚未发现通道')).toBeVisible();
});

test('automatic refresh can be paused', async ({ page }) => {
  let calls = 0;
  await page.clock.install();
  await page.route('**/api/laboratory/bts', (route) => {
    calls++;
    return route.fulfill({ json: snapshot() });
  });
  await page.goto('/laboratory');
  await expect(page.locator('.bts-channel')).toHaveCount(40);
  const initial = calls;
  await page.clock.fastForward(11000);
  await expect.poll(() => calls).toBeGreaterThan(initial);
  await page.getByRole('switch', { name: '自动刷新', exact: true }).click();
  const paused = calls;
  await page.clock.fastForward(22000);
  expect(calls).toBe(paused);
});

test('LAND discovery is distinct from BTS and never implies live measurements', async ({
  page,
}) => {
  const land = {
    ...snapshot(),
    discovery_only: true,
    status_available: false,
    measurements_available: false,
    stale: true,
    message: '已读取蓝电通道目录；通道在线情况、实时运行状态和测量值尚未接入。',
    devices: [
      {
        id: 'local/LAND/windows',
        device_id: 'windows',
        device_type: 'LAND',
        channels: Array.from({ length: 80 }, (_, i) => ({
          channel_id: 'local/LAND/windows/' + (Math.floor(i / 8) + 3) + '/' + ((i % 8) + 1),
          unit_id: String(Math.floor(i / 8) + 3),
          number: String((i % 8) + 1),
          status: 'unknown',
          state: 'unknown',
          status_label: '未知',
          status_stale: true,
          measurements_stale: true,
          observed_at: null,
          voltage_v: null,
          current_a: null,
          capacity_ah: null,
          energy_wh: null,
          cycle: null,
          step_type: null,
        })),
      },
    ],
  };
  await page.route('**/api/laboratory/bts', (route) => route.fulfill({ json: snapshot() }));
  await page.route('**/api/laboratory/land', (route) => route.fulfill({ json: land }));
  await page.goto('/laboratory');
  await expect(page.locator('.bts-channel')).toHaveCount(40);
  await page.getByRole('tab', { name: '蓝电 LAND' }).click();
  await expect(page).toHaveURL(/tab=land/);
  await expect(page.getByText('蓝电查询服务已连接', { exact: true })).toBeVisible();
  await expect(page.locator('.bts-channel')).toHaveCount(80);
  await expect(page.locator('.bts-channel').first()).toContainText('未知');
  await expect(page.locator('.bts-channel').first()).toContainText('\u2014');
  await expect(page.locator('.bts-stat').filter({ hasText: '运行中' })).toContainText('\u2014');
  await page.locator('.bts-channel').first().click();
  await expect(page.getByText('该通道已发现，实时状态与测量值尚不可用')).toBeVisible();
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('tab', { name: '蓝电 LAND' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('.bts-channel')).toHaveCount(80);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: 'artifacts/laboratory-land-mobile.png', fullPage: true });
  await page.getByRole('tab', { name: '新威 BTS' }).click();
  await expect(page.locator('.bts-channel')).toHaveCount(40);
});

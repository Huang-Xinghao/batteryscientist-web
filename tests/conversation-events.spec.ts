import { expect, test } from '@playwright/test';
import type { ActivityEvent } from '../src/api/client';
import { conversationEvents } from '../src/features/workbench/chat/activity';

const receipt: ActivityEvent = {
  id: 2,
  project_id: 'fixture',
  created_at: '2026-11-25T01:00:00Z',
  run_id: 'chat',
  kind: 'conversation_turn',
  data: { prompt: '主控执行结果', reply: '实验配置说明', intent: 'coordinator_result' },
};

test('coordinator receipt preserves its reply as assistant output when stream history is unavailable', () => {
  const [result] = conversationEvents([receipt]);
  expect(result.kind).toBe('assistant_output');
  expect(result.data).toEqual({ role: 'main', phase: 'coordinator', content: '实验配置说明' });
});

test('receipt deduplication applies only to the same run and preserves real conversation turns', () => {
  const output = {
    ...receipt,
    id: 1,
    kind: 'assistant_output',
    data: { role: 'main', phase: 'coordinator', content: '实验配置说明' },
  };
  expect(conversationEvents([output, receipt])).toEqual([output]);
  expect(conversationEvents([{ ...output, run_id: 'previous' }, receipt])).toHaveLength(2);
  const turn = { ...receipt, data: { prompt: '真正的问题', reply: '答复', intent: 'discussion' } };
  expect(conversationEvents([turn])).toEqual([turn]);
});

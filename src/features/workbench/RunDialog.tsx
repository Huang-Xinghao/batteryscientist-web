import { Alert, Collapse, Form, Input, InputNumber, Modal, Select, Space } from 'antd';
import type { NodeInfo, Project, RunInput } from '../../api/client';
export function RunDialog({
  mode,
  onModeChange,
  open,
  onClose,
  onRun,
  pending,
  project,
  nodes,
}: {
  mode: 'auto' | 'expert';
  onModeChange: (mode: 'auto' | 'expert') => void;
  open: boolean;
  onClose: () => void;
  onRun: (values: RunInput) => void;
  pending: boolean;
  project: Project;
  nodes: NodeInfo[];
}) {
  const [form] = Form.useForm();
  const selectedMode = Form.useWatch('mode', form) || mode;
  const existing = Boolean(project.state.project_goal);
  return (
    <Modal
      title={existing ? '从已有研究继续' : '开始新的研究'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="启动研究"
      confirmLoading={pending}
      width={640}
      destroyOnHidden
    >
      <p className="muted">
        {existing
          ? '复用已有产物，从指定节点继续。补充指令仅作用于本次入口节点。'
          : '描述你的研究问题、已有资料和预期成果。'}
      </p>
      <Form
        form={form}
        layout="vertical"
        clearOnDestroy
        initialValues={{
          prompt: '',
          mode,
          max_tool_rounds: 300,
          timeout: 600,
        }}
        onValuesChange={(changed) => {
          if (changed.mode) onModeChange(changed.mode);
        }}
        onFinish={(values) =>
          onRun({
            ...values,
            max_tool_rounds: values.max_tool_rounds ?? 300,
            timeout: values.timeout ?? 600,
            action: existing ? 'resume' : 'start',
            start_node: values.start_node || undefined,
            stop_after: values.stop_after || undefined,
            model: values.model || undefined,
          })
        }
      >
        <Form.Item
          name="prompt"
          label={existing ? '本次补充指令（可选）' : '研究目标'}
          rules={existing ? [] : [{ required: true, whitespace: true, message: '请输入研究目标' }]}
        >
          <Input.TextArea
            rows={5}
            maxLength={20000}
            placeholder="我希望研究……已有数据包括……重点验证……"
            showCount
          />
        </Form.Item>
        <Form.Item name="mode" label="协作方式">
          <Select
            options={[
              { value: 'expert', label: '专家模式 · 每个阶段审阅后继续（推荐）' },
              { value: 'auto', label: '自动模式 · 连续运行整个工作流' },
            ]}
          />
        </Form.Item>
        <Alert
          type="info"
          showIcon
          message={
            selectedMode === 'auto'
              ? '自动模式会在任务范围内连续推进，由 Agent 自行处理常规取舍。遇到实际阻塞时仍会向你提问。'
              : '专家模式会在每个阶段交付后等待你的审阅。修改意见用于修订，明确批准后才进入下一阶段。'
          }
        />
        <Space align="start" style={{ width: '100%' }} className="run-node-fields">
          <Form.Item name="start_node" label="起始节点">
            <Select
              allowClear
              placeholder={existing ? '从当前节点恢复' : '文献研究'}
              options={nodes.map((n) => ({ value: n.id, label: n.label }))}
              style={{ width: 250 }}
            />
          </Form.Item>
          <Form.Item name="stop_after" label="运行至">
            <Select
              allowClear
              placeholder="直至整个流程完成"
              options={nodes.map((n) => ({ value: n.id, label: n.label }))}
              style={{ width: 250 }}
            />
          </Form.Item>
        </Space>
        <Collapse
          ghost
          items={[
            {
              key: 'advanced',
              label: '高级运行参数',
              children: (
                <>
                  <Space>
                    <Form.Item
                      label="每次角色任务的模型轮数"
                      name="max_tool_rounds"
                      tooltip="模型每生成一次回复计一轮，同一回复中的多个工具调用合计一轮；工具执行耗时不增加轮数。默认 300 轮。"
                    >
                      <InputNumber min={1} max={500} />
                    </Form.Item>
                    <Form.Item label="模型请求超时（秒）" name="timeout">
                      <InputNumber min={1} max={7200} />
                    </Form.Item>
                  </Space>
                  <Form.Item label="模型（留空使用后端配置）" name="model">
                    <Input placeholder="使用后端默认模型" />
                  </Form.Item>
                </>
              ),
            },
          ]}
        />
        <Alert
          type="info"
          showIcon
          message="运行会调用真实模型和工具，并可能启动 GPU 实验。关闭页面后任务仍会继续。"
        />
      </Form>
    </Modal>
  );
}

# 对话界面

按 StoraGent 的组件结构适配 React 与现有 Paper Agent 数据：

- `MessageActions.tsx`：参考 `features/chat/components/MessageBubble.vue`，消息下方复制与修改入口；增加剪贴板错误反馈、定时器清理和覆盖输入草稿前确认。
- `ChatArtifactCard.tsx`：参考 `features/chat/artifacts/TurnArtifactsCard.vue` 与 `shared/artifacts/ArtifactDescriptorCard.vue`，类型图标、标题、路径、文件大小、打开与独立下载操作。
- `conversation.css`：参考上述气泡/产物卡片和 `features/chat/components/MessageInputComponent.vue`，20px 用户气泡、一体式输入边框和焦点轮廓；适配当前绿色主题与窄屏。

保留后端执行记录、专家问答和文件冲突保护契约。上游为 MIT，版权与授权全文位于 `src/shared/file-preview/STORAGENT-LICENSE.txt`。

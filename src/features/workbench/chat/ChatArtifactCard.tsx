// Adapted from StoraGent TurnArtifactsCard.vue / ArtifactDescriptorCard.vue (MIT).
// License: src/shared/file-preview/STORAGENT-LICENSE.txt.
import {
  DownloadOutlined,
  ArrowUpOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { api, type ProjectFile } from '../../../api/client';
import { formatArtifactSize } from '../../../shared/file-preview/display';

export function ChatArtifactCard({
  projectId,
  path,
  title,
  file,
  onOpen,
}: {
  projectId: string;
  path: string;
  title: string;
  file?: ProjectFile;
  onOpen: (path: string) => void;
}) {
  const extension = path.split('.').pop()?.toUpperCase() || 'FILE';
  const Icon =
    extension === 'PDF' ? FilePdfOutlined : extension === 'TEX' ? CodeOutlined : FileTextOutlined;
  return (
    <div className="chat-deliverable" data-kind={extension.toLowerCase()}>
      <div className="chat-deliverable-heading">
        <span className="deliverable-dot" />
        阶段产物<span>{extension}</span>
      </div>
      <button
        type="button"
        className="chat-artifact"
        onClick={() => onOpen(path)}
        aria-label={`打开${title}阶段产物`}
      >
        <span className="deliverable-icon">
          <Icon />
        </span>
        <span className="deliverable-info">
          <strong>{title}</strong>
          <small title={path}>{path}</small>
        </span>
        <ArrowUpOutlined className="deliverable-arrow" />
      </button>
      <div className="chat-deliverable-footer">
        <span>{file ? formatArtifactSize(file.size) : extension} · 在工作区查看与编辑</span>
        {file && (
          <Tooltip title="下载文件">
            <Button
              type="text"
              size="small"
              aria-label={`下载${title}产物`}
              href={api.download(projectId, path)}
              target="_blank"
              rel="noreferrer"
              icon={<DownloadOutlined />}
            />
          </Tooltip>
        )}
      </div>
    </div>
  );
}

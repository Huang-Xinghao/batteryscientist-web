import { useState } from 'react';
import { Button, Image } from 'antd';
import { api, type ProjectFile } from '../../api/client';
import { projectImageFile } from './projectImage';
import './project-image.css';

/** Project images always load through the authenticated file API. */
export function ProjectImage({
  projectId,
  files,
  projectRoot,
  report,
  src,
  alt,
  title,
}: {
  projectId: string;
  files: ProjectFile[];
  projectRoot?: string;
  report?: string;
  src?: string;
  alt?: string;
  title?: string;
}) {
  const [failed, setFailed] = useState('');
  const [attempt, setAttempt] = useState(0);
  const file = projectImageFile(src, files, projectRoot, report);
  if (!file) return <span className="muted">[图片暂不可用：{alt || '文件尚未加载'}]</span>;
  const url = `${api.download(projectId, file.path)}&v=${file.modified}&retry=${attempt}`;
  if (failed === url)
    return (
      <span className="project-image-error" role="status">
        图片加载失败：{alt || file.path}
        <Button size="small" type="link" onClick={() => setAttempt((value) => value + 1)}>
          重新加载
        </Button>
      </span>
    );
  return (
    <span className="project-markdown-image">
      <Image
        key={url}
        src={url}
        alt={alt || file.path}
        title={title}
        preview={{ mask: '放大查看' }}
        onError={() => setFailed(url)}
      />
    </span>
  );
}

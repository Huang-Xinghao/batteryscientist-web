import { useState } from 'react';
import { Button, Empty, Image, Input, Select, Tooltip } from 'antd';
import { DownloadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { api, type ProjectFile } from '../../api/client';
import { formatArtifactSize, isImagePath } from '../../shared/file-preview/display';
import './gallery.css';

function FigureCard({ projectId, file }: { projectId: string; file: ProjectFile }) {
  const [dimensions, setDimensions] = useState('');
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const name = file.path.split('/').pop()!;
  const folder = file.path.slice(0, Math.max(0, file.path.lastIndexOf('/')));
  const url = `${api.download(projectId, file.path)}&v=${file.modified}&retry=${attempt}`;
  return (
    <figure className="research-figure">
      {failed ? (
        <div className="figure-load-error">
          <span>图片加载失败</span>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => {
              setFailed(false);
              setAttempt(attempt + 1);
            }}
          >
            重新加载
          </Button>
        </div>
      ) : (
        <Image
          key={url}
          src={url}
          alt={file.path}
          loading="lazy"
          preview={{ mask: '放大查看' }}
          onLoad={(event) => {
            const image = event.target;
            if (!(image instanceof HTMLImageElement)) return;
            setDimensions(`${image.naturalWidth} × ${image.naturalHeight}`);
          }}
          onError={() => setFailed(true)}
        />
      )}
      <figcaption>
        <div className="figure-title">
          <strong title={file.path}>{name}</strong>
          <Tooltip title="下载原图">
            <Button
              size="small"
              type="text"
              aria-label={`下载 ${name}`}
              href={api.download(projectId, file.path)}
              target="_blank"
              rel="noreferrer"
              icon={<DownloadOutlined />}
            />
          </Tooltip>
        </div>
        <div className="figure-directory" title={folder}>
          {folder || '项目根目录'}
        </div>
        <div className="figure-metadata">
          <span>{formatArtifactSize(file.size)}</span>
          <span>{dimensions}</span>
          <span>{name.split('.').pop()?.toUpperCase()}</span>
        </div>
      </figcaption>
    </figure>
  );
}

export function FigureGallery({ projectId, files }: { projectId: string; files: ProjectFile[] }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('path');
  const images = files.filter((file) => isImagePath(file.path));
  const visible = images
    .filter((file) => file.path.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) =>
      sort === 'modified'
        ? b.modified - a.modified
        : a.path.localeCompare(b.path, 'zh-CN', { numeric: true }),
    );
  if (!images.length) return <Empty description="暂无图片；生成的研究图表将在这里展示" />;
  return (
    <div className="research-gallery">
      <div className="gallery-toolbar">
        <div>
          <strong>研究图表</strong>
          <span className="gallery-count">
            {visible.length} / {images.length}
          </span>
        </div>
        <Input
          aria-label="筛选研究图片"
          placeholder="搜索图片名称或目录"
          prefix={<SearchOutlined />}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          allowClear
        />
        <Select
          aria-label="图片排序"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'path', label: '按名称' },
            { value: 'modified', label: '最近更新' },
          ]}
        />
      </div>
      <div className="gallery-scroll">
        {visible.length ? (
          <Image.PreviewGroup
            preview={{ countRender: (current, total) => `${current} / ${total}` }}
          >
            <div className="figure-gallery">
              {visible.map((file) => (
                <FigureCard
                  key={`${file.path}:${file.modified}`}
                  projectId={projectId}
                  file={file}
                />
              ))}
            </div>
          </Image.PreviewGroup>
        ) : (
          <Empty description="没有匹配的图片" />
        )}
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Empty, Image, Input, Select, Skeleton } from 'antd';
import { FileTextOutlined, PictureOutlined, SearchOutlined } from '@ant-design/icons';
import { api } from '../../api/client';
import './figures.css';

export function PaperFigures({
  refresh,
  onOpen,
}: {
  refresh: number;
  onOpen: (path: string) => void;
}) {
  const figures = useQuery({
    queryKey: ['paradigm-figures', refresh],
    queryFn: api.paradigmFigures,
  });
  const [search, setSearch] = useState('');
  const [paper, setPaper] = useState<string>();
  const papers = useMemo(
    () =>
      Array.from(
        new Map(figures.data?.items.map((item) => [item.paper_id, item.paper_title])).entries(),
      ).map(([value, label]) => ({ value, label })),
    [figures.data],
  );
  const terms = search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const items =
    figures.data?.items.filter(
      (item) =>
        (!paper || item.paper_id === paper) &&
        terms.every((term) =>
          `${item.paper_title} ${item.label} ${item.caption}`.toLocaleLowerCase().includes(term),
        ),
    ) || [];
  return (
    <section className="paper-figures" aria-label="论文图片区">
      <header className="paper-figures-heading">
        <div>
          <span className="eyebrow">VISUAL EVIDENCE</span>
          <h2>从图中理解研究</h2>
          <p>
            {figures.data?.total ?? '—'} 张图片 · {papers.length} 篇论文
          </p>
        </div>
        <div className="paper-figure-filters">
          <Input
            aria-label="搜索论文图片"
            placeholder="搜索论文名称或图注"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
          <Select
            aria-label="按论文筛选图片"
            placeholder="全部论文"
            allowClear
            value={paper}
            onChange={setPaper}
            options={papers}
            popupMatchSelectWidth={false}
          />
        </div>
      </header>
      <div className="paper-figures-content">
        {figures.isPending ? (
          <Skeleton active paragraph={{ rows: 10 }} />
        ) : figures.isError ? (
          <Alert
            type="error"
            showIcon
            message="论文图片加载失败"
            action={
              <Button aria-label="重试图片" onClick={() => void figures.refetch()}>
                重试
              </Button>
            }
          />
        ) : !items.length ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              figures.data?.items.length
                ? '没有匹配的图片，试试其他论文或关键词。'
                : '暂无已归档的论文图片。'
            }
          />
        ) : (
          <Image.PreviewGroup>
            <div className="paper-figure-grid">
              {items.map((item) => (
                <figure className="paper-figure-card" key={item.id}>
                  <header>
                    <div className="paper-figure-source">
                      <FileTextOutlined aria-hidden="true" /> 论文
                    </div>
                    <h3>
                      {item.paper_path ? (
                        <button onClick={() => onOpen(item.paper_path!)} title="查看论文文档">
                          {item.paper_title}
                        </button>
                      ) : (
                        item.paper_title
                      )}
                    </h3>
                  </header>
                  <div className="paper-figure-image">
                    <Image
                      src={api.libraryAsset('paradigms', item.image_path)}
                      alt={`${item.paper_title} — ${item.label}`}
                      loading="lazy"
                      placeholder={
                        <div className="paper-image-placeholder">
                          <PictureOutlined />
                        </div>
                      }
                      preview={{ mask: '放大查看' }}
                    />
                  </div>
                  <figcaption>
                    <div className="paper-figure-label">
                      <strong>{item.label}</strong>
                      {item.page !== null && <span>PDF 第 {item.page} 页</span>}
                    </div>
                    <p>{item.caption || '暂无图注。'}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </Image.PreviewGroup>
        )}
        {figures.data?.truncated && <Alert type="info" message="当前仅展示前 1000 张归档图片。" />}
      </div>
    </section>
  );
}

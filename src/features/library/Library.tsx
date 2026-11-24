import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Drawer, Empty, Input, Skeleton, Tag } from 'antd';
import {
  ArrowLeftOutlined,
  BookOutlined,
  FileTextOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Link, useSearchParams } from 'react-router-dom';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { api, type LibraryKind } from '../../api/client';
import './library.css';
import { ParadigmGraph } from './ParadigmGraph';
import { PaperFigures } from './PaperFigures';
import './layout.css';

const categoryLabels: Record<string, string> = {
  overview: '总览与指南',
  papers: '论文范式',
  ideas: '研究思路',
  experiments: '实验设计',
  claims: '研究论断',
  figures: '图表资料',
};
const categoryName = (value: string) =>
  value
    .split('/')
    .map(
      (part) =>
        ({ literature: '文献库', autoresearch: '自主研究', ...categoryLabels })[part] || part,
    )
    .join(' / ');

// Resolve links relative to the current document, including parent-directory links.
function localResource(href: string, path: string) {
  if (!href || href.startsWith('#') || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) return undefined;
  try {
    const base = new URL(
      path.split('/').map(encodeURIComponent).join('/'),
      'https://library.local/',
    );
    const url = new URL(href, base);
    return { path: decodeURIComponent(url.pathname.slice(1)), hash: url.hash };
  } catch {
    return undefined;
  }
}

export function Library({ kind }: { kind: LibraryKind }) {
  return <LibraryBrowser key={kind} kind={kind} />;
}

function LibraryBrowser({ kind }: { kind: LibraryKind }) {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const selected = params.get('path') || '';
  const view = params.get('view') === 'figures' ? 'figures' : 'graph';
  const path = selected || (kind === 'paradigms' ? 'index.md' : '资源库总览.md');
  const [search, setSearch] = useState(q);
  const [graphRefresh, setGraphRefresh] = useState(0);
  const [mobilePane, setMobilePane] = useState(selected ? 'document' : 'catalog');
  const title = kind === 'paradigms' ? '电池范式库' : '电池资源库';
  const index = useQuery({
    queryKey: ['library', kind, q, category],
    queryFn: () => api.library(kind, q, category),
  });
  const doc = useQuery({
    queryKey: ['library-document', kind, path],
    queryFn: () => api.libraryDocument(kind, path),
    enabled: index.data?.available === true && (kind !== 'paradigms' || !!selected),
  });
  useEffect(() => setSearch(q), [q]);
  useEffect(() => setMobilePane(selected ? 'document' : 'catalog'), [selected]);
  function update(values: Record<string, string>, replace = false) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        for (const [key, value] of Object.entries(values)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace },
    );
  }
  useEffect(() => {
    if (search === q) return;
    const timer = setTimeout(() => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (search.trim()) next.set('q', search.trim());
          else next.delete('q');
          return next;
        },
        { replace: true },
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [search, q, setParams]);
  function open(target: string) {
    update({ path: target });
    setMobilePane('document');
  }
  const baseRoute = `/libraries/${kind}`;
  const reader = (
    <section className="library-reader" aria-label="文档阅读区" key={path}>
      <div className="library-reader-toolbar">
        <Button
          className="library-back"
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => setMobilePane('catalog')}
        >
          返回目录
        </Button>
        <span>{doc.data ? categoryName(doc.data.category) : title}</span>
        <Tag bordered={false}>文档阅读</Tag>
      </div>
      {doc.isPending ? (
        <div className="library-document">
          <Skeleton active paragraph={{ rows: 12 }} />
        </div>
      ) : doc.isError ? (
        <div className="library-document">
          <Alert
            type="error"
            showIcon
            message="无法打开文档"
            description={(doc.error as Error).message}
            action={
              <Button aria-label="重试" onClick={() => void doc.refetch()}>
                重试
              </Button>
            }
          />
        </div>
      ) : (
        doc.data && (
          <article className="library-document">
            <div className="library-document-path">{doc.data.path}</div>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                a: ({ href = '', children }) => {
                  const local = localResource(href, path);
                  if (local) {
                    if (/\.md$/i.test(local.path))
                      return (
                        <Link
                          to={`${baseRoute}?${new URLSearchParams({ path: local.path, ...(view === 'figures' ? { view } : {}) })}${local.hash}`}
                        >
                          {children}
                        </Link>
                      );
                    if (/\.(png|jpe?g|webp|gif|pdf)$/i.test(local.path))
                      return (
                        <a
                          href={api.libraryAsset(kind, local.path)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {children} ↗
                        </a>
                      );
                    return <span title="此链接的文件暂不支持网页预览">{children}</span>;
                  }
                  return (
                    <a
                      href={defaultUrlTransform(href)}
                      target={href.startsWith('#') ? undefined : '_blank'}
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  );
                },
                img: ({ src = '', alt }) => {
                  const local = localResource(src, path);
                  return local ? (
                    <img
                      src={api.libraryAsset(kind, local.path)}
                      alt={alt || '文档图片'}
                      loading="lazy"
                    />
                  ) : (
                    <span className="library-image-note">
                      {alt || '外部图片'}（外部图片请通过原文链接查看）
                    </span>
                  );
                },
              }}
            >
              {doc.data.content}
            </ReactMarkdown>
          </article>
        )
      )}
    </section>
  );
  return (
    <div className={`library-page ${kind === 'paradigms' ? 'library-graph-page' : ''}`}>
      <header className="library-heading">
        <div>
          <h1>
            <BookOutlined aria-hidden="true" /> {title}
          </h1>
          <p>
            {kind === 'paradigms'
              ? '从已有研究中，寻找问题、方法与验证路径。'
              : '连接数据、输入表示与建模方法，找到研究所需的资源。'}
          </p>
        </div>
        <div className="library-heading-actions">
          <span>{index.data?.total ?? '—'} 份文档</span>
          <Button
            size="small"
            type="text"
            icon={<ReloadOutlined />}
            aria-label="刷新资源库"
            onClick={() => {
              void index.refetch();
              setGraphRefresh((value) => value + 1);
              void doc.refetch();
            }}
          />
        </div>
      </header>
      {index.isError ? (
        <Alert
          type="error"
          showIcon
          message="资源库加载失败"
          description={(index.error as Error).message}
          action={
            <Button aria-label="重试" onClick={() => void index.refetch()}>
              重试
            </Button>
          }
        />
      ) : index.data && !index.data.available ? (
        <Empty description="资源库尚未配置，请联系管理员初始化内容。" />
      ) : kind === 'paradigms' ? (
        <>
          <div className="paradigm-view-tabs" role="tablist" aria-label="电池范式库视图">
            <button
              role="tab"
              aria-selected={view === 'graph'}
              onClick={() => update({ view: '' })}
            >
              关系图谱
            </button>
            <button
              role="tab"
              aria-selected={view === 'figures'}
              onClick={() => update({ view: 'figures' })}
            >
              论文图片
            </button>
          </div>
          {view === 'figures' ? (
            <PaperFigures refresh={graphRefresh} onOpen={open} />
          ) : (
            <ParadigmGraph selected={selected} onOpen={open} refresh={graphRefresh} />
          )}
          <Drawer
            title="范式文档"
            open={!!selected}
            onClose={() => update({ path: '' })}
            width="min(760px, 100vw)"
            className="paradigm-document-drawer"
            destroyOnClose
          >
            {reader}
          </Drawer>
        </>
      ) : (
        <div className={`library-layout library-pane-${mobilePane}`}>
          <aside className="library-catalog" aria-label={`${title}目录`}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="搜索标题或正文"
              value={search}
              allowClear
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="library-categories" aria-label="文档分类">
              <button
                className={!category ? 'selected' : ''}
                onClick={() => update({ category: '' })}
              >
                全部 <span>{index.data?.total ?? 0}</span>
              </button>
              {index.data?.categories.map((item) => (
                <button
                  key={item.id}
                  className={category === item.id ? 'selected' : ''}
                  onClick={() => update({ category: item.id })}
                >
                  {categoryName(item.id)} <span>{item.count}</span>
                </button>
              ))}
            </div>
            <div className="library-results-label">
              {q ? `“${q}” 的搜索结果` : '浏览文档'}
              <span>{index.data?.matched ?? 0}</span>
            </div>
            <div className="library-entry-list">
              {index.isPending ? (
                <Skeleton active paragraph={{ rows: 8 }} />
              ) : index.data?.items.length ? (
                index.data.items.map((entry) => (
                  <button
                    key={entry.path}
                    className={`library-entry spotlight ${path === entry.path ? 'selected' : ''}`}
                    onClick={() => open(entry.path)}
                  >
                    <span className="library-entry-category">
                      <FileTextOutlined /> {categoryName(entry.category)}
                    </span>
                    <strong>{entry.title}</strong>
                    <p>{entry.excerpt}</p>
                  </button>
                ))
              ) : (
                <Empty
                  description="没有匹配的文档，试试其他关键词或分类。"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
              {index.data?.truncated && (
                <Alert type="info" message="目录仅展示部分结果，请搜索或选择分类缩小范围。" />
              )}
            </div>
          </aside>
          {reader}
        </div>
      )}
    </div>
  );
}

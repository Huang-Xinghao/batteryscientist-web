import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Button, InputNumber, Spin, Tooltip } from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DownloadOutlined,
  ExportOutlined,
  MinusOutlined,
  PlusOutlined,
  ColumnWidthOutlined,
} from '@ant-design/icons';
import {
  GlobalWorkerOptions,
  getDocument,
  TextLayer,
  type PDFDocumentProxy,
  type PDFPageProxy,
} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { api } from '../../api/client';
import './pdf-reader.css';

GlobalWorkerOptions.workerSrc = workerUrl;

function PdfPage({
  document,
  number,
  scale,
}: {
  document: PDFDocumentProxy;
  number: number;
  scale: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [page, setPage] = useState<PDFPageProxy>();
  const [error, setError] = useState('');
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const preload = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
      },
      { rootMargin: '600px' },
    );
    preload.observe(element);
    return () => {
      preload.disconnect();
    };
  }, [number]);
  useEffect(() => {
    if (!visible) return;
    let disposed = false;
    document.getPage(number).then(
      (page) => {
        if (!disposed) setPage(page);
      },
      (error) => {
        if (!disposed) setError(String(error));
      },
    );
    return () => {
      disposed = true;
    };
  }, [document, number, visible]);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    delete element.dataset.rendered;
    if (!visible) {
      element.width = 0;
      element.height = 0;
      return;
    }
    if (!page) return;
    const viewport = page.getViewport({ scale });
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    element.width = Math.ceil(viewport.width * ratio);
    element.height = Math.ceil(viewport.height * ratio);
    const task = page.render({ canvas: element, viewport, transform: [ratio, 0, 0, ratio, 0, 0] });
    task.promise.then(
      () => {
        element.dataset.rendered = 'true';
      },
      (error) => {
        if (error.name !== 'RenderingCancelledException') setError(String(error));
      },
    );
    return () => task.cancel();
  }, [page, scale, visible]);
  useEffect(() => {
    const container = text.current;
    if (!container) return;
    container.replaceChildren();
    if (!page || !visible) return;
    container.style.setProperty('--total-scale-factor', String(scale));
    const layer = new TextLayer({
      textContentSource: page.streamTextContent(),
      container,
      viewport: page.getViewport({ scale }),
    });
    layer.render().catch(() => {});
    return () => layer.cancel();
  }, [page, scale, visible]);
  const viewport = page?.getViewport({ scale });
  return (
    <div
      ref={root}
      className="paper-pdf-page"
      data-page={number}
      style={{ aspectRatio: viewport ? `${viewport.width}/${viewport.height}` : '210/297' }}
    >
      <canvas ref={canvas} role="img" aria-label={`PDF 第 ${number} 页`} />
      <div ref={text} className="paper-pdf-text" />
      {error && <span className="paper-pdf-page-error">此页加载失败，请重新打开 PDF</span>}
    </div>
  );
}

export default function PdfReader({
  projectId,
  path,
  modified = 0,
  onSource,
  heading,
}: {
  projectId: string;
  path: string;
  modified?: number;
  onSource?: () => void;
  heading?: ReactNode;
}) {
  const [document, setDocument] = useState<PDFDocumentProxy>();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [current, setCurrent] = useState(1);
  const [zoom, setZoom] = useState<number | 'fit'>('fit');
  const [width, setWidth] = useState(600);
  const [pageWidth, setPageWidth] = useState(595);
  const root = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const url = `${api.download(projectId, path)}&v=${modified}`;
  useEffect(() => {
    let disposed = false;
    setDocument(undefined);
    setError('');
    setCurrent(1);
    const task = getDocument({ url, isEvalSupported: false });
    task.promise
      .then(async (document) => {
        const first = await document.getPage(1);
        if (!disposed) {
          setPageWidth(first.getViewport({ scale: 1 }).width);
          setDocument(document);
        }
      })
      .catch((error) => {
        if (!disposed) setError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      disposed = true;
      void task.destroy();
    };
  }, [url, attempt]);
  useEffect(() => {
    const element = scroll.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const scale = zoom === 'fit' ? Math.min(1.6, Math.max(0.2, (width - 40) / pageWidth)) : zoom;
  function go(number: number) {
    const next = Math.max(1, Math.min(document?.numPages || 1, number));
    setCurrent(next);
    const container = scroll.current;
    const target = container?.querySelector<HTMLElement>(`[data-page="${next}"]`);
    if (container && target) {
      container.scrollTo({
        top:
          container.scrollTop +
          target.getBoundingClientRect().top -
          container.getBoundingClientRect().top,
      });
    }
  }
  return (
    <section ref={root} className="paper-pdf-reader pdf-preview" aria-label="PDF 阅读器">
      <header className="paper-pdf-heading">
        <div className="paper-pdf-identity">
          {heading || (
            <>
              <span className="paper-pdf-badge">PDF</span>
              <span title={path}>{path.split('/').pop()}</span>
            </>
          )}
        </div>
        <div className="paper-pdf-actions">
          {onSource && (
            <Button size="small" type="text" onClick={onSource}>
              LaTeX 源码
            </Button>
          )}
          <Tooltip title="下载 PDF">
            <Button
              size="small"
              type="text"
              aria-label="下载 PDF"
              icon={<DownloadOutlined />}
              href={api.download(projectId, path)}
              download
            />
          </Tooltip>
          <Tooltip title="在新标签页打开">
            <Button
              size="small"
              type="text"
              aria-label="在新标签页打开 PDF"
              icon={<ExportOutlined />}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            />
          </Tooltip>
        </div>
      </header>
      <div className="paper-pdf-controls">
        <div className="paper-pdf-pagination">
          <Button
            size="small"
            type="text"
            aria-label="PDF 上一页"
            disabled={!document || current <= 1}
            icon={<ArrowUpOutlined />}
            onClick={() => go(current - 1)}
          />
          <InputNumber
            size="small"
            aria-label="PDF 页码"
            min={1}
            max={document?.numPages || 1}
            value={current}
            controls={false}
            disabled={!document}
            onChange={(value) => {
              if (value) go(value);
            }}
          />
          <span>/ {document?.numPages || '—'}</span>
          <Button
            size="small"
            type="text"
            aria-label="PDF 下一页"
            disabled={!document || current >= document.numPages}
            icon={<ArrowDownOutlined />}
            onClick={() => go(current + 1)}
          />
        </div>
        <div className="paper-pdf-zoom">
          <Button
            size="small"
            type="text"
            aria-label="缩小 PDF"
            disabled={scale <= 0.3}
            icon={<MinusOutlined />}
            onClick={() => setZoom(Math.max(0.25, Math.round((scale - 0.15) * 100) / 100))}
          />
          <span>{Math.round(scale * 100)}%</span>
          <Button
            size="small"
            type="text"
            aria-label="放大 PDF"
            disabled={scale >= 3}
            icon={<PlusOutlined />}
            onClick={() => setZoom(Math.min(3, Math.round((scale + 0.15) * 100) / 100))}
          />
          <Tooltip title="适应宽度">
            <Button
              size="small"
              type="text"
              aria-label="PDF 适应宽度"
              aria-pressed={zoom === 'fit'}
              icon={<ColumnWidthOutlined />}
              onClick={() => setZoom('fit')}
            />
          </Tooltip>
        </div>
      </div>
      <div
        ref={scroll}
        className="paper-pdf-scroll"
        tabIndex={0}
        aria-label="PDF 文档页面"
        onScroll={() => {
          const element = scroll.current;
          if (!element) return;
          const bounds = element.getBoundingClientRect();
          let largest = 0;
          let page: HTMLElement | undefined;
          for (const candidate of element.querySelectorAll<HTMLElement>('[data-page]')) {
            const rect = candidate.getBoundingClientRect();
            const visible = Math.max(
              0,
              Math.min(rect.bottom, bounds.bottom) - Math.max(rect.top, bounds.top),
            );
            if (visible > largest) {
              largest = visible;
              page = candidate;
            }
          }
          if (page) setCurrent(Number(page.dataset.page));
        }}
      >
        {error ? (
          <Alert
            type="error"
            showIcon
            message="PDF 暂时无法预览"
            description="请重试，或在新标签页打开原文件。"
            action={
              <Button size="small" onClick={() => setAttempt((value) => value + 1)}>
                重试
              </Button>
            }
          />
        ) : document ? (
          <div className="paper-pdf-pages" style={{ width: `${pageWidth * scale}px` }}>
            {Array.from({ length: document.numPages }, (_, index) => (
              <PdfPage
                key={`${url}:${attempt}:${index}`}
                document={document}
                number={index + 1}
                scale={scale}
              />
            ))}
          </div>
        ) : (
          <div className="paper-pdf-loading">
            <Spin />
            <span>正在载入论文</span>
          </div>
        )}
      </div>
      <footer className="paper-pdf-footer">
        <span>{path}</span>
        <span>{document ? `${document.numPages} 页` : 'PDF'}</span>
      </footer>
    </section>
  );
}

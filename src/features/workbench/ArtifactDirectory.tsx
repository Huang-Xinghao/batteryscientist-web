import { useMemo, useState } from 'react';
import { TreeSelect } from 'antd';
import {
  CodeOutlined,
  DatabaseOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import type { ProjectFile } from '../../api/client';
import './directory.css';
import { artifactCategory } from './artifactCategories';

const categories = [
  { id: 'paper', label: '论文与 LaTeX', icon: <FileTextOutlined /> },
  { id: 'figures', label: '图表与图片', icon: <FileImageOutlined /> },
  { id: 'references', label: '参考文献', icon: <FilePdfOutlined /> },
  { id: 'reports', label: '研究报告与计划', icon: <FolderOpenOutlined /> },
  { id: 'data', label: '实验数据与结果', icon: <DatabaseOutlined /> },
  { id: 'code', label: '代码与配置', icon: <CodeOutlined /> },
  { id: 'logs', label: '运行记录与日志', icon: <HistoryOutlined /> },
  { id: 'other', label: '其他文件', icon: <FolderOutlined /> },
];
type DirectoryNode = {
  key: string;
  value: string;
  title: ReactNode;
  searchPath: string;
  selectable?: boolean;
  children?: DirectoryNode[];
};
function fileIcon(path: string) {
  if (/\.pdf$/i.test(path)) return <FilePdfOutlined />;
  if (/\.(png|jpe?g|webp|svg)$/i.test(path)) return <FileImageOutlined />;
  if (/\.(py|sh|json|ya?ml|toml)$/i.test(path)) return <CodeOutlined />;
  return <FileTextOutlined />;
}
export function ArtifactDirectory({
  files,
  value,
  onChange,
  truncated,
}: {
  files: ProjectFile[];
  value: string;
  onChange: (path: string) => void;
  truncated?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string[]>(
    categories.map((group) => `group:${group.id}`),
  );
  const tree = useMemo(
    () =>
      categories.flatMap((group) => {
        const entries = files.filter((file) => artifactCategory(file.path) === group.id);
        if (!entries.length) return [];
        const root: DirectoryNode = {
          key: `group:${group.id}`,
          value: `group:${group.id}`,
          selectable: false,
          searchPath: group.label,
          title: (
            <span className="directory-group">
              {group.icon}
              <strong>{group.label}</strong>
              <small>{entries.length}</small>
            </span>
          ),
          children: [],
        };
        const folders = new Map<string, DirectoryNode>();
        for (const file of [...entries].sort((a, b) =>
          a.path.localeCompare(b.path, 'zh-CN', { numeric: true }),
        )) {
          const parts = file.path.split('/');
          let parent = root;
          for (let i = 0; i < parts.length - 1; i++) {
            const prefix = parts.slice(0, i + 1).join('/');
            let folder = folders.get(prefix);
            if (!folder) {
              folder = {
                key: `${group.id}:${prefix}`,
                value: `${group.id}:${prefix}`,
                selectable: false,
                searchPath: prefix,
                title: (
                  <span className="directory-folder">
                    <FolderOutlined />
                    {parts[i]}
                  </span>
                ),
                children: [],
              };
              folders.set(prefix, folder);
              parent.children!.push(folder);
            }
            parent = folder;
          }
          parent.children!.push({
            key: file.path,
            value: file.path,
            searchPath: `${group.label} ${file.path}`,
            title: (
              <span className="directory-file" title={file.path}>
                {fileIcon(file.path)}
                <span>{parts.at(-1)}</span>
              </span>
            ),
          });
        }
        return [root];
      }),
    [files],
  );
  const searchExpanded = useMemo(() => {
    const keys: string[] = [];
    const visit = (nodes: DirectoryNode[]) => {
      for (const node of nodes)
        if (node.children) {
          keys.push(node.key);
          visit(node.children);
        }
    };
    visit(tree);
    return keys;
  }, [tree]);
  return (
    <TreeSelect
      className="artifact-directory"
      aria-label="选择项目文件"
      placeholder="按目录查找产物"
      value={value || undefined}
      onChange={(path) => {
        setSearch('');
        onChange(path);
      }}
      searchValue={search}
      onSearch={setSearch}
      showSearch
      treeLine
      treeData={tree}
      treeExpandedKeys={search ? searchExpanded : expanded}
      onTreeExpand={(keys) => setExpanded(keys.map(String))}
      filterTreeNode={(input, node) =>
        String(node.searchPath).toLowerCase().includes(input.toLowerCase())
      }
      treeNodeLabelProp="value"
      listHeight={420}
      popupClassName="artifact-directory-popup"
      popupMatchSelectWidth={false}
      dropdownRender={(menu) => (
        <div>
          <div className="directory-caption">
            <FolderOpenOutlined />
            产物目录<span>{files.length} 个文件</span>
          </div>
          {menu}
          <div className="directory-hint">
            {truncated ? '目录仅显示前 5000 个文件' : '按类型分类 · 保留原始文件夹结构'} ·
            支持路径搜索
          </div>
        </div>
      )}
      notFoundContent="没有匹配的产物"
    />
  );
}

import { useMemo, useState } from 'react';
import { TreeSelect } from 'antd';
import {
  FileImageOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import type { ProjectFile } from '../../api/client';
import './directory.css';
import { artifactStages, artifactStage, stageArtifacts } from './artifactStages';

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
    artifactStages.map((group) => `group:${group.id}`),
  );
  const tree = useMemo(
    () =>
      artifactStages.flatMap((group) => {
        const entries = files.filter((file) => artifactStage(file.path) === group.id);
        if (!entries.length) return [];
        const root: DirectoryNode = {
          key: `group:${group.id}`,
          value: `group:${group.id}`,
          selectable: false,
          searchPath: group.label,
          title: (
            <span className="directory-group">
              <FolderOpenOutlined />
              <strong>{group.label}</strong>
              <small>{entries.length}</small>
            </span>
          ),
          children: [],
        };
        for (const file of [...entries].sort((a, b) =>
          a.path.localeCompare(b.path, 'zh-CN', { numeric: true }),
        )) {
          const parts = file.path.split('/');
          root.children!.push({
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
      placeholder="按研究阶段选择产物"
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
      treeNodeLabelProp="title"
      listHeight={420}
      popupClassName="artifact-directory-popup"
      popupMatchSelectWidth={false}
      dropdownRender={(menu) => (
        <div>
          <div className="directory-caption">
            <FolderOpenOutlined />
            阶段产物<span>{stageArtifacts(files).length} 个产物</span>
          </div>
          {menu}
          <div className="directory-hint">
            {truncated ? '文件列表尚未完整加载 · ' : ''}按研究阶段分组 · 支持文件名搜索
          </div>
        </div>
      )}
      notFoundContent="没有匹配的产物"
    />
  );
}

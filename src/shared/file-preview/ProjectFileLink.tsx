import type { ReactNode } from 'react';
import { api } from '../../api/client';
import { projectFilePath } from './projectLink';

export function ProjectFileLink({
  projectId,
  projectRoot,
  report,
  href,
  title,
  children,
  onOpen,
}: {
  projectId: string;
  projectRoot?: string;
  report?: string;
  href?: string;
  title?: string;
  children?: ReactNode;
  onOpen?: (path: string) => void;
}) {
  const path = projectFilePath(href, projectRoot, report);
  return (
    <a
      href={path ? api.download(projectId, path) : href}
      title={title}
      target={(path && onOpen) || href?.startsWith('#') ? undefined : '_blank'}
      rel="noopener noreferrer"
      onClick={(event) => {
        if (
          path &&
          onOpen &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          !event.altKey
        ) {
          event.preventDefault();
          onOpen(path);
        }
      }}
    >
      {children}
    </a>
  );
}

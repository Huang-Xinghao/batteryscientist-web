import type { ProjectFile } from '../../api/client';
import { isImagePath } from './display';
import { projectFilePath } from './projectLink';

export function projectImageFile(
  src: string | undefined,
  files: ProjectFile[],
  projectRoot = '',
  report = '',
) {
  const candidates = [
    projectFilePath(src, projectRoot, src?.startsWith('/') ? '' : report),
    projectFilePath(src, projectRoot),
  ];
  for (const path of candidates) {
    if (!path || !isImagePath(path)) continue;
    const file = files.find((file) => file.path === path);
    if (file) return file;
  }
}

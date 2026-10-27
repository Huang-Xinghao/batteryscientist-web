// Adapted from StoraGent/frontend/src/shared/artifacts/filePreview.ts (MIT).
// Copyright (c) 2026 StoraGent Team. See STORAGENT-LICENSE.txt.
import { isImagePath } from './display';

/** Images in the same directory, with stable natural ordering for preview navigation. */
export function siblingImages<T extends { path: string }>(path: string, files: readonly T[]): T[] {
  const dirname = (value: string) => value.slice(0, Math.max(value.lastIndexOf('/'), 0));
  return files
    .filter((file) => isImagePath(file.path) && dirname(file.path) === dirname(path))
    .sort((a, b) => a.path.localeCompare(b.path, 'zh-CN', { numeric: true }));
}

// Adapted from StoraGent/frontend/src/shared/artifacts/artifactDisplay.ts (MIT).
// Copyright (c) 2026 StoraGent Team. See STORAGENT-LICENSE.txt.
export function formatArtifactSize(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
export const isImagePath = (path: string) => /\.(png|jpe?g|webp|gif)$/i.test(path);

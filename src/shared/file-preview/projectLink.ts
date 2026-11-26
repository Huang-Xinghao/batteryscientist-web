/** Resolve Markdown file references independently of the current browser route. */
export function projectFilePath(href: string | undefined, projectRoot = '', report = '') {
  if (!href || /^(?:[a-z][a-z\d+.-]*:|\/\/|[?#])/i.test(href)) return undefined;
  try {
    let reference = decodeURIComponent(href.split(/[?#]/)[0]);
    const root = projectRoot.replace(/\/$/, '');
    if (root && reference.startsWith(`${root}/`)) reference = reference.slice(root.length + 1);
    if (reference.startsWith('/api/')) return undefined;
    const parts: string[] = reference.startsWith('/') ? [] : report.split('/').slice(0, -1);
    for (const part of reference.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') {
        if (!parts.length) return undefined;
        parts.pop();
      } else {
        parts.push(part);
      }
    }
    const path = parts.join('/');
    return /\.[a-z\d]+$/i.test(path) ? path : undefined;
  } catch {
    return undefined;
  }
}

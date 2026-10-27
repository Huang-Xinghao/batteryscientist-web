// Classify by purpose first so figure sources and rendered figures stay together.
export function artifactCategory(path: string) {
  const normalized = path.replaceAll('\\', '/').toLowerCase();
  if (/(?:^|\/)(?:figures?|figs|images?|plots?|charts?)(?:\/|$)/.test(normalized)) return 'figures';
  if (/\.(?:png|jpe?g|webp|gif|svg|eps|tiff?|bmp|avif|ico)$/.test(normalized)) return 'figures';
  if (/^(?:papers|references|literature\/papers)\//.test(normalized)) return 'references';
  if (/\.pdf$/.test(normalized)) {
    if (/^paper\//.test(normalized) || !normalized.includes('/')) return 'paper';
    return 'references';
  }
  if (
    /^(?:experiment-runs|\.paper-agent)\//.test(normalized) ||
    /(?:\.log|\.jsonl)$|(?:^|\/)(?:workflow-|experiment-queue-)/.test(normalized)
  )
    return 'logs';
  if (/\.(?:tex|bib|cls|sty)$/.test(normalized)) return 'paper';
  if (/\.(?:md|txt|docx?)$/.test(normalized)) return 'reports';
  if (
    /^(?:results|smoke-results|data|data-search\/datasets)\//.test(normalized) ||
    /\.(?:csv|tsv|parquet|npy|npz|h5|hdf5|xlsx?)$/.test(normalized)
  )
    return 'data';
  if (/\.(?:py|ipynb|sh|r|js|ts|json|ya?ml|toml|ini|cfg)$/.test(normalized)) return 'code';
  return 'other';
}

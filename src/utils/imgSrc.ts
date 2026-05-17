export function imgSrc(path: string, basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''): string {
  if (/^https?:\/\//.test(path)) return path;
  const base = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  return `${base}${path}`;
}

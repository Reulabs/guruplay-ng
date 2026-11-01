export function restoreApiUrl(requestUrl) {
  const url = new URL(requestUrl, "http://localhost");
  const route = url.searchParams.get("__route");
  if (url.pathname === "/api/music" && route !== null)
    url.pathname = `/api/v1/${route}`;
  url.searchParams.delete("__route");
  return `${url.pathname}${url.search}`;
}

export function restoreApiUrl(
  requestUrl,
  { apiPrefix = "/api/v1/", functionPath = "/api/music" } = {},
) {
  const url = new URL(requestUrl, "http://localhost");
  const route = url.searchParams.get("__route");
  if (url.pathname === functionPath && route !== null)
    url.pathname = `${apiPrefix}${route}`;
  url.searchParams.delete("__route");
  return `${url.pathname}${url.search}`;
}

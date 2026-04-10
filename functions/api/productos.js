export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;

  if (method !== 'GET' || url.pathname !== '/api/productos') {
    return context.next();
  }

  if (request.headers.has('Authorization')) {
    const backendUrl = env.API_BACKEND_URL || 'https://mpagina.onrender.com';
    return fetch(`${backendUrl}${url.pathname}${url.search}`, request);
  }

  const vendorEmail = request.headers.get('X-Vendor-Email');
  if (!vendorEmail) {
    const backendUrl = env.API_BACKEND_URL || 'https://mpagina.onrender.com';
    return fetch(`${backendUrl}${url.pathname}${url.search}`, request);
  }

  // ✅ Construir URL de caché sin el parámetro '_'
  const cacheUrl = new URL(url);
  cacheUrl.searchParams.delete('_');
  const cacheKey = new Request(
    `${cacheUrl.toString()}&vendor=${vendorEmail}`,
    request
  );
  const cache = caches.default;

  // 1. Intentar obtener de caché
  let cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    console.log(`🎯 CACHE HIT for ${vendorEmail}`);
    const response = new Response(cachedResponse.body, cachedResponse);
    response.headers.set('X-Cache-Worker', 'HIT');
    return response;
  }

  console.log(`🔄 CACHE MISS for ${vendorEmail}, fetching from Render`);

  // 2. Consultar a Render
  const backendUrl = env.API_BACKEND_URL || 'https://mpagina.onrender.com';
  const backendResponse = await fetch(`${backendUrl}${url.pathname}${url.search}`, request);

  if (!backendResponse.ok) {
    return backendResponse;
  }

  // 3. Limpiar headers
  const cleanHeaders = new Headers(backendResponse.headers);
  cleanHeaders.delete('set-cookie');
  cleanHeaders.set('vary', 'Accept-Encoding');

  const responseToCache = new Response(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: cleanHeaders
  });

  responseToCache.headers.set('Cache-Control', 'public, max-age=300');
  responseToCache.headers.set('Cache-Tag', `vendor-${vendorEmail}`);
  responseToCache.headers.set('X-Cache-Worker', 'MISS');

  // 4. Guardar en caché
  context.waitUntil(cache.put(cacheKey, responseToCache.clone()));

  return responseToCache;
}

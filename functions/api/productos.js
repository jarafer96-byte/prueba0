export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;

  if (method !== 'GET' || url.pathname !== '/api/productos') {
    return context.next();
  }

  // 管理员请求不缓存
  if (request.headers.has('Authorization')) {
    const backendUrl = env.API_BACKEND_URL || 'https://mpagina.onrender.com';
    return fetch(`${backendUrl}${url.pathname}${url.search}`, request);
  }

  const vendorEmail = request.headers.get('X-Vendor-Email');
  if (!vendorEmail) {
    const backendUrl = env.API_BACKEND_URL || 'https://mpagina.onrender.com';
    return fetch(`${backendUrl}${url.pathname}${url.search}`, request);
  }

  const cacheKey = new Request(`${url.toString()}&vendor=${vendorEmail}`, request);
  const cache = caches.default;

  // ✅ 1. Intentar obtener de la caché del Worker, ignorando los headers de la petición
  let cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    console.log(`🎯 CACHE HIT (ignoring request cache-control) for ${vendorEmail}`);
    // Clonar para poder añadir cabeceras de diagnóstico
    const response = new Response(cachedResponse.body, cachedResponse);
    response.headers.set('X-Cache-Worker', 'HIT');
    return response;
  }

  console.log(`🔄 CACHE MISS for ${vendorEmail}, fetching from Render`);

  // 2. Si no está en caché, consultar a Render
  const backendUrl = env.API_BACKEND_URL || 'https://mpagina.onrender.com';
  const backendResponse = await fetch(`${backendUrl}${url.pathname}${url.search}`, request);

  if (!backendResponse.ok) {
    return backendResponse;
  }

  // 3. Limpiar cabeceras problemáticas
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

  // 4. Guardar en caché para futuras peticiones
  context.waitUntil(cache.put(cacheKey, responseToCache.clone()));

  return responseToCache;
}

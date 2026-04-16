export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;

  // Solo procesar GET /api/productos
  if (method !== 'GET' || url.pathname !== '/api/productos') {
    return context.next();
  }

  // ⭐ PURGA DE CACHÉ DEL WORKER
  if (request.headers.get('X-Purge-Cache') === 'true') {
    const vendorEmail = request.headers.get('X-Vendor-Email') || 'default';
    const cacheUrl = new URL(url);
    cacheUrl.searchParams.delete('_');
    cacheUrl.searchParams.set('vendor', vendorEmail);
    const cacheKey = new Request(cacheUrl.toString());
    const cache = caches.default;
    await cache.delete(cacheKey);
    console.log(`🧹 Cache purged for ${vendorEmail}`);
    return new Response('Cache purged', { status: 200 });
  }

  // Si la petición tiene Authorization, es un admin -> ir directo a Render (sin caché)
  if (request.headers.has('Authorization')) {
    const backendUrl = env.API_BACKEND_URL || 'https://mpagina.onrender.com';
    return fetch(`${backendUrl}${url.pathname}${url.search}`, request);
  }

  const vendorEmail = request.headers.get('X-Vendor-Email');
  if (!vendorEmail) {
    const backendUrl = env.API_BACKEND_URL || 'https://mpagina.onrender.com';
    return fetch(`${backendUrl}${url.pathname}${url.search}`, request);
  }

  // Construir URL de caché limpia (sin parámetros aleatorios, con vendor fijo)
  const cacheUrl = new URL(url);
  cacheUrl.searchParams.delete('_');
  cacheUrl.searchParams.set('vendor', vendorEmail);

  // Crear Request solo con la URL, sin headers (para clave de caché)
  const cacheKey = new Request(cacheUrl.toString());
  const cache = caches.default;

  // 1. Intentar obtener de caché del Worker
  let cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    console.log(`🎯 CACHE HIT for ${vendorEmail}`);
    const response = new Response(cachedResponse.body, cachedResponse);
    // Forzar al navegador a no cachear la respuesta
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
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

  // 3. Limpiar headers problemáticos (set-cookie) y ajustar Vary
  const cleanHeaders = new Headers(backendResponse.headers);
  cleanHeaders.delete('set-cookie');
  cleanHeaders.set('vary', 'Accept-Encoding');

  const responseToCache = new Response(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: cleanHeaders
  });

  // Headers para la caché del Worker (interna)
  responseToCache.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
  responseToCache.headers.set('Cache-Tag', `vendor-${vendorEmail}`);
  responseToCache.headers.set('X-Cache-Worker', 'MISS');

  // 4. Guardar en caché del Worker
  context.waitUntil(cache.put(cacheKey, responseToCache.clone()));

  // 5. Clonar la respuesta para el navegador y agregar headers de no-caché
  const clientResponse = new Response(responseToCache.body, responseToCache);
  clientResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  clientResponse.headers.set('Pragma', 'no-cache');
  clientResponse.headers.set('Expires', '0');

  return clientResponse;
}

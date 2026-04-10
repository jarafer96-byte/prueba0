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

  const cacheKey = new Request(`${url.toString()}&vendor=${vendorEmail}`, request);
  const cache = caches.default;

  // 1. Intentar devolver desde caché
  let response = await cache.match(cacheKey);
  if (response) {
    return response;
  }

  // 2. Consultar al backend
  const backendUrl = env.API_BACKEND_URL || 'https://mpagina.onrender.com';
  const backendResponse = await fetch(`${backendUrl}${url.pathname}${url.search}`, request);

  if (!backendResponse.ok) {
    return backendResponse;
  }

  // 3. Crear una respuesta limpia sin cookies y con Vary reducido
  const cleanHeaders = new Headers(backendResponse.headers);
  cleanHeaders.delete('set-cookie');                // Eliminar cualquier cookie
  cleanHeaders.set('vary', 'Accept-Encoding');      // Simplificar Vary (o eliminar)

  const cachedResponse = new Response(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: cleanHeaders
  });

  cachedResponse.headers.set('Cache-Control', 'public, max-age=300');
  cachedResponse.headers.set('Cache-Tag', `vendor-${vendorEmail}`);

  // 4. Guardar en caché (sin esperar)
  context.waitUntil(cache.put(cacheKey, cachedResponse.clone()));

  return cachedResponse;
}

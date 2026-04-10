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

  // 🔁 Intentar obtener de caché primero, ignorando los headers de la petición
  let response = await cache.match(cacheKey);
  if (response) {
    return response;
  }

  // No está en caché: consultar a Render
  const backendUrl = env.API_BACKEND_URL || 'https://mpagina.onrender.com';
  response = await fetch(`${backendUrl}${url.pathname}${url.search}`, request);

  if (response.ok) {
    const clonedResponse = new Response(response.body, response);
    clonedResponse.headers.set('Cache-Control', 'public, max-age=300');
    clonedResponse.headers.set('Cache-Tag', `vendor-${vendorEmail}`);
    context.waitUntil(cache.put(cacheKey, clonedResponse.clone()));
    return clonedResponse;
  }

  return response;
}

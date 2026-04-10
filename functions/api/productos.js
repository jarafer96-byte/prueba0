// functions/api/productos.js
export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const method = request.method;

  // Solo cachear GET /api/productos
  if (method !== 'GET' || url.pathname !== '/api/productos') {
    return next();
  }

  // No cachear si es una petición de administrador (tiene token JWT)
  if (request.headers.has('Authorization')) {
    const backendUrl = env.API_BACKEND_URL || 'https://mpagina.onrender.com';
    return fetch(`${backendUrl}${url.pathname}${url.search}`, request);
  }

  // Obtener el email del vendedor (necesario para la clave de caché)
  const vendorEmail = request.headers.get('X-Vendor-Email');
  if (!vendorEmail) {
    const backendUrl = env.API_BACKEND_URL || 'https://mpagina.onrender.com';
    return fetch(`${backendUrl}${url.pathname}${url.search}`, request);
  }

  // Construir clave de caché única por email
  const cacheKey = new Request(
    `${url.toString()}&vendor=${vendorEmail}`,
    request
  );
  const cache = caches.default;

  // Intentar obtener respuesta desde caché
  let response = await cache.match(cacheKey);
  if (!response) {
    const backendUrl = env.API_BACKEND_URL || 'https://mpagina.onrender.com';
    response = await fetch(`${backendUrl}${url.pathname}${url.search}`, request);

    // ✅ Solo cachear si la respuesta es exitosa (2xx)
    if (response.ok) {
      // Clonar la respuesta para poder modificar headers
      const clonedResponse = new Response(response.body, response);
      clonedResponse.headers.set('Cache-Control', 'public, max-age=300');
      clonedResponse.headers.set('Cache-Tag', `vendor-${vendorEmail}`);

      // Almacenar en caché de Cloudflare (sin bloquear la respuesta)
      context.waitUntil(cache.put(cacheKey, clonedResponse.clone()));

      // Opcional: log en consola de Functions
      // console.log(`✅ Cache MISS para ${vendorEmail} (status: ${response.status})`);

      return clonedResponse;
    } else {
      // No cachear errores; devolver la respuesta original
      // console.warn(`⚠️ No se cachea respuesta ${response.status} para ${vendorEmail}`);
      return response;
    }
  }

  // Opcional: log de HIT
  // console.log(`🎯 Cache HIT para ${vendorEmail}`);
  return response;
}

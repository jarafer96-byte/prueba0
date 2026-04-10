// functions/api/productos.js
export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const method = request.method;

  // Solo cachear GET /api/productos
  if (method !== 'GET' || url.pathname !== '/api/productos') {
    return next(); // No debería llegar aquí por el enrutamiento, pero por seguridad
  }

  // No cachear si es una petición de administrador (tiene token JWT)
  if (request.headers.has('Authorization')) {
    // Reenviar directamente a Render sin cachear
    const backendUrl = env.API_BACKEND_URL || 'https://mpagina.onrender.com';
    return fetch(`${backendUrl}${url.pathname}${url.search}`, request);
  }

  // Obtener el email del vendedor (necesario para la clave de caché)
  const vendorEmail = request.headers.get('X-Vendor-Email');
  if (!vendorEmail) {
    // Si no hay email, reenviar a Render (no cachear)
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
    // Consultar a Render
    const backendUrl = env.API_BACKEND_URL || 'https://mpagina.onrender.com';
    response = await fetch(`${backendUrl}${url.pathname}${url.search}`, request);
    // Clonar para poder modificar headers
    response = new Response(response.body, response);
    // Establecer TTL de 5 minutos (300 segundos)
    response.headers.set('Cache-Control', 'public, max-age=300');
    // Opcional: agregar un tag para purga granular (si se usa)
    response.headers.set('Cache-Tag', `vendor-${vendorEmail}`);
    // Almacenar en caché de Cloudflare
    context.waitUntil(cache.put(cacheKey, response.clone()));
  }

  // Devolver respuesta (desde caché o desde Render)
  return response;
}

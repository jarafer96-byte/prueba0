// functions/_middleware.js

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Lista de rutas que deben ir al backend
  const backendRoutes = [
    '/api/',
    '/pagar',
    '/verificar-stock',
    '/login-admin',
    '/guardar-producto',
    '/eliminar-producto',
    '/subir-foto',
    '/conectar_mp',
    '/actualizar-stock-talle',
    '/guardar-talles-stock',
    '/callback_mp'
  ];

  // Determinar si la ruta actual debe ser manejada por el backend
  const shouldGoToBackend = backendRoutes.some(route =>
    path === route || (route.endsWith('/') && path.startsWith(route))
  );

  // Manejar preflight OPTIONS (necesario para CORS con credenciales)
  if (method === 'OPTIONS' && shouldGoToBackend) {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Vendor-Email, X-CSRF-Token',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  // Si la ruta es del backend, redirigir a Render
  if (shouldGoToBackend) {
    const backendUrl = `https://mpagina.onrender.com${path}${url.search}`;
    
    // Copiar cabeceras originales (incluye Cookie, etc.)
    const headers = new Headers(request.headers);
    // No elimines 'origin' porque lo usaremos para CORS; pero lo dejamos.
    // Si quieres eliminar alguna cabecera problemática, puedes hacerlo.
    
    const newRequest = new Request(backendUrl, {
      method: method,
      headers: headers,
      body: request.body,
      redirect: 'follow'
    });
    
    // Obtener respuesta del backend
    const response = await fetch(newRequest);
    
    // Preparar cabeceras de respuesta con CORS adecuado
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*');
    responseHeaders.set('Access-Control-Allow-Credentials', 'true');
    // Exponer cabeceras personalizadas al frontend
    responseHeaders.set('Access-Control-Expose-Headers', 'Content-Type, X-Vendor-Email');
    
    // Devolver la respuesta modificada
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  }

  // Para el resto de rutas (archivos estáticos), continuar normalmente
  return next();
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;
  const method = context.request.method;

  // Rutas que deben ir al backend (incluye todas las que usas)
  const backendRoutes = [
    '/api/',               // cualquier ruta que empiece con /api/
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

  // Determinar si la petición debe ir al backend
  const shouldGoToBackend = backendRoutes.some(route => 
    path === route || (route.endsWith('/') && path.startsWith(route))
  );

  // Manejar preflight OPTIONS (necesario para credenciales y cabeceras personalizadas)
  if (method === 'OPTIONS' && shouldGoToBackend) {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': context.request.headers.get('origin') || '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Vendor-Email, X-CSRF-Token',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  if (shouldGoToBackend) {
    const backendUrl = `https://mpagina.onrender.com${path}${url.search}`;
    
    // Reenviar la petición con las mismas cabeceras y cuerpo
    const newRequest = new Request(backendUrl, {
      method: method,
      headers: context.request.headers,   // Conserva todas las cabeceras (incluye Cookie)
      body: context.request.body,
      redirect: 'follow'
    });
    
    // Obtener respuesta del backend
    const response = await fetch(newRequest);
    
    // Crear una nueva respuesta con las cabeceras originales + CORS
    const responseHeaders = new Headers(response.headers);
    // Añadir cabeceras CORS para que el navegador acepte la respuesta con credenciales
    responseHeaders.set('Access-Control-Allow-Origin', context.request.headers.get('origin') || '*');
    responseHeaders.set('Access-Control-Allow-Credentials', 'true');
    // También permitir que el navegador vea las cabeceras personalizadas
    responseHeaders.set('Access-Control-Expose-Headers', 'Content-Type, X-Vendor-Email');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  }

  // Si no es ruta de backend, servir contenido estático (index.html, CSS, JS, etc.)
  return context.next();
}

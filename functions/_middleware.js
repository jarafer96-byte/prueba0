// functions/_middleware.js

export async function onRequest(context) {
  console.log('Middleware ejecutado para:', context.request.url);
  const { request, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

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

  const shouldGoToBackend = backendRoutes.some(route =>
    path === route || (route.endsWith('/') && path.startsWith(route))
  );

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

  if (shouldGoToBackend) {
    const backendUrl = `https://mpagina.onrender.com${path}${url.search}`;
    const newRequest = new Request(backendUrl, {
      method: method,
      headers: request.headers,
      body: request.body,
      redirect: 'follow'
    });
    
    const response = await fetch(newRequest);
    const responseHeaders = new Headers(response.headers);
    
    // ========== CORREGIR LA COOKIE ==========
    // Obtener la cabecera Set-Cookie original
    let setCookie = responseHeaders.get('set-cookie');
    if (setCookie) {
      // Reemplazar Domain=onrender.com por Domain=.pages.dev (dominio del frontend)
      setCookie = setCookie.replace(/Domain=onrender\.com;?/i, 'Domain=.pages.dev;');
      // Asegurar SameSite=None (necesario para cross-site, aunque ahora el dominio es el mismo, pero por seguridad)
      setCookie = setCookie.replace(/SameSite=Lax;?/i, 'SameSite=None;');
      // Asegurar Secure (ya lo está)
      // Eliminar cualquier otro atributo problemático (opcional)
      responseHeaders.set('set-cookie', setCookie);
    }
    
    // Añadir cabeceras CORS
    responseHeaders.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*');
    responseHeaders.set('Access-Control-Allow-Credentials', 'true');
    responseHeaders.set('Access-Control-Expose-Headers', 'Content-Type, X-Vendor-Email');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  }

  return next();
}

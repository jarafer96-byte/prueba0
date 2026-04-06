// functions/_middleware.js
export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Rutas que deben ir al backend
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

  // Manejar preflight OPTIONS
  if (request.method === 'OPTIONS' && shouldGoToBackend) {
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
      method: request.method,
      headers: request.headers,   // Conserva todas las cabeceras (incluye Cookie)
      body: request.body,
      redirect: 'follow'
    });
    const response = await fetch(newRequest);
    const responseHeaders = new Headers(response.headers);

    // Reescribir la cookie para que se guarde en .pages.dev
    let setCookie = responseHeaders.get('set-cookie');
    if (setCookie) {
      setCookie = setCookie.replace(/Domain=onrender\.com;?/i, 'Domain=.pages.dev;');
      setCookie = setCookie.replace(/SameSite=Lax;?/i, 'SameSite=None;');
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

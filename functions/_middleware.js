export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;

  // Rutas que deben ir al backend
  const backendRoutes = ['/api/', '/pagar', '/verificar-stock', '/login-admin', '/guardar-producto', '/eliminar-producto', '/subir-foto', '/conectar_mp', '/actualizar-stock-talle', '/guardar-talles-stock', '/callback_mp', '/api/csrf-token'];

  const shouldGoToBackend = backendRoutes.some(route => path === route || (route.endsWith('/') && path.startsWith(route)));

  if (shouldGoToBackend) {
    const backendUrl = `https://mpagina.onrender.com${path}${url.search}`;
    // Reenviar la petición con el mismo método, cabeceras y cuerpo
    const newRequest = new Request(backendUrl, {
      method: context.request.method,
      headers: context.request.headers,
      body: context.request.body,
      credentials: 'include', // importante
      redirect: 'follow'
    });
    return fetch(newRequest);
  }

  return context.next();
}

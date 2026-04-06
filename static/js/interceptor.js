(function() {
  const API_BASE = 'https://mpagina.onrender.com';
  const backendRoutes = [
    '/api/', '/pagar', '/verificar-stock', '/login-admin',
    '/guardar-producto', '/eliminar-producto', '/subir-foto',
    '/conectar_mp', '/actualizar-stock-talle', '/guardar-talles-stock',
    '/callback_mp', '/api/csrf-token',
    '/ca/cotizar', '/ca/guardar-remitente', '/ca/guardar-credenciales',
    '/ca/validar', '/ca/crear-orden', '/ca/cancelar-orden',
    '/ca/rotulos', '/ca/historial', '/ca/sucursales'
  ];

  window.cliente = {
    email: "ferj.9622@gmail.com",
    whatsapp: "https://wa.me/5492975158178",
    mercado_pago: ""
  };
  window.VENDOR_EMAIL = window.cliente.email;
  window.carrito = [];

  // --- Token JWT (admin) ---
  const adminToken = sessionStorage.getItem('adminToken');
  const urlToken = new URLSearchParams(window.location.search).get('token');
  
  if (adminToken) {
    window.modoAdmin = true;
    window.adminToken = adminToken;
    if (urlToken) {
      const cleanUrl = window.location.pathname + window.location.search.replace(/[?&]token=[^&]*/, '').replace(/^&/, '?');
      history.replaceState(null, '', cleanUrl);
    }
  } else if (urlToken) {
    window.modoAdmin = true;
    window.adminToken = urlToken;
    sessionStorage.setItem('adminToken', urlToken);
    history.replaceState(null, '', window.location.pathname);
  } else {
    window.modoAdmin = false;
    window.adminToken = null;
  }

  // --- CSRF (opcional, solo si el backend lo exige) ---
  async function loadCSRFToken() {
    if (!window.modoAdmin) {
      window.CSRF_TOKEN = null;
      return null;
    }
    try {
      const res = await fetch(API_BASE + '/api/csrf-token');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      window.CSRF_TOKEN = data.csrf_token;
      return window.CSRF_TOKEN;
    } catch(e) {
      console.error('Error al obtener CSRF token', e);
      window.CSRF_TOKEN = null;
      return null;
    }
  }

  // --- Interceptor fetch ---
  const originalFetch = window.fetch;
  window.fetch = function(url, options = {}) {
    options.headers = options.headers || {};
    
    // Redirigir rutas de backend a Render
    let finalUrl = url;
    const isRelative = !url.startsWith('http://') && !url.startsWith('https://');
    if (isRelative) {
      const shouldProxy = backendRoutes.some(route =>
        url === route || (route.endsWith('/') && url.startsWith(route))
      );
      if (shouldProxy) {
        finalUrl = API_BASE + url;
      }
    }

    // Cabeceras fijas
    if (window.VENDOR_EMAIL) {
      options.headers['X-Vendor-Email'] = window.VENDOR_EMAIL;
    }
    
    // Token JWT si estamos en modo admin
    if (window.modoAdmin && window.adminToken) {
      options.headers['Authorization'] = `Bearer ${window.adminToken}`;
    }
    
    // CSRF (si existe)
    if (window.modoAdmin && window.CSRF_TOKEN) {
      options.headers['X-CSRF-Token'] = window.CSRF_TOKEN;
    }
    
    // No enviamos cookies porque usamos JWT
    options.credentials = 'omit';
    
    return originalFetch(finalUrl, options);
  };

  // --- Inicialización ---
  const style = document.createElement('style');
  style.textContent = '#productos { min-height: 500px; }';
  document.head.appendChild(style);

  if (window.modoAdmin) {
    loadCSRFToken().then(() => {
      const script = document.createElement('script');
      script.src = 'static/js/admin.js';
      script.defer = true;
      document.head.appendChild(script);
    });
  } else {
    window.CSRF_TOKEN = null;
  }
})();

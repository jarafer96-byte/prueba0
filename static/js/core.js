const configWhatsApp = window.cliente?.whatsapp;
const email = window.cliente?.email;
const usarFirestore = false;

let cargaCompleta = false;
let paginaActual = 1;
let productosFiltradosActuales = [];
let isMobile = window.matchMedia("(max-width: 767px)").matches;
let scrollTimer;
let isScrolling = false;
let urlProductos = `/api/productos?_=${Date.now()}`;
let pasoActual = 1;    
let envioCalculado = false;
let resizeTimer;  

// Verificar si ya hay sesión de admin activa
const adminToken = sessionStorage.getItem('adminToken');
if (adminToken) {
    window.modoAdmin = true;
}



// Abrir sidebar al hacer clic en "Productos"
const btnProductos = document.getElementById('btnProductosNav');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');
const closeBtn = document.getElementById('closeSidebar');

function openSidebar() {
  sidebar.classList.add('visible');
  overlay.classList.add('visible');
  // Opcional: cerrar el sidebar si se hace clic en el overlay
}

function closeSidebar() {
  sidebar.classList.remove('visible');
  overlay.classList.remove('visible');
}

if (btnProductos) {
  btnProductos.addEventListener('click', openSidebar);
}
if (closeBtn) {
  closeBtn.addEventListener('click', closeSidebar);
}
if (overlay) {
  overlay.addEventListener('click', closeSidebar);
}

// Cerrar sidebar con la tecla ESC
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && sidebar && sidebar.classList.contains('visible')) {
    closeSidebar();
  }
});


function cambiarPaso(paso) {
  const pasoCarrito = document.getElementById('pasoCarrito');
  const pasoDireccion = document.getElementById('pasoDireccion');
  const pasoDatos = document.getElementById('pasoDatos');
  
  // Ocultar todos
  [pasoCarrito, pasoDireccion, pasoDatos].forEach(p => {
    if (p) {
      p.classList.remove('paso-visible');
      p.classList.add('paso-oculto');
    }
  });
  
  // Mostrar el solicitado
  let pasoMostrar = null;
  if (paso === 1) pasoMostrar = pasoCarrito;
  else if (paso === 2) pasoMostrar = pasoDireccion;
  else if (paso === 3) pasoMostrar = pasoDatos;
  
  if (pasoMostrar) {
    pasoMostrar.classList.remove('paso-oculto');
    pasoMostrar.classList.add('paso-visible');
  }
  
  window.pasoActual = paso;
}

function volverAlCarrito() {
  const pasoDireccion = document.getElementById('pasoDireccion');
  const pasoCarrito = document.getElementById('pasoCarrito');
  if (pasoDireccion) pasoDireccion.classList.remove('paso-visible');
  if (pasoCarrito) pasoCarrito.classList.add('paso-visible');
  pasoActual = 1;
}

function volverADireccion() {
  const pasoDatos = document.getElementById('pasoDatos');
  const pasoDireccion = document.getElementById('pasoDireccion');
  if (pasoDatos) pasoDatos.classList.remove('paso-visible');
  if (pasoDireccion) pasoDireccion.classList.add('paso-visible');
  pasoActual = 2;
}

function vaciarCarrito() {
  // 1. Vaciar el array del carrito y actualizar la interfaz
  window.carrito = [];
  actualizarCarrito();   // Tu función que limpia la lista y el contador

  // 2. Ocultar TODOS los pasos (usando las clases correctas)
  const pasoCarrito = document.getElementById('pasoCarrito');
  const pasoDireccion = document.getElementById('pasoDireccion');
  const pasoDatos = document.getElementById('pasoDatos');
  
  if (pasoCarrito) {
    pasoCarrito.classList.remove('paso-visible');
    pasoCarrito.classList.add('paso-oculto');
  }
  if (pasoDireccion) {
    pasoDireccion.classList.remove('paso-visible');
    pasoDireccion.classList.add('paso-oculto');
  }
  if (pasoDatos) {
    pasoDatos.classList.remove('paso-visible');
    pasoDatos.classList.add('paso-oculto');
  }

  // 3. Mostrar únicamente el paso del carrito
  if (pasoCarrito) {
    pasoCarrito.classList.remove('paso-oculto');
    pasoCarrito.classList.add('paso-visible');
  }

  // 4. Limpiar campos de dirección y datos personales (opcional pero recomendado)
  const campos = [
    'calle', 'numero', 'localidad', 'provincia_codigo', 'codigo_postal',
    'nombre', 'apellido', 'email_cliente', 'telefono'
  ];
  campos.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  // 5. Resetear mensaje de envío y ocultar botón "Siguiente: tus datos"
  const costoDiv = document.getElementById('costoEnvioMostrado');
  if (costoDiv) costoDiv.innerHTML = '';
  
  const btnSiguiente = document.getElementById('btnSiguienteDatos');
  if (btnSiguiente) {
    btnSiguiente.classList.remove('paso-visible');
    btnSiguiente.classList.add('paso-oculto');
  }

  // 6. Resetear variables de estado
  window.envioCalculado = false;
  window.pasoActual = 1;   // o la variable global que uses
  if (typeof window.resetEnvio === 'function') window.resetEnvio();
}

function mostrarPasoDireccion() {
  const pasoCarrito = document.getElementById('pasoCarrito');
  const pasoDireccion = document.getElementById('pasoDireccion');
  if (pasoCarrito) pasoCarrito.classList.remove('paso-visible');
  if (pasoDireccion) pasoDireccion.classList.add('paso-visible');
  pasoActual = 2;
}

function mostrarPasoDatos() {
  if (!envioCalculado) {
    alert("Primero calculá el costo de envío.");
    return;
  }
  const pasoDireccion = document.getElementById('pasoDireccion');
  const pasoDatos = document.getElementById('pasoDatos');
  if (pasoDireccion) pasoDireccion.classList.remove('paso-visible');
  if (pasoDatos) pasoDatos.classList.add('paso-visible');
  pasoActual = 3;
}


function continuarSinEnvio() {
  window.costoEnvio = 0;
  document.getElementById("costoEnvioMostrado").innerHTML = "";
  if (typeof window.actualizarCarritoConEnvio === 'function') {
    window.actualizarCarritoConEnvio();
  }
  envioCalculado = true;
  mostrarPasoDatos();
}


function getVersionUrl(originalUrl, size) {
    if (originalUrl.includes('_500.webp')) {
        return originalUrl.replace('_500.webp', `_${size}.webp`);
    }
    const lastDot = originalUrl.lastIndexOf('.');
    if (lastDot === -1) return originalUrl; 
    const base = originalUrl.substring(0, lastDot);
    return base + `_${size}.webp`;
}



function mostrarSkeletons() {
  const contenedor = document.getElementById("productos");
  if (!contenedor) return;
  // Genera 6 skeletons (puedes ajustar la cantidad)
  const skeletons = Array(6).fill().map(() => '<div class="skeleton-card"></div>').join('');
  contenedor.innerHTML = `<div class="skeleton-grid">${skeletons}</div>`;
}

mostrarSkeletons();

fetch(urlProductos)
  .then(r => {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  })
  .then(lista => {
    const productosOrdenados = Array.isArray(lista) ? lista : [];
  
    productosOrdenados.sort((a, b) => {
      const stockA = (a.stock_por_talle && Object.values(a.stock_por_talle).some(v => v > 0)) || 
                     (a.stock && a.stock > 0);
      const stockB = (b.stock_por_talle && Object.values(b.stock_por_talle).some(v => v > 0)) || 
                     (b.stock && b.stock > 0);
      
      if (stockA && !stockB) return -1;
      if (!stockA && stockB) return 1;
      
      return (a.precio || 0) - (b.precio || 0);
    });
    
    window.todosLosProductos = productosOrdenados;

    const cont = document.getElementById("productos");
    const contGrupos = document.getElementById("panelGrupos");
    const contSub = document.getElementById("panelSubcategorias");

    if (!cont) return;

    const grupos = [...new Set(window.todosLosProductos.map(p => p.grupo).filter(Boolean))];

    if (contGrupos) {
      contGrupos.innerHTML = ""; 
      grupos.forEach(g => {
        const btn = document.createElement("button");
        btn.className = "btn-grupo";
        btn.textContent = g;
        btn.addEventListener("click", (e) => {
          mostrarGrupo(g, e);
        });
        contGrupos.appendChild(btn);
      });
    }

    const primerGrupo = grupos[0];
    const subgruposPrimer = [...new Set(window.todosLosProductos
      .filter(p => p.grupo === primerGrupo)
      .map(p => p.subgrupo).filter(Boolean))];

    if (primerGrupo) {
      if (subgruposPrimer.length > 0) {
        filtrarSubcategoria(primerGrupo, subgruposPrimer[0]);
      } else {
        mostrarGrupo(primerGrupo, null, true);
      }
    }
  })
  .catch(err => {
    cargaCompleta = true;
    const cont = document.getElementById("productos");
    if (cont) cont.innerHTML = "<p class='text-danger text-center'>Error al cargar productos. Intenta de nuevo.</p>";
  });



function renderPagina(pagina, productos) {
  const cont = document.getElementById("productos");
  if (!cont) return;
  const itemsPorPagina = getItemsPorPagina();

  if (!productos || productos.length === 0) {
    cont.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-light" role="status"></div><p>Cargando productos...</p></div>';
    return;
  }

  const inicio = (pagina - 1) * itemsPorPagina;
  const fin = Math.min(inicio + itemsPorPagina, productos.length);
  const productosPagina = productos.slice(inicio, fin);

  const fragment = document.createDocumentFragment();
  productosPagina.forEach((p, index) => {
    const esLCP = (pagina === 1 && index === 0);
    fragment.appendChild(renderProducto(p, esLCP));
  });

  cont.innerHTML = '';
  cont.appendChild(fragment);
}


function renderPaginacion(productosFiltrados) {
  const pagDiv = document.getElementById("paginacion");
  if (!pagDiv) return;
  
  const itemsPorPagina = getItemsPorPagina(); 
  const totalPaginas = Math.ceil(productosFiltrados.length / itemsPorPagina);
  
  pagDiv.innerHTML = "";
  for (let i = 1; i <= totalPaginas; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = "btn btn-light mx-1";
    if (i === paginaActual) {
      btn.classList.add("active");
    }
    btn.addEventListener('click', () => {
      paginaActual = i;
      renderPagina(i, productosFiltrados);
      renderPaginacion(productosFiltrados);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    pagDiv.appendChild(btn);
  }
}


function actualizarCarritoConEnvio() {
  const totalSpan = document.getElementById('totalCarrito');
  if (!totalSpan) return;

  // Calcular el subtotal de los productos (sin envío)
  let subtotal = 0;
  if (window.carrito && window.carrito.length > 0) {
    subtotal = window.carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  }

  const costoEnvio = window.costoEnvio || 0;
  const totalConEnvio = subtotal + costoEnvio;

  const fmt = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  totalSpan.textContent = fmt.format(totalConEnvio);

  // Opcional: mostrar el desglose en algún lugar
  const envioSpan = document.getElementById('costoEnvioMostrado');
  if (envioSpan && costoEnvio > 0) {
    envioSpan.innerHTML = `<strong>Envío:</strong> $${costoEnvio.toFixed(2)}`;
  } else if (envioSpan && costoEnvio === 0) {
    envioSpan.innerHTML = '';
  }
}

function resetEnvio() {
  window.costoEnvio = 0;
  envioCalculado = false;
  const costoEnvioSpan = document.getElementById('costoEnvioMostrado');
  if (costoEnvioSpan) costoEnvioSpan.innerHTML = '';
  const btnSiguiente = document.getElementById('btnSiguienteDatos');
  if (btnSiguiente) {
    btnSiguiente.classList.remove('paso-visible');
    btnSiguiente.classList.add('paso-oculto');
  }
}

function renderProducto(p, esLCP = false) {
  const template = document.getElementById('producto-template');
  const card = template.content.cloneNode(true).firstElementChild;
  
  card.dataset.id = p.id_base;
  card.dataset.precio = p.precio;

  const precioActual = parseFloat(p.precio) || 0;
  let precioAnterior = parseFloat(p.precio_anterior) || 0;
  let esOferta = precioAnterior > 0 && precioAnterior > precioActual;
  let descuentoPorcentaje = esOferta ? Math.round(((precioAnterior - precioActual) / precioAnterior) * 100) : 0;

  // Elementos del DOM
  const ofertaBadge = card.querySelector('.oferta-badge');
  const btnGirar = card.querySelector('.btn-girar');
  const img = card.querySelector('img');
  const titulo = card.querySelector('.card-title');
  const precioSpan = card.querySelector('.precio-actual');
  const precioAnteriorSpan = card.querySelector('.precio-anterior-tachado');
  const ahorroSmall = card.querySelector('.ahorro');
  const selectoresContainer = card.querySelector('.selectores-container');
  const cantidadInput = card.querySelector('input[type="number"]');
  const agregarBtn = card.querySelector('.btn-secondary.btn-sm');
  const fotosAdicionalesDiv = card.querySelector('.fotos-adicionales');
  const whatsappContainer = card.querySelector('.whatsapp-container');
  const btnReversa = card.querySelector('.btn-reversa');
  const descripcionTexto = card.querySelector('.descripcion-texto');
  const coloresInfo = card.querySelector('.colores-info');
  const tallesInfo = card.querySelector('.talles-info');
  const btnVolver = card.querySelector('.card-back-footer .btn-secondary');

  const imagenGrande = p.imagen_url || '/static/img/fallback.webp';
  const imagenCard = getVersionUrl(imagenGrande, '180');
  img.src = imagenCard;
  if (!esLCP) img.setAttribute('data-src', imagenCard);
  img.alt = p.nombre;
  img.onload = function() { this.classList.add('img-loaded'); };
  img.onclick = () => openModal(imagenGrande);
  if (esLCP) img.loading = 'eager';
  else img.loading = 'lazy';

  titulo.textContent = p.nombre;
  precioSpan.textContent = p.precio;
  precioSpan.id = `precio_${p.id_base}`;

  // Oferta
  if (esOferta) {
    precioAnteriorSpan.classList.remove('precio-anterior-oculto');
    precioAnteriorSpan.classList.add('precio-anterior-visible');
    precioAnteriorSpan.textContent = `$${precioAnterior.toFixed(2)}`;
    ofertaBadge.classList.remove('oferta-badge-oculto');
    ofertaBadge.classList.add('oferta-badge-visible');
    ofertaBadge.textContent = `🔥 OFERTA -${descuentoPorcentaje}%`;
    precioSpan.classList.add('precio-oferta');
    ahorroSmall.classList.add('ahorro-oculto');
  } else {
    precioAnteriorSpan.classList.remove('precio-anterior-visible');
    precioAnteriorSpan.classList.add('precio-anterior-oculto');
    ofertaBadge.classList.remove('oferta-badge-visible');
    ofertaBadge.classList.add('oferta-badge-oculto');
    precioSpan.classList.remove('precio-oferta');
    ahorroSmall.classList.add('ahorro-oculto');
  }

  // Descripción
  if (p.descripcion) {
    descripcionTexto.innerHTML = `<div class="producto-descripcion">${p.descripcion}</div>`;
  } else {
    descripcionTexto.innerHTML = `<div class="producto-descripcion-vacio">Este producto no tiene descripción adicional.</div>`;
  }

  // Colores y talles
  const variantes = p.variantes || {};
  const colores = p.colores || [];
  const tallesUnicos = p.talles || [];
  const tieneColores = colores.length > 0 && !(colores.length === 1 && colores[0] === "unico");
  const tallesPorColor = {};
  colores.forEach(color => { tallesPorColor[color] = {}; });
  Object.values(variantes).forEach(v => {
    if (v.color && v.talle && tallesPorColor[v.color]) {
      tallesPorColor[v.color][v.talle] = v.stock;
    }
  });

  if (!tieneColores) {
    const talles = tallesUnicos.length ? tallesUnicos : ["unico"];
    // Para compatibilidad con productos antiguos, usar stock_por_talle si existe, sino variantes
    let stockMap = {};
    if (p.stock_por_talle && Object.keys(p.stock_por_talle).length) {
      stockMap = p.stock_por_talle;
    } else {
      // Si no hay stock_por_talle, intentar extraer de variantes
      talles.forEach(t => {
        const varianteEncontrada = Object.values(variantes).find(v => v.talle === t);
        stockMap[t] = varianteEncontrada ? varianteEncontrada.stock : 0;
      });
    }
    tallesPorColor["unico"] = {};
    talles.forEach(t => { tallesPorColor["unico"][t] = stockMap[t] || 0; });
    colores.push("unico");
  }

  const colorInicial = colores[0];
  const tallesIniciales = tallesPorColor[colorInicial] || {};
  const opcionesTallesIniciales = Object.entries(tallesIniciales).map(([t, stock]) => {
    return stock > 0 ? `<option value="${t}">${t} (${stock} disponible${stock !== 1 ? 's' : ''})</option>` : `<option value="${t}" disabled>${t} (Agotado)</option>`;
  }).join('');
  let primerTalleConStock = Object.entries(tallesIniciales).find(([_, stock]) => stock > 0)?.[0] || "";
  let stockInicial = primerTalleConStock ? tallesIniciales[primerTalleConStock] : 0;

  let selectoresHTML = "";
  if (tieneColores) {
    selectoresHTML += `<div class="mb-2 d-flex align-items-center gap-2">
      <span id="color-label-${p.id_base}" class="mb-0"><strong>Color:</strong></span>
      <select id="color_${p.id_base}" class="form-select form-select-sm w-auto selector-ancho" aria-labelledby="color-label-${p.id_base}">
        ${colores.map(color => `<option value="${color}">${color}</option>`).join('')}
      </select>
    </div>`;
  }
  selectoresHTML += `<div class="mb-2 d-flex align-items-center gap-2">
    <span id="talle-label-${p.id_base}" class="mb-0"><strong>Talle:</strong></span>
    <select id="talle_${p.id_base}" class="form-select form-select-sm w-auto selector-ancho" aria-labelledby="talle-label-${p.id_base}">
      ${opcionesTallesIniciales || '<option>Sin talles disponibles</option>'}
    </select>
  </div>`;
  selectoresContainer.innerHTML = selectoresHTML;

  cantidadInput.id = `cantidad_${p.id_base}`;
  cantidadInput.setAttribute('aria-label', `Cantidad de ${p.nombre}`);
  cantidadInput.max = stockInicial > 0 ? stockInicial : 1;
  cantidadInput.disabled = stockInicial <= 0;
  agregarBtn.id = `btn_agregar_${p.id_base}`;
  agregarBtn.disabled = stockInicial <= 0;
  if (stockInicial <= 0) {
    agregarBtn.classList.add('btn-sin-stock');
  } else {
    agregarBtn.classList.remove('btn-sin-stock');
  }
  agregarBtn.textContent = stockInicial > 0 ? "Agregar al carrito" : "❌ Sin stock";

  const nombreEscapado = p.nombre.replace(/'/g, "\\'").replace(/"/g, '\\"');
  const imagenGrandeEscapada = imagenGrande.replace(/'/g, "\\'");
  const grupoEscapado = (p.grupo || "").replace(/'/g, "\\'");
  const subgrupoEscapado = (p.subgrupo || "").replace(/'/g, "\\'");
  agregarBtn.onclick = () => {
    agregarAlCarritoConColor(nombreEscapado, `precio_${p.id_base}`, `cantidad_${p.id_base}`, p.id_base, grupoEscapado, subgrupoEscapado, imagenGrandeEscapada, `color_${p.id_base}`, `talle_${p.id_base}`);
  };

  // Fotos adicionales
  if (p.fotos_adicionales && p.fotos_adicionales.length) {
    const fotosContainer = document.createElement('div');
    fotosContainer.className = 'fotos-adicionales-grid';
    p.fotos_adicionales.forEach(foto => {
      const miniatura = getVersionUrl(foto, '58');
      const img2 = document.createElement('img');
      img2.src = miniatura;
      img2.alt = `Foto adicional de ${p.nombre}`;
      img2.className = 'foto-adicional-thumb';
      img2.addEventListener('click', () => openModal(foto));
      fotosContainer.appendChild(img2);
    });
    fotosAdicionalesDiv.innerHTML = '';
    fotosAdicionalesDiv.appendChild(fotosContainer);
  } else {
    fotosAdicionalesDiv.innerHTML = '';
  }

  // WhatsApp
  let whatsappUrl = configWhatsApp;
  if (configWhatsApp && configWhatsApp.includes("wa.me")) {
    const mensaje = encodeURIComponent(`Hola! Me interesa el producto: "${p.nombre}" - Precio: $${p.precio}\n\n¿Podrías darme más información?`);
    const match = configWhatsApp.match(/wa\.me\/(\d+)/);
    if (match) {
      const numero = match[1];
      whatsappUrl = `https://wa.me/${numero}?text=${mensaje}`;
    } else {
      whatsappUrl = `${configWhatsApp}?text=${mensaje}`;
    }
  }
  if (whatsappUrl) {
    whatsappContainer.innerHTML = `
      <a href="${whatsappUrl}" class="btn btn-whatsapp btn-sm w-100 d-flex align-items-center justify-content-center gap-2 btn-whatsapp-personalizado" target="_blank">
        <img src="/static/img/whatsapp.webp" alt="WhatsApp" class="whatsapp-icono">
        Consultar
      </a>
    `;
  } else {
    whatsappContainer.innerHTML = '';
  }

  // Información reverso (colores/talles)
  if (tieneColores) {
    coloresInfo.classList.remove('info-hidden');
    coloresInfo.classList.add('info-visible');
    coloresInfo.innerHTML = `<strong>Colores:</strong> ${colores.filter(c => c !== "unico").join(", ")}`;
  } else {
    coloresInfo.classList.remove('info-visible');
    coloresInfo.classList.add('info-hidden');
  }
  if (tallesUnicos.length > 0 && tallesUnicos[0] !== "unico") {
    tallesInfo.classList.remove('info-hidden');
    tallesInfo.classList.add('info-visible');
    tallesInfo.innerHTML = `<strong>Talles:</strong> ${tallesUnicos.join(", ")}`;
  } else {
    tallesInfo.classList.remove('info-visible');
    tallesInfo.classList.add('info-hidden');
  }

  // Girar card
  btnGirar.onclick = () => girarCard(btnGirar);
  btnReversa.onclick = () => girarCard(btnReversa);
  btnVolver.onclick = () => girarCard(btnVolver);

  // Mostrar número del producto en el reverso
  let numeroProducto = null;
  if (p.id_base && typeof p.id_base === 'string') {
    const parts = p.id_base.split('-');
    const lastPart = parts[parts.length - 1];
    if (/^\d+$/.test(lastPart)) {
      numeroProducto = parseInt(lastPart, 10);
    }
  }

  const cardBack = card.querySelector('.card-back');
  if (cardBack) {
    const oldNumero = cardBack.querySelector('.numero-producto-back');
    if (oldNumero) oldNumero.remove();
    if (numeroProducto) {
      const numeroBackDiv = document.createElement('div');
      numeroBackDiv.className = 'numero-producto-back';
      numeroBackDiv.textContent = `#${numeroProducto}`;
      cardBack.appendChild(numeroBackDiv);
    }
  }

  // ========== SELECTORES DE COLOR/TALLE CON VERIFICACIÓN DE EXISTENCIA (usando actualizarStockPorTalle) ==========
  if (tieneColores) {
    const colorSelect = card.querySelector(`#color_${p.id_base}`);
    const talleSelect = card.querySelector(`#talle_${p.id_base}`);
    if (colorSelect && talleSelect) {
      const actualizarTallesPorColor = (color) => {
        const tallesDelColor = tallesPorColor[color] || {};
        const opciones = Object.entries(tallesDelColor).map(([t, stock]) => {
          return stock > 0 ? `<option value="${t}">${t} (${stock} disponible${stock !== 1 ? 's' : ''})</option>` : `<option value="${t}" disabled>${t} (Agotado)</option>`;
        }).join('');
        talleSelect.innerHTML = opciones || '<option disabled>Sin talles disponibles</option>';
        const primerTalle = Object.entries(tallesDelColor).find(([_, stock]) => stock > 0)?.[0] || "";
        if (primerTalle) {
          talleSelect.value = primerTalle;
          // Usar la función centralizada
          actualizarStockPorTalle(p.id_base, primerTalle, color);
        } else {
          actualizarStockPorTalle(p.id_base, "", color);
        }
      };
      colorSelect.addEventListener('change', (e) => actualizarTallesPorColor(e.target.value));
      talleSelect.addEventListener('change', (e) => {
        const color = colorSelect.value;
        const talle = e.target.value;
        actualizarStockPorTalle(p.id_base, talle, color);
      });
      actualizarTallesPorColor(colorInicial);
    } else {
      console.warn(`No se encontraron selectores de color/talle para producto ${p.id_base}`);
    }
  } else {
    const talleSelect = card.querySelector(`#talle_${p.id_base}`);
    if (talleSelect) {
      // Si no hay colores, usar el mapa de talles desde variantes o stock_por_talle
      let tallesDisponibles = [];
      if (p.variantes && Object.keys(p.variantes).length > 0) {
        tallesDisponibles = [...new Set(Object.values(p.variantes).map(v => v.talle))];
        const opciones = tallesDisponibles.map(t => {
          const stock = Object.values(p.variantes).find(v => v.talle === t)?.stock || 0;
          return `<option value="${t}" ${stock > 0 ? '' : 'disabled'}>${t} (${stock} disponible)</option>`;
        }).join('');
        talleSelect.innerHTML = opciones;
      } else if (p.stock_por_talle && Object.keys(p.stock_por_talle).length) {
        tallesDisponibles = Object.keys(p.stock_por_talle);
        const opciones = tallesDisponibles.map(t => {
          const stock = p.stock_por_talle[t];
          return `<option value="${t}" ${stock > 0 ? '' : 'disabled'}>${t} (${stock} disponible)</option>`;
        }).join('');
        talleSelect.innerHTML = opciones;
      }
      talleSelect.addEventListener('change', (e) => {
        actualizarStockPorTalle(p.id_base, e.target.value, null);
      });
      let primerTalle = null;
      if (p.variantes && Object.keys(p.variantes).length > 0) {
        primerTalle = Object.values(p.variantes).find(v => v.stock > 0)?.talle;
      } else if (p.stock_por_talle && Object.keys(p.stock_por_talle).length) {
        primerTalle = Object.keys(p.stock_por_talle).find(t => p.stock_por_talle[t] > 0);
      }
      if (primerTalle) {
        talleSelect.value = primerTalle;
        actualizarStockPorTalle(p.id_base, primerTalle, null);
      } else {
        actualizarStockPorTalle(p.id_base, talleSelect.value, null);
      }
    } else {
      console.warn(`No se encontró selector de talle para producto ${p.id_base}`);
    }
  }

  requestAnimationFrame(() => card.classList.add("show"));
  setTimeout(() => card.classList.remove("fade-reorder"), 50);

  return card;
}


function openModal(src) {
  const modal = document.getElementById("imgModal");
  const modalImg = document.getElementById("modal-img");
  if (!modal || !modalImg) return;
  modalImg.src = src;
  modal.classList.remove('modal-hidden');
  modal.classList.add('modal-visible');
  setTimeout(() => modal.classList.add("show"), 10);
}

function closeModal() {
  const modal = document.getElementById("imgModal");
  if (!modal) return;
  modal.classList.remove("show");
  setTimeout(() => {
    modal.classList.remove('modal-visible');
    modal.classList.add('modal-hidden');
  }, 300);
}


function mostrarGrupo(nombre, event, auto = false) {
  const grupoCanon = String(nombre || "").trim();
  window.currentGrupo = grupoCanon.toLowerCase();
  window.currentSub = null; 

  const cont = document.getElementById("productos");
  if (!cont) return;

  document.querySelectorAll('.btn-grupo').forEach(btn => btn.classList.remove('active'));
  if (event?.target) {
    event.target.classList.add('active');
  }

  const panel = document.getElementById('panelSubcategorias');
  if (!panel) return;
  panel.innerHTML = "";

  const productosGrupo = (window.todosLosProductos || []).filter(
    p => String(p.grupo || "").toLowerCase() === window.currentGrupo
  );

  const subcategorias = [...new Set(
    productosGrupo.map(p => p.subgrupo).filter(s => s && String(s).toLowerCase() !== 'general')
  )];

  subcategorias.forEach(sub => {
    const btn = document.createElement('button');
    btn.textContent = sub;
    btn.className = 'btn-subgrupo';
    btn.addEventListener("click", (e) => mostrarSubgrupo(sub, e));
    panel.appendChild(btn);
  });

  paginaActual = 1;
  renderPagina(1, productosGrupo);
  renderPaginacion(productosGrupo);

  if (subcategorias.length > 0) {
    if (!auto) {
      panel.classList.remove('oculta');
    } else {
      panel.classList.add('oculta');
    }
  } else {
    panel.classList.add('oculta');
  }
  setTimeout(() => {
    ajustarPosicionesPaneles(); 

    if (typeof gestionarFlechas === 'function') {
      gestionarFlechas('panelSubcategorias');
      gestionarFlechas('panelGrupos');
    }
  }, 0);
  setTimeout(() => window.scrollTo({ top: 0, behavior: 'auto' }), 0);
}
window.mostrarGrupo = mostrarGrupo;


function filtrarSubcategoria(grupo, subgrupo) {
  const cont = document.getElementById("productos");
  if (!cont) return;

  const grupoCanon = String(grupo || "").trim().toLowerCase();
  const subCanon = String(subgrupo || "").trim().toLowerCase();

  window.currentGrupo = grupoCanon;
  window.currentSub = subCanon || null; 

  document.querySelectorAll('.btn-subgrupo').forEach(btn => btn.classList.remove('active'));

  if (subCanon) {
    const btnSub = Array.from(document.querySelectorAll('.btn-subgrupo'))
      .find(btn => btn.textContent.trim().toLowerCase() === subCanon);
    if (btnSub) btnSub.classList.add('active');
  }

  let productosFiltrados;
  if (subCanon) {
    productosFiltrados = window.todosLosProductos.filter(p =>
      String(p.grupo || "").toLowerCase() === grupoCanon &&
      String(p.subgrupo || "").toLowerCase() === subCanon
    );
  } else {
    productosFiltrados = window.todosLosProductos.filter(p =>
      String(p.grupo || "").toLowerCase() === grupoCanon
    );
  }

  paginaActual = 1;
  renderPagina(1, productosFiltrados);
  renderPaginacion(productosFiltrados);

  setTimeout(() => window.scrollTo({ top: 0, behavior: 'auto' }), 0);
}
window.filtrarSubcategoria = filtrarSubcategoria;



function mostrarSubgrupo(subgrupo, event) {
  const grupoActivoBtn = document.querySelector('.btn-grupo.active');
  const grupoActivo = grupoActivoBtn ? grupoActivoBtn.textContent.trim() : null;

  if (!grupoActivo) {
    return;
  }

  document.querySelectorAll('.btn-subgrupo').forEach(btn => btn.classList.remove('active'));
  if (event?.target) {
    event.target.classList.add('active');
  }

  const grupoCanon = String(grupoActivo).trim();
  const subCanon = String(subgrupo || "").trim();

  window.currentGrupo = grupoCanon.toLowerCase();
  window.currentSub = subCanon.toLowerCase();

  filtrarSubcategoria(grupoCanon, subCanon);
}
window.mostrarSubgrupo = mostrarSubgrupo;


function sincronizarPreciosDelCarrito() {
  window.carrito.forEach(item => {
    const idPrecio = "precio_" + (item.id_base || item.nombre.replace(/ /g, "_"));
    const precioSpan = document.getElementById(idPrecio);
    if (precioSpan) {
      const precioActual = parseFloat(precioSpan.textContent);
      if (!isNaN(precioActual)) {
        item.precio = precioActual;
      }
    }
  });
}


function actualizarCarrito(conAnimacion = false) {
  sincronizarPreciosDelCarrito();

  const lista = document.getElementById('listaCarrito');
  const totalSpan = document.getElementById('totalCarrito');
  if (!lista || !totalSpan) return;

  lista.innerHTML = '';
  let suma = 0;

  if (window.carrito.length === 0) {
    lista.innerHTML = '<li class="carrito-vacio">🛒 Carrito vacío</li>';
    totalSpan.textContent = '0.00';
    const contadorSpan = document.getElementById('carrito-contador');
    if (contadorSpan) {
      contadorSpan.textContent = '0';
      contadorSpan.classList.remove('carrito-contador-naranja');
      contadorSpan.classList.add('carrito-contador-gris');
    }
    return;
  }

  const fmt = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const escape = str => (str || '').replace(/'/g, "\\'");

  window.carrito.forEach(item => {
    const subtotal = item.precio * item.cantidad;
    suma += subtotal;

    let descripcion = item.nombre;
    const tieneColor = item.color && item.color !== "unico";
    const tieneTalle = item.talle && item.talle !== "unico";

    if (tieneColor && tieneTalle) {
      descripcion += ` (Color: ${item.color} - Talle: ${item.talle})`;
    } else if (tieneColor) {
      descripcion += ` (Color: ${item.color})`;
    } else if (tieneTalle) {
      descripcion += ` (Talle: ${item.talle})`;
    }

    // Se crea el elemento con clases, sin estilos inline y sin onmousedown
    const li = document.createElement('li');
    li.className = 'carrito-item';

    const divInfo = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = descripcion;
    divInfo.appendChild(strong);
    const detalle = document.createElement('div');
    detalle.className = 'carrito-item-detalle';
    detalle.textContent = `${item.cantidad} x $${item.precio.toFixed(2)} = $${subtotal.toFixed(2)}`;
    divInfo.appendChild(detalle);

    const btnEliminar = document.createElement('button');
    btnEliminar.className = 'btn-eliminar-carrito';
    btnEliminar.textContent = '❌';
    btnEliminar.setAttribute('data-id', item.id_base);
    btnEliminar.setAttribute('data-talle', item.talle || '');
    btnEliminar.setAttribute('data-color', item.color || '');
    // El evento se asigna por delegación en el contenedor del carrito (ver nota abajo)

    li.appendChild(divInfo);
    li.appendChild(btnEliminar);
    lista.appendChild(li);
  });

  totalSpan.textContent = fmt.format(suma);

  const contadorSpan = document.getElementById('carrito-contador');
  if (contadorSpan) {
    const totalItems = window.carrito.reduce((acc, item) => acc + item.cantidad, 0);
    contadorSpan.textContent = totalItems;
    contadorSpan.classList.remove('carrito-contador-gris', 'carrito-contador-naranja');
    if (totalItems > 0) {
      contadorSpan.classList.add('carrito-contador-naranja');
    } else {
      contadorSpan.classList.add('carrito-contador-gris');
    }

    if (conAnimacion) {
      contadorSpan.classList.add('pop-animation');
      setTimeout(() => contadorSpan.classList.remove('pop-animation'), 400);
    }
  }
}


function agregarAlCarritoConColor(nombre, idPrecioSpan, idCantidad, id_base, grupo, subgrupo, imagenUrl, idColorSelect, idTalleSelect) {
  const cantidadInput = document.getElementById(idCantidad);
  const precioSpan = document.getElementById(idPrecioSpan);
  const colorSelect = document.getElementById(idColorSelect);
  const talleSelect = document.getElementById(idTalleSelect);

  if (!cantidadInput || !precioSpan) {
    alert("❌ Error: No se pudieron obtener los datos del producto");
    return;
  }

  const colorElegido = colorSelect ? colorSelect.value : "unico";
  const talleElegido = talleSelect ? talleSelect.value : "unico";

  if (colorSelect && !colorElegido) {
    alert("❌ Debes seleccionar un color");
    return;
  }
  if (talleSelect && !talleElegido) {
    alert("❌ Debes seleccionar un talle");
    return;
  }

  const productoOriginal = window.todosLosProductos.find(p => p.id_base === id_base);
  if (!productoOriginal) {
    alert("❌ Producto no encontrado");
    return;
  }

  const variantes = productoOriginal.variantes || {};
  let stockDisponible = 0;
  for (const key in variantes) {
    const varObj = variantes[key];
    if (varObj.talle === talleElegido && varObj.color === colorElegido) {
      stockDisponible = varObj.stock;
      break;
    }
  }

  if (stockDisponible <= 0) {
    alert(`❌ No hay stock disponible para ${colorElegido} - ${talleElegido}`);
    return;
  }

  const cantidad = parseInt(cantidadInput.value) || 1;
  if (cantidad > stockDisponible) {
    alert(`❌ Solo hay ${stockDisponible} unidades disponibles para ${colorElegido} - ${talleElegido}`);
    cantidadInput.value = stockDisponible;
    return;
  }

  const precio = parseFloat(precioSpan.textContent.replace("$", "").replace(",", "")) || 0;

  const existente = window.carrito.find(item => 
    item.id_base === id_base && 
    item.talle === talleElegido && 
    item.color === colorElegido
  );

  if (existente) {
    const nuevoTotal = existente.cantidad + cantidad;
    if (nuevoTotal > stockDisponible) {
      alert(`❌ No puedes llevar más de ${stockDisponible} unidades de ${colorElegido} - ${talleElegido}`);
      return;
    }
    existente.cantidad = nuevoTotal;
  } else {
    const nuevoItem = {
      nombre,
      precio,
      cantidad,
      id_base,
      talle: talleElegido,
      color: colorElegido,
      grupo,
      subgrupo,
      imagen_url: imagenUrl
    };
    window.carrito.push(nuevoItem);
  }

  actualizarCarrito(true);
  mostrarToast(`✅ ${nombre} (${colorElegido} - ${talleElegido}) agregado al carrito`);
}


function actualizarStockPorTalle(idProducto, talleSeleccionado, colorSeleccionado = null) {
  const cantidadInput = document.getElementById(`cantidad_${idProducto}`);
  const agregarBtn = document.getElementById(`btn_agregar_${idProducto}`);
  if (!cantidadInput || !agregarBtn) {
    return;
  }

  const producto = window.todosLosProductos?.find(p => p.id_base === idProducto);
  if (!producto) {
    return;
  }

  let stockDisponible = 0;

  // 1. Priorizar variantes si existen (sistema actual)
  if (producto.variantes && Object.keys(producto.variantes).length > 0) {
    const variantes = producto.variantes;
    // Si tenemos color, buscar coincidencia exacta
    if (colorSeleccionado && colorSeleccionado !== 'unico') {
      for (const key in variantes) {
        const varTalle = variantes[key].talle;
        const varColor = variantes[key].color;
        if (varTalle === talleSeleccionado && varColor === colorSeleccionado) {
          stockDisponible = variantes[key].stock;
          break;
        }
      }
    } else {
      // Sin color específico: buscar cualquier variante con el talle dado
      for (const key in variantes) {
        if (variantes[key].talle === talleSeleccionado) {
          stockDisponible = variantes[key].stock;
          break;
        }
      }
    }
  }
  // 2. Si no hay variantes pero hay stock_por_talle (solo para productos antiguos no migrados)
  else if (producto.stock_por_talle && typeof producto.stock_por_talle === 'object') {
    stockDisponible = producto.stock_por_talle[talleSeleccionado] || 0;
  }
  // 3. Último recurso: stock general
  else if (producto.stock !== undefined) {
    stockDisponible = producto.stock;
  }

  // Actualizar UI del input cantidad y botón
  cantidadInput.max = stockDisponible;
  if (stockDisponible > 0) {
    cantidadInput.disabled = false;
    const valorActual = parseInt(cantidadInput.value) || 1;
    cantidadInput.value = Math.min(valorActual, stockDisponible);
    agregarBtn.disabled = false;
    agregarBtn.classList.remove('btn-sin-stock');
    agregarBtn.textContent = "Agregar al carrito";
  } else {
    cantidadInput.disabled = true;
    cantidadInput.value = 0;
    agregarBtn.disabled = true;
    agregarBtn.classList.add('btn-sin-stock');
    agregarBtn.textContent = "❌ Sin stock";
  }
}


function habilitarScrollHorizontal(selector) {
  const panel = document.querySelector(selector);
  if (!panel) return;

  panel.addEventListener('wheel', (e) => {
    e.preventDefault(); 
    panel.scrollBy({
      left: e.deltaY,
      behavior: 'smooth' 
    });
  }, { passive: false }); 
  let isDown = false;
  let startX;
  let scrollLeft;

  panel.addEventListener('mousedown', (e) => {
    isDown = true;
    panel.classList.add('active'); 
    startX = e.pageX - panel.offsetLeft;
    scrollLeft = panel.scrollLeft;
  });

  panel.addEventListener('mouseleave', () => {
    isDown = false;
    panel.classList.remove('active');
  });

  panel.addEventListener('mouseup', () => {
    isDown = false;
    panel.classList.remove('active');
  });

  panel.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - panel.offsetLeft;
    const walk = (x - startX); 
    panel.scrollLeft = scrollLeft - walk;
  });
}


habilitarScrollHorizontal('.panel-grupos');
habilitarScrollHorizontal('.panel-subcategorias');


isMobile = window.matchMedia("(max-width: 767px)").matches;
window.matchMedia("(max-width: 767px)").addEventListener('change', (e) => {
    isMobile = e.matches;
    if (productosFiltradosActuales && productosFiltradosActuales.length > 0) {
        renderPagina(paginaActual, productosFiltradosActuales);
        renderPaginacion(productosFiltradosActuales);
    }
  
    if (typeof ajustarPosicionesPaneles === 'function') {
        ajustarPosicionesPaneles();
    }
});



function eliminarDelCarrito(id_base, talle, event) {
  if (event?.stopPropagation) event.stopPropagation();

  window.carrito = window.carrito.filter(p => {
    if (talle && talle !== "unico") {
      return !(p.id_base === id_base && p.talle === talle);
    } else {
      return p.id_base !== id_base;
    }
  });

  actualizarCarrito();
}


function gestionarFlechas(panelId) {
  const panel = document.getElementById(panelId);
  if (!panel) return;

  const contenedor = panel.parentElement;
  const flechaIzq = contenedor.querySelector('.flecha-izq');
  const flechaDer = contenedor.querySelector('.flecha-der');

  if (!flechaIzq || !flechaDer) return;

  if (panel.classList.contains('oculta')) {
    flechaIzq.style.display = 'none';
    flechaDer.style.display = 'none';
    return;
  }

  const actualizarVisibilidad = () => {
    flechaIzq.style.display = panel.scrollLeft > 5 ? 'flex' : 'none';
    const tieneMas = panel.scrollLeft + panel.clientWidth < panel.scrollWidth - 5;
    flechaDer.style.display = tieneMas ? 'flex' : 'none';
  };

  panel.onscroll = actualizarVisibilidad;
  window.onresize = actualizarVisibilidad;

  flechaIzq.onclick = () => panel.scrollBy({ left: -200, behavior: 'smooth' });
  flechaDer.onclick = () => panel.scrollBy({ left: 200, behavior: 'smooth' });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {  // dos frames para mayor seguridad
      actualizarVisibilidad();
    });
  });
}


function girarCard(elemento) {
  const cardContenedor = elemento.closest('.card-contenedor');
  if (cardContenedor) {
    cardContenedor.classList.toggle('card-girada');
  }
}


function mostrarToast(mensaje) {
  const toastAnterior = document.querySelector('.toast-notificacion');
  if (toastAnterior) toastAnterior.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-notificacion';
  toast.textContent = mensaje;
  document.body.appendChild(toast);

  // Pequeño retardo para aplicar la animación de entrada
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
  }, 10);

  setTimeout(() => {
    toast.style.transform = 'translateX(400px)';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}


function mostrarTodos() {
  const panelGrupos = document.getElementById('panelGrupos');
  const panelSub = document.getElementById('panelSubcategorias');
  if (!panelGrupos || !panelSub) return;

  panelGrupos.classList.toggle('oculta');

  if (!panelSub.classList.contains('oculta')) {
    panelSub.classList.add('oculta');
  }
  gestionarFlechas('panelGrupos');
  gestionarFlechas('panelSubcategorias');
  ajustarPosicionesPaneles();
}



function ajustarPosicionesPaneles() {
  const panelGrupos = document.getElementById('panelGrupos');
  const panelSub = document.getElementById('panelSubcategorias');
  const barraNav = document.querySelector('.barra-navegacion');

  if (!panelGrupos || !panelSub) return;

  let alturaBarra = barraNav ? barraNav.offsetHeight : 0;

  let alturaGrupos = 0;
  if (!panelGrupos.classList.contains('oculta')) {
    alturaGrupos = panelGrupos.offsetHeight;
  }

  const contenedorGrupos = panelGrupos.parentElement;
  const flechaIzqGrupos = contenedorGrupos.querySelector('.flecha-izq');
  const flechaDerGrupos = contenedorGrupos.querySelector('.flecha-der');

  if (!panelGrupos.classList.contains('oculta')) {
    panelGrupos.style.top = alturaBarra + 'px';
    panelGrupos.style.position = 'fixed';
    panelGrupos.style.left = '0';
    panelGrupos.style.right = '0';

    if (flechaIzqGrupos) {
      flechaIzqGrupos.style.top = (alturaBarra + 2) + 'px';
      flechaIzqGrupos.style.display = 'flex';
    }
    if (flechaDerGrupos) {
      flechaDerGrupos.style.top = (alturaBarra + 2) + 'px';
      flechaDerGrupos.style.display = 'flex';
    }
  } else {
    if (flechaIzqGrupos) flechaIzqGrupos.style.display = 'none';
    if (flechaDerGrupos) flechaDerGrupos.style.display = 'none';
  }

  const contenedorSub = panelSub.parentElement;
  const flechaIzqSub = contenedorSub.querySelector('.flecha-izq');
  const flechaDerSub = contenedorSub.querySelector('.flecha-der');

  if (!panelSub.classList.contains('oculta')) {
    const margenAdicional = 19;
    const desplazamientoArriba = -20;
    const topCalc = alturaBarra + alturaGrupos + margenAdicional + desplazamientoArriba;

    panelSub.style.top = topCalc + 'px';
    panelSub.style.position = 'fixed';
    panelSub.style.left = '0';
    panelSub.style.right = '0';

    if (flechaIzqSub) {
      flechaIzqSub.style.top = (topCalc + 2) + 'px';
      flechaIzqSub.style.display = 'flex';
    }
    if (flechaDerSub) {
      flechaDerSub.style.top = (topCalc + 2) + 'px';
      flechaDerSub.style.display = 'flex';
    }
  } else {
    if (flechaIzqSub) flechaIzqSub.style.display = 'none';
    if (flechaDerSub) flechaDerSub.style.display = 'none';
  }

  gestionarFlechas('panelGrupos');
  gestionarFlechas('panelSubcategorias');
}


function getItemsPorPagina() {
    if (isMobile && window.modoAdmin) return 4; 
    if (isMobile) return 6; 
    return 12; 
}


async function calcularEnvioPaso() {
  const emailVendedor = window.cliente?.email;
  if (!emailVendedor) {
    alert("No se pudo identificar al vendedor");
    return;
  }

  const codigoPostal = document.getElementById('codigo_postal').value.trim();
  if (!codigoPostal) {
    alert("Ingresá tu código postal para calcular el envío");
    return;
  }

  let pesoTotalKg = 0;
  for (const item of window.carrito) {
    const producto = window.todosLosProductos?.find(p => p.id_base === item.id_base);
    const pesoGramos = producto?.peso_gramos || 500;
    pesoTotalKg += (pesoGramos * item.cantidad) / 1000;
  }

  const altoCm = 10, anchoCm = 15, largoCm = 20;
  const payload = {
    email_vendedor: emailVendedor,
    codigo_postal_destino: codigoPostal,
    peso_kg: pesoTotalKg,
    alto_cm: altoCm,
    ancho_cm: anchoCm,
    largo_cm: largoCm
  };

  const btnCalcular = document.getElementById('btnCalcularEnvioPaso');
  if (btnCalcular) {
    btnCalcular.disabled = true;
    btnCalcular.textContent = 'Calculando...';
  }

  try {
    const resp = await fetch("/ca/cotizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    if (data.ok && data.costo) {
      window.costoEnvio = data.costo;
      document.getElementById("costoEnvioMostrado").innerHTML = `<strong>Envío:</strong> $${data.costo.toFixed(2)}`;
      actualizarCarritoConEnvio();
      envioCalculado = true;
      // Mostrar botón siguiente usando clase (en lugar de style.display)
      const btnSiguiente = document.getElementById('btnSiguienteDatos');
      if (btnSiguiente) {
        btnSiguiente.classList.remove('paso-oculto');
      }
    } else {
      alert("No se pudo calcular el envío: " + (data.error || "Error desconocido"));
      window.costoEnvio = 0;
      document.getElementById("costoEnvioMostrado").innerHTML = "";
      envioCalculado = false;
      const btnSiguiente = document.getElementById('btnSiguienteDatos');
      if (btnSiguiente) btnSiguiente.classList.add('paso-oculto');
    }
  } catch (err) {
    console.error(err);
    alert("Error al calcular envío. Verifica tu conexión.");
    window.costoEnvio = 0;
    envioCalculado = false;
    const btnSiguiente = document.getElementById('btnSiguienteDatos');
    if (btnSiguiente) btnSiguiente.classList.add('paso-oculto');
  } finally {
    if (btnCalcular) {
      btnCalcular.disabled = false;
      btnCalcular.textContent = 'Calcular envío';
    }
  }
}



function irAContacto() {
  const contacto = document.getElementById('ubicacion');
  if (contacto) contacto.scrollIntoView({ behavior: 'smooth' });
}
window.irAContacto = irAContacto; 


function loadVisibleImagesFirst() {
  const lazyImages = document.querySelectorAll('.card-giratoria img[data-src]');
  if (lazyImages.length === 0) return;
  const viewportHeight = window.innerHeight;
  let loadedCount = 0;
  lazyImages.forEach(img => {
    const rect = img.getBoundingClientRect();
    if (rect.top < viewportHeight + 300 && rect.bottom > -100 && img.dataset.src) {
      img.src = img.dataset.src;
      img.onload = () => {
        img.removeAttribute('data-src');
        img.classList.add('loaded');  
      };
      loadedCount++;
      if (window.innerWidth < 768 && loadedCount >= 3) return;
    }
  });
  if (loadedCount > 0) console.log(`🖼️ Lazy: Cargadas ${loadedCount} imágenes en cards`);
}


function setupEnhancedLazyLoading() {
  const lazyImages = document.querySelectorAll('.card-giratoria img[data-src]');
  if (lazyImages.length === 0) return;
  if (lazyImages.length <= 8) {
    lazyImages.forEach(img => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        img.classList.add('loaded'); 
      }
    });
    return;
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            const tempImg = new Image();
            tempImg.src = img.dataset.src;
            tempImg.onload = () => {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              img.classList.add('loaded'); 
            };
          }
          observer.unobserve(img);
        }
      });
    }, { rootMargin: window.innerWidth < 768 ? '200px' : '100px', threshold: 0.01 });
    lazyImages.forEach(img => observer.observe(img));
  }
}



function cargarMercadoPagoJS() {
  return new Promise((resolve, reject) => {
    if (window.mercadoPagoCargado) return resolve();

    const cargar = () => {
      const script = document.createElement('script');
      script.src = 'static/js/mercadopago.js';
      script.async = true; 
      script.onload = async () => {
        window.mercadoPagoCargado = true;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(cargar, { timeout: 2000 });
    } else {
      setTimeout(cargar, 1000); 
    }
  });
}
let pagando = false;


document.addEventListener('DOMContentLoaded', () => {
  // ============================================================
  // 0. FUNCIÓN CENTRAL PARA CAMBIAR DE PASO (carrito/dirección/datos)
  // ============================================================
  function cambiarPaso(paso) {
    const pasoCarrito = document.getElementById('pasoCarrito');
    const pasoDireccion = document.getElementById('pasoDireccion');
    const pasoDatos = document.getElementById('pasoDatos');

    // Ocultar todos
    [pasoCarrito, pasoDireccion, pasoDatos].forEach(p => {
      if (p) {
        p.classList.remove('paso-visible');
        p.classList.add('paso-oculto');
      }
    });

    // Mostrar el solicitado
    let pasoMostrar = null;
    if (paso === 1) pasoMostrar = pasoCarrito;
    else if (paso === 2) pasoMostrar = pasoDireccion;
    else if (paso === 3) pasoMostrar = pasoDatos;

    if (pasoMostrar) {
      pasoMostrar.classList.remove('paso-oculto');
      pasoMostrar.classList.add('paso-visible');
    }

    window.pasoActual = paso;
  }

  // ============================================================
  // 1. CONFIGURACIÓN DEL CARRITO Y ENVÍOS
  // ============================================================
  const btnProductos = document.getElementById('btnProductosNav');
  if (btnProductos) btnProductos.addEventListener('click', mostrarTodos);

  const btnContacto = document.getElementById('btnContactoNav');
  if (btnContacto) btnContacto.addEventListener('click', irAContacto);

  const btnVaciar = document.getElementById('btnVaciarCarrito');
  if (btnVaciar) btnVaciar.addEventListener('click', vaciarCarrito);

  const modalClose = document.getElementById('modalClose');
  if (modalClose) modalClose.addEventListener('click', closeModal);

  const modalOverlay = document.getElementById('imgModal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  // Botón "Continuar con la compra" (paso 1 -> paso 2)
  const btnContinuar = document.getElementById('btnContinuar');
  if (btnContinuar) {
    btnContinuar.addEventListener('click', () => cambiarPaso(2));
  }

  // Botón "Siguiente: tus datos" (paso 2 -> paso 3, con validación de envío)
  const btnSiguienteDatos = document.getElementById('btnSiguienteDatos');
  if (btnSiguienteDatos) {
    btnSiguienteDatos.addEventListener('click', () => {
      if (window.envioCalculado) {
        cambiarPaso(3);
      } else {
        alert("Primero calculá el costo de envío.");
      }
    });
  }

  // Botón "Volver atrás" desde dirección (paso 2 -> paso 1)
  const btnVolverCarrito = document.getElementById('btnVolverCarrito');
  if (btnVolverCarrito) {
    btnVolverCarrito.addEventListener('click', () => cambiarPaso(1));
  }

  // Botón "Volver atrás" desde datos (paso 3 -> paso 2)
  const btnVolverDireccion = document.getElementById('btnVolverDireccion');
  if (btnVolverDireccion) {
    btnVolverDireccion.addEventListener('click', () => cambiarPaso(2));
  }

  // Botón "Omitir envío" (calcula envío 0 y pasa a datos)
  const btnSinEnvio = document.getElementById('btnSinEnvio');
  if (btnSinEnvio) {
    btnSinEnvio.addEventListener('click', () => {
      window.costoEnvio = 0;
      document.getElementById("costoEnvioMostrado").innerHTML = "";
      if (typeof window.actualizarCarritoConEnvio === 'function') {
        window.actualizarCarritoConEnvio();
      }
      window.envioCalculado = true;
      cambiarPaso(3);
    });
  }

  // Botón calcular envío
  const btnCalcular = document.getElementById('btnCalcularEnvioPaso');
  if (btnCalcular) {
    btnCalcular.addEventListener('click', async () => {
      await calcularEnvioPaso();
    });
  }

  // Botón pagar
  const btnPagar = document.getElementById('btnPagarFinal');
  if (btnPagar) {
    btnPagar.addEventListener('click', () => {
      if (typeof window.pagarTodoJunto === 'function') {
        window.pagarTodoJunto();
      } else {
        alert("El módulo de pagos aún no está listo. Intentá de nuevo en unos segundos.");
      }
    });
  }

  // ============================================================
  // 2. BOTÓN DEL CARRITO (mostrar/ocultar + carga MP)
  // ============================================================
  const toggleCarritoBtn = document.getElementById('toggleCarrito');
  const carritoDiv = document.getElementById('carrito');

  if (toggleCarritoBtn && carritoDiv) {
    const clickHandler = (e) => {
      e.stopPropagation();
      carritoDiv.classList.toggle('carrito-visible');
      if (carritoDiv.classList.contains('carrito-visible')) {
        carritoDiv.classList.remove('carrito-hidden');
      } else {
        carritoDiv.classList.add('carrito-hidden');
      }
      if (typeof cargarMercadoPagoJS === 'function') {
        cargarMercadoPagoJS();
      }
    };

    toggleCarritoBtn.removeEventListener('click', toggleCarritoBtn._clickHandler);
    toggleCarritoBtn.addEventListener('click', clickHandler);
    toggleCarritoBtn._clickHandler = clickHandler;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          if (typeof cargarMercadoPagoJS === 'function') cargarMercadoPagoJS();
          observer.disconnect();
        }
      }, { rootMargin: '300px' });
      observer.observe(toggleCarritoBtn);
    }
  }

  // ============================================================
  // 3. BOTÓN DE ADMIN Y CARGA AUTOMÁTICA SI MODO ADMIN ESTÁ ACTIVO
  // ============================================================
  const loginToggleBtn = document.getElementById('loginToggleBtn');
  const loginForm = document.getElementById('loginFloatingForm');

  // Función para cargar admin.js (evita duplicados)
  function cargarAdminScript() {
      if (window.adminScriptCargado) return;
      window.adminScriptCargado = true;
      const script = document.createElement('script');
      script.src = 'static/js/admin.js';
      script.onload = () => { window.adminScriptCargado = true; };
      document.head.appendChild(script);
  }

  // Configurar el botón "Admin" para mostrar/ocultar el formulario y cargar admin.js si es necesario
  if (loginToggleBtn && loginForm) {
      // Clonar para evitar listeners antiguos
      const newLoginBtn = loginToggleBtn.cloneNode(true);
      loginToggleBtn.parentNode.replaceChild(newLoginBtn, loginToggleBtn);

      newLoginBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          loginForm.classList.toggle('d-none');
          if (!loginForm.classList.contains('d-none') && !window.adminScriptCargado) {
              cargarAdminScript();
          }
      });
  }
  // ============================================================
  // 4. CARDS, LAZY LOADING, EVENTOS TÁCTILES Y SCROLL
  // ============================================================
  document.querySelectorAll('.card-giratoria').forEach(card => {
    card.addEventListener('touchstart', (e) => {
      e.preventDefault();
      card.classList.add('card-pressed');
    }, { passive: false });
    card.addEventListener('touchend', () => {
      card.classList.remove('card-pressed');
    });

    let touchStartTime, touchStartX, touchStartY;
    card.addEventListener('touchstart', (e) => {
      touchStartTime = Date.now();
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    card.addEventListener('touchend', (e) => {
      const touchDuration = Date.now() - touchStartTime;
      const deltaX = Math.abs(e.changedTouches[0].clientX - touchStartX);
      const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY);
      if (touchDuration < 300 && deltaX < 10 && deltaY < 10) {
        const girarBtn = card.querySelector('.btn-girar');
        if (girarBtn) girarBtn.click();
      }
    });
  });

  // Si modo admin, cargar MP también
  if (window.modoAdmin && typeof cargarMercadoPagoJS === 'function') {
    cargarMercadoPagoJS();
  }

  setTimeout(loadVisibleImagesFirst, 300);
  setTimeout(setupEnhancedLazyLoading, 800);

  window.addEventListener('scroll', () => {
    if (!isScrolling) {
      isScrolling = true;
      loadVisibleImagesFirst();
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        loadVisibleImagesFirst();
        isScrolling = false;
      }, 150);
    }
    const btnArriba = document.getElementById('volverArriba');
    if (btnArriba) {
      btnArriba.classList.toggle('btn-visible', window.scrollY > 300);
      btnArriba.classList.toggle('btn-hidden', window.scrollY <= 300);
    }
    const btnLogin = document.getElementById('loginToggleBtn');
    if (btnLogin && !window.modoAdmin) {
      const isBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
      btnLogin.classList.toggle('btn-visible', isBottom);
      btnLogin.classList.toggle('btn-hidden', !isBottom);
    }
  }, { passive: true });

  window.addEventListener("load", ajustarPosicionesPaneles);
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => ajustarPosicionesPaneles(), 150);
  });

  // ============================================================
  // 5. EVENTOS DE CLICK GLOBAL (cerrar carrito/paneles, girar cards y eliminar del carrito)
  // ============================================================
  document.addEventListener('click', (e) => {
    // --- 1. Eliminar producto del carrito (botón específico) ---
    const eliminarBtn = e.target.closest('.btn-eliminar-carrito');
    if (eliminarBtn) {
      e.preventDefault();
      const id_base = eliminarBtn.getAttribute('data-id');
      const talle = eliminarBtn.getAttribute('data-talle');
      const color = eliminarBtn.getAttribute('data-color');
      eliminarDelCarrito(id_base, talle, color, e);
      return;
    }

    // --- 2. Cerrar carrito si se clic fuera ---
    const carritoDivGlobal = document.getElementById("carrito");
    const toggleBtnGlobal = document.getElementById("toggleCarrito");
    if (carritoDivGlobal && toggleBtnGlobal) {
      const visible = carritoDivGlobal.classList.contains('carrito-visible');
      const clicFueraCarrito = !carritoDivGlobal.contains(e.target) && !toggleBtnGlobal.contains(e.target);
      if (visible && clicFueraCarrito) {
        carritoDivGlobal.classList.remove('carrito-visible');
        carritoDivGlobal.classList.add('carrito-hidden');
      }
    }

    // --- 3. Cerrar paneles de grupos/subcategorías si se clic fuera ---
    const panelGrupos = document.getElementById("panelGrupos");
    const panelSub = document.getElementById("panelSubcategorias");
    if (panelGrupos && panelSub) {
      const esClickDentroGrupos = panelGrupos.contains(e.target);
      const esClickDentroSub = panelSub.contains(e.target);
      const esBotonGrupo = e.target.classList.contains("btn-grupo") || e.target.closest('.btn-grupo');
      const esBotonSubgrupo = e.target.classList.contains("btn-subgrupo") || e.target.closest('.btn-subgrupo');
      const esBotonNavegacion = !!e.target.closest(".barra-navegacion");

      if (!esClickDentroGrupos && !esClickDentroSub &&
          !esBotonGrupo && !esBotonSubgrupo && !esBotonNavegacion) {
        setTimeout(() => {
          panelGrupos.classList.add("oculta");
          panelSub.classList.add("oculta");
          if (typeof gestionarFlechas === 'function') {
            gestionarFlechas('panelGrupos');
            gestionarFlechas('panelSubcategorias');
          }
        }, 300);
      }
    }

    // --- 4. Girar cards al hacer clic en los botones correspondientes ---
    if (e.target.classList.contains('btn-girar') || e.target.classList.contains('btn-reversa')) {
      const card = e.target.closest('.card-giratoria');
      if (card) {
        setTimeout(() => {
          card.querySelectorAll('img[data-src]').forEach(img => {
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
            }
          });
        }, 100);
      }
    }
  });

  // ============================================================
  // 6. SELECTOR DE ORDEN POR PRECIO
  // ============================================================
  const ordenSelect = document.getElementById("ordenPrecio");
  if (ordenSelect) {
    ordenSelect.addEventListener("change", (e) => {
      if (!window.currentGrupo) return;
      let productosFiltrados = window.todosLosProductos.filter(p =>
        p.grupo?.toLowerCase() === window.currentGrupo
      );
      if (window.currentSub) {
        productosFiltrados = productosFiltrados.filter(p =>
          p.subgrupo?.toLowerCase() === window.currentSub
        );
      }
      productosFiltrados.sort((a, b) => {
        const pa = parseFloat(a.precio) || 0;
        const pb = parseFloat(b.precio) || 0;
        return e.target.value === "asc" ? pa - pb : pb - pa;
      });
      paginaActual = 1;
      productosFiltradosActuales = productosFiltrados;
      renderPagina(1, productosFiltrados);
      renderPaginacion(productosFiltrados);
    });
  }

  // ============================================================
  // 7. BOTÓN VOLVER ARRIBA
  // ============================================================
  const volverArribaBtn = document.getElementById('volverArriba');
  if (volverArribaBtn) {
    volverArribaBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ============================================================
  // 8. EVENTO CLICK EN EL LOGO (animación)
  // ============================================================
  const logoElement = document.querySelector('.logo');
  if (logoElement) {
    logoElement.addEventListener('click', function() {
      if (this.classList.contains('logo-anim-start') || this.classList.contains('logo-anim-return')) return;

      const logo = this;
    
      // FASE 1: Girar 360° (entrada)
      logo.classList.add('logo-anim-start');

      // Mostrar mensaje
      const mensaje = document.createElement('div');
      mensaje.textContent = 'Gracias por la visita! ❤️';
      mensaje.className = 'toast-message';
      document.body.appendChild(mensaje);
    
      setTimeout(() => mensaje.classList.add('toast-message-visible'), 10);
    
      // Ocultar mensaje después de 2 segundos
      setTimeout(() => {
        mensaje.classList.remove('toast-message-visible');
        setTimeout(() => mensaje.remove(), 500);
      }, 2000);

      // FASE 2: Después de que termine el primer giro (0.8s) + duración del mensaje (2s) = 2.8s
      // Iniciamos el giro de regreso
      setTimeout(() => {
        logo.classList.remove('logo-anim-start');
        logo.classList.add('logo-anim-return');  // ← ¡Segundo giro!
      
        // FASE 3: Cuando termine el segundo giro (0.8s después), resetear todo
        setTimeout(() => {
          logo.classList.remove('logo-anim-return');
          logo.classList.add('logo-anim-end');
          // Opcional: quitar logo-anim-end después de un frame
          setTimeout(() => logo.classList.remove('logo-anim-end'), 100);
        }, 800);
      
      }, 2800); // 800 (primer giro) + 2000 (mensaje visible)
    });
  }
  // ============================================================
  // 9. CAMBIO DE TALLE (actualizar stock)
  // ============================================================
  document.addEventListener('change', (e) => {
    if (e.target.id && e.target.id.startsWith('talle_')) {
      const idProducto = e.target.id.replace('talle_', '');
      const talleSeleccionado = e.target.value;
      if (talleSeleccionado && typeof actualizarStockPorTalle === 'function') {
        actualizarStockPorTalle(idProducto, talleSeleccionado);
      }
    }
  });
});

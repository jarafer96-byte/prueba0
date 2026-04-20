window.todosLosProductos = window.todosLosProductos || [];

async function guardarProducto(producto, formDiv, skipReload = false) {
  if (window._guardandoProducto) {
    console.warn("Ya hay una operación de guardado en curso");
    return false;
  }
  window._guardandoProducto = true;

  let boton = null;
  let textoOriginal = '';
  if (formDiv && typeof formDiv.querySelector === 'function') {
    boton = formDiv.querySelector('button.guardar-producto, button[type="submit"]');
    if (boton) {
      textoOriginal = boton.innerHTML;
      boton.disabled = true;
      boton.innerHTML = '⏳ Guardando...';
    }
  }

  try {
    const email = window.TARGET_EMAIL || window.cliente?.email;
    if (!email) {
      alert("❌ No hay email de admin, no se puede guardar");
      return false;
    }

    let idBase = formDiv?.dataset?.idBase;
    let esEdicion = !!idBase && !idBase.startsWith('nuevo_');

    if (idBase && idBase.startsWith('nuevo_')) {
      delete producto.id_base;
      idBase = null;
    }

    const payload = {
      producto: producto,
      email: email,
      es_edicion: esEdicion
    };
    if (esEdicion) {
      payload.producto.id_base = idBase;
    }

    const resp = await fetch("/guardar-producto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Error HTTP ${resp.status}: ${text.substring(0, 200)}`);
    }
    const data = await resp.json();
    if (data.status === "ok") {
      if (typeof mostrarToast === 'function') {
        mostrarToast(`✅ ${producto.nombre} guardado`);
      }
      if (!skipReload) {
        // Recargar el array global desde el servidor (sin refrescar la tabla completa)
        await recargarProductos();
        
        // Obtener el nuevo id_base devuelto por el backend
        const nuevoIdBase = data.producto_id || data.id_base || (esEdicion ? idBase : null);
        let productoActualizado = null;
        if (nuevoIdBase) {
          productoActualizado = window.todosLosProductos.find(p => p.id_base === nuevoIdBase);
        }
        
        if (productoActualizado) {
          // Buscar la fila actual (podría tener el id_base antiguo si era nuevo)
          const idBaseAntiguo = esEdicion ? idBase : (formDiv?.dataset?.idBase || idBase);
          const filaExistente = document.querySelector(`tr[data-id-base="${idBaseAntiguo}"]`);
          if (filaExistente) {
            // Actualizar la fila existente con los datos frescos
            actualizarFilaProducto(productoActualizado.id_base, productoActualizado);
          } else {
            // Si no existe (caso raro), agregar nueva fila
            agregarFilaProducto(productoActualizado);
          }
          // Actualizar el dataset del formDiv para futuras ediciones (importante si cambió el id_base)
          if (formDiv && !esEdicion && nuevoIdBase) {
            formDiv.dataset.idBase = nuevoIdBase;
          }
        } else {
          // Fallback: recargar toda la tabla (por si algo salió mal)
          renderTablaProductos();
        }
      }
      return true;
    } else {
      throw new Error(data.error || data.message || "Error al guardar producto");
    }
  } catch (err) {
    alert("❌ Error: " + err.message);
    return false;
  } finally {
    window._guardandoProducto = false;
    if (boton) {
      boton.disabled = false;
      boton.innerHTML = textoOriginal || '💾 Guardar';
    }
  }
}
function abrirConfigCorreoArgentino() {
  const modal = document.getElementById('modalConfigCA');
  if (modal) {
    modal.classList.add('modal-visible');
  }
}

function cerrarModalConfigCA() {
  const modal = document.getElementById('modalConfigCA');
  if (modal) {
    modal.classList.remove('modal-visible');
  }
}


  const btnConfigMP = document.getElementById('btnConfigurarMP');
  if (btnConfigMP) btnConfigMP.addEventListener('click', abrirConfigMercadoPago);

  const btnConfigCA = document.getElementById('btnConfigurarCA');
  if (btnConfigCA) btnConfigCA.addEventListener('click', abrirConfigCorreoArgentino);

  const btnCerrarModalCA = document.getElementById('btnCerrarModalCA');
  if (btnCerrarModalCA) btnCerrarModalCA.addEventListener('click', cerrarModalConfigCA);

  const btnSalirAdmin = document.getElementById('btnSalirAdmin');
  if (btnSalirAdmin) btnSalirAdmin.addEventListener('click', salirAdmin);

  const btnProductos = document.getElementById('btnProductosNav');
  if (btnProductos) btnProductos.addEventListener('click', mostrarTodos);
  
  const btnContacto = document.getElementById('btnContactoNav');
  if (btnContacto) btnContacto.addEventListener('click', irAContacto);

  const btnVaciarCarrito = document.getElementById('btnVaciarCarrito');
  if (btnVaciarCarrito) btnVaciarCarrito.addEventListener('click', vaciarCarrito);

  const modalClose = document.getElementById('modalClose');
  if (modalClose) modalClose.addEventListener('click', closeModal);
  
  const modalOverlay = document.getElementById('imgModal');
  if (modalOverlay) modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  const form = document.getElementById('formConfigCA');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = window.cliente?.email;
      if (!email) {
        alert("No se detectó el email del vendedor. Inicia sesión nuevamente.");
        return;
      }

      const agreement = document.getElementById('ca_agreement').value.trim();
      const api_key = document.getElementById('ca_api_key').value.trim();
      const micorreo_user = document.getElementById('ca_micorreo_user').value.trim();
      const micorreo_password = document.getElementById('ca_micorreo_password').value.trim();
      const test_mode = document.getElementById('ca_test_mode').checked;
      
      const nombre = document.getElementById('ca_nombre').value.trim();
      const calle = document.getElementById('ca_calle').value.trim();
      const altura = document.getElementById('ca_altura').value.trim();
      const localidad = document.getElementById('ca_localidad').value.trim();
      const provincia_codigo = document.getElementById('ca_provincia_codigo').value.trim();
      const codigo_postal = document.getElementById('ca_codigo_postal').value.trim();
      
      if (!agreement || !api_key || !micorreo_user || !micorreo_password ||
          !nombre || !calle || !altura || !localidad || !provincia_codigo || !codigo_postal) {
        alert("Por favor completa todos los campos.");
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerText;
      submitBtn.innerText = "Guardando...";
      submitBtn.disabled = true;
      
      try {
        const credRes = await fetch("/ca/guardar-credenciales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agreement, api_key, micorreo_user, micorreo_password, test_mode })
        });
        const credData = await credRes.json();
        if (credData.status !== "ok") throw new Error(credData.error || "Error guardando credenciales");

        const remRes = await fetch("/ca/guardar-remitente", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre, calle, altura, localidad, provincia_codigo, codigo_postal })
        });
        const remData = await remRes.json();
        if (remData.status !== "ok") throw new Error(remData.error || "Error guardando remitente");
        
        alert("✅ Configuración de Correo Argentino guardada correctamente.");
        cerrarModalConfigCA();

        form.reset();
      } catch (err) {
        alert("❌ Error: " + err.message);
      } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
      }
    });
  }

// Reemplaza el contenido de una fila existente con los datos actualizados del producto
function actualizarFilaProducto(idBase, productoActualizado) {
  const fila = document.querySelector(`tr[data-id-base="${idBase}"]`);
  if (!fila) return false;
  
  // Generar el HTML de la fila usando renderFilasTabla (pero solo para un producto)
  const htmlFila = renderFilasTabla([productoActualizado]);
  const nuevaFila = document.createElement('tr');
  nuevaFila.innerHTML = htmlFila;
  nuevaFila.setAttribute('data-id-base', idBase);
  
  // Reemplazar la fila existente
  fila.parentNode.replaceChild(nuevaFila, fila);
  return true;
}

// Agrega una nueva fila al final del tbody
function agregarFilaProducto(producto) {
  const tbody = document.getElementById('tabla-productos-body');
  if (!tbody) return;
  const htmlFila = renderFilasTabla([producto]);
  tbody.insertAdjacentHTML('beforeend', htmlFila);
}

// Elimina una fila del DOM
function eliminarFilaProducto(idBase) {
  const fila = document.querySelector(`tr[data-id-base="${idBase}"]`);
  if (fila) fila.remove();
}

async function eliminarProducto(id_base) {
  // 🔒 Evita ejecuciones simultáneas
  if (window._eliminandoProducto) {
    console.warn("Ya hay una operación de eliminación en curso");
    return;
  }
  window._eliminandoProducto = true;

  // Buscar el botón eliminar asociado (si existe)
  const boton = document.querySelector(`.eliminar-producto[data-id="${id_base}"]`);
  const textoOriginal = boton?.innerHTML;
  if (boton) {
    boton.disabled = true;
    boton.innerHTML = '⏳';
  }

  try {
    // Caso: producto temporal (no guardado aún)
    if (id_base && id_base.startsWith('nuevo_')) {
      const index = window.todosLosProductos.findIndex(p => p.id_base === id_base);
      if (index !== -1) {
        window.todosLosProductos.splice(index, 1);
        const grupoActivo = document.querySelector('.grupo-btn.active');
        const grupo = grupoActivo ? grupoActivo.dataset.grupo : null;
        const subgrupoActivo = document.querySelector('.subgrupo-btn.active');
        const subgrupo = subgrupoActivo ? subgrupoActivo.dataset.subgrupo : null;
        if (grupo) {
          filtrarProductos(grupo, subgrupo);
        } else {
          renderTablaProductos();
        }
        if (typeof mostrarToast === 'function') mostrarToast('✅ Producto eliminado (sin guardar)');
      }
      return;
    }

    // ⭐ Priorizar TARGET_EMAIL (master admin) sobre cliente.email
    const email = window.TARGET_EMAIL || window.cliente?.email;

    // Caso: producto real (ya guardado en BD)
    const resp = await fetch("/eliminar-producto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_base, email: email })
    });
    const data = await resp.json();
    if (data.status === "ok") {
      await recargarProductos();
      renderTablaProductos();
      if (typeof mostrarToast === 'function') mostrarToast('✅ Producto eliminado');
    } else {
      alert("Error al eliminar producto: " + (data.error || data.message || "Error desconocido"));
    }
  } catch (err) {
    alert("Error al eliminar producto: " + err.message);
  } finally {
    window._eliminandoProducto = false;
    if (boton) {
      boton.disabled = false;
      boton.innerHTML = textoOriginal || '🗑️';
    }
  }
}


async function optimizarImagen(file) {
  const imgUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = imgUrl;
    });
    const targetW = 500, targetH = 500;
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d", { alpha: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, targetW, targetH);
    const ratio = Math.min(targetW / img.width, targetH / img.height);
    const newW = Math.max(1, Math.round(img.width * ratio));
    const newH = Math.max(1, Math.round(img.height * ratio));
    const offsetX = Math.floor((targetW - newW) / 2);
    const offsetY = Math.floor((targetH - newH) / 2);
    ctx.drawImage(img, offsetX, offsetY, newW, newH);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(b => {
        if (b && b.size > 0) resolve(b);
        else reject(new Error("❌ No se pudo generar WebP"));
      }, "image/webp", 0.8);
    });
    return blob;
  } finally {
    URL.revokeObjectURL(imgUrl);
  }
}


async function subirImagen(blob) {
  const formData = new FormData();
  formData.append('file', blob, 'imagen.webp');

  const email = window.TARGET_EMAIL || window.cliente?.email;
  formData.append('email', email);

  const resp = await fetch('/subir-foto', {
    method: 'POST',
    body: formData
  });
  const data = await resp.json();
  if (data.ok && data.url) return data.url;
  throw new Error('Error al subir imagen');
}


function duplicarProductoDesdeCard(id_base) {
  if (window._duplicandoProducto) {
    console.warn("Ya hay una operación de duplicación en curso");
    return;
  }
  window._duplicandoProducto = true;

  const boton = document.querySelector(`.duplicar-producto[data-id="${id_base}"]`);
  const textoOriginal = boton?.innerHTML;
  if (boton) {
    boton.disabled = true;
    boton.innerHTML = '⏳';
  }

  try {
    const fila = document.querySelector(`tr[data-id-base="${id_base}"]`);
    if (!fila) throw new Error("No se encontró la fila");

    // Leer el estado actual completo del DOM
    const productoActualizado = obtenerProductoDesdeFila(fila, id_base);
    if (!productoActualizado) throw new Error("No se pudo leer el producto");

    // ACTUALIZAR el original en el array (para que la tabla lo muestre con las variantes nuevas)
    const indexOriginal = window.todosLosProductos.findIndex(p => p.id_base === id_base);
    if (indexOriginal !== -1) {
      window.todosLosProductos[indexOriginal] = productoActualizado;
      // Marcar este producto como "con cambios pendientes" para que se guarde aunque el array esté sincronizado
      if (!window._productosConCambiosPendientes) window._productosConCambiosPendientes = new Set();
      window._productosConCambiosPendientes.add(id_base);
    }

    // Crear copia
    const copia = JSON.parse(JSON.stringify(productoActualizado));
    delete copia.id_base;
    copia.id_base = 'nuevo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    copia.imagen_url = '';
    copia.fotos_adicionales = [];

    window.todosLosProductos.push(copia);

    // Refrescar vista manteniendo filtro
    const grupoActivo = document.querySelector('.grupo-btn.active');
    const grupo = grupoActivo ? grupoActivo.dataset.grupo : null;
    const subgrupoActivo = document.querySelector('#adminSubgruposBar .subgrupo-btn.active');
    const subgrupo = subgrupoActivo ? subgrupoActivo.dataset.subgrupo : null;
    if (grupo) {
      filtrarProductos(grupo, subgrupo);
    } else {
      renderTablaProductos();
    }

    setTimeout(() => {
      const nuevaFila = document.querySelector(`tr[data-id-base="${copia.id_base}"]`);
      if (nuevaFila) {
        nuevaFila.scrollIntoView({ behavior: 'smooth', block: 'center' });
        nuevaFila.classList.add('table-active');
        setTimeout(() => nuevaFila.classList.remove('table-active'), 2000);
      }
    }, 100);

    if (typeof mostrarToast === 'function') {
      mostrarToast('✅ Producto duplicado (pendiente de guardar)');
    }
  } catch (err) {
    console.error(err);
    alert('Error al duplicar: ' + err.message);
  } finally {
    window._duplicandoProducto = false;
    if (boton) {
      boton.disabled = false;
      boton.innerHTML = textoOriginal || '📋';
    }
  }
}


async function abrirConfigMercadoPago() {
  const urlRetorno = window.location.href;
  try {
    const response = await fetch('/api/conectar_mp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url_retorno: urlRetorno })
    });
    const data = await response.json();
    if (data.auth_url) {
      window.location.href = data.auth_url;
    } else {
      alert('Error: ' + (data.error || 'No se pudo obtener la URL de autorización'));
    }
  } catch (err) {
    alert('Error de red: ' + err.message);
  }
}


function salirAdmin() {
  sessionStorage.removeItem('adminToken');
  window.location.href = window.location.pathname;
}


function loginAdmin(event) {
  event.preventDefault();
  const usuario = document.getElementById("usuario_login").value.trim();
  const clave = document.getElementById("clave_login").value.trim();

  if (!usuario || !clave) {
    alert("❌ Usuario y clave requeridos");
    return;
  }

  const btn = event.target.querySelector('button[type="submit"]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Entrando...';
  }

  fetch("/login-admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, clave })
  })
    .then(res => res.json())
    .then(data => {
      if (data.status === "ok" && data.token) {
        sessionStorage.setItem('adminToken', data.token);
        alert("✅ Acceso concedido");
        window.location.href = window.location.pathname; 
      } else {
        alert("❌ " + (data.message || "Error desconocido"));
      }
    })
    .catch(() => {
      alert("❌ Error al intentar login");
    })
    .finally(() => {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Entrar';
      }
    });
}
const loginAdminForm = document.getElementById('loginAdminForm');
if (loginAdminForm) {
    loginAdminForm.addEventListener('submit', loginAdmin);
}


async function agregarFotoExtra(btn) {
  // 🔒 Evita múltiples selecciones simultáneas
  if (btn.disabled) return;
  btn.disabled = true;

  const idBase = btn.dataset.id;
  const inputFile = document.createElement('input');
  inputFile.type = 'file';
  inputFile.accept = 'image/*';
  inputFile.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      btn.disabled = false;
      return;
    }

    try {
      const blob = await optimizarImagen(file);
      const url = await subirImagen(blob);

      const producto = window.todosLosProductos.find(p => p.id_base === idBase);
      if (!producto) return;
      if (!producto.fotos_adicionales) producto.fotos_adicionales = [];
      producto.fotos_adicionales.push(url);

      const contenedor = btn.closest('.fotos-extra-container');
      const listaFotos = contenedor.querySelector('.fotos-extra-list');

      const nuevaFoto = document.createElement('div');
      nuevaFoto.className = 'foto-extra-item d-flex align-items-center justify-content-between mb-1 p-1 border rounded';

      const img = document.createElement('img');
      img.src = getVersionUrl(url, '58');
      img.className = 'admin-img-thumb foto-extra-thumb';
      img.setAttribute('data-modal-url', url);
      img.alt = 'Foto adicional';
      img.addEventListener('click', () => openModal(url));

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-sm btn-outline-danger eliminar-foto-extra';
      deleteBtn.setAttribute('data-url', url);
      deleteBtn.setAttribute('data-id', idBase);
      deleteBtn.textContent = '✖';

      nuevaFoto.appendChild(img);
      nuevaFoto.appendChild(deleteBtn);
      listaFotos.appendChild(nuevaFoto);

      if (typeof mostrarToast === 'function') mostrarToast('✅ Foto adicional agregada');
    } catch (err) {
      alert('Error al subir imagen: ' + err.message);
    } finally {
      btn.disabled = false;
    }
  };
  inputFile.click();
}



async function eliminarFotoExtra(idBase, url) {
  // 🔒 Evita eliminaciones múltiples simultáneas
  if (window._eliminandoFotoExtra) {
    console.warn("Ya hay una operación de eliminación de foto en curso");
    return;
  }
  window._eliminandoFotoExtra = true;

  // Buscar el botón eliminar asociado (para deshabilitarlo)
  const boton = document.querySelector(`.eliminar-foto-extra[data-id="${idBase}"][data-url="${url}"]`);
  const textoOriginal = boton?.innerHTML;
  if (boton) {
    boton.disabled = true;
    boton.innerHTML = '⏳';
  }

  try {
    const producto = window.todosLosProductos.find(p => p.id_base === idBase);
    if (producto && producto.fotos_adicionales) {
      const index = producto.fotos_adicionales.indexOf(url);
      if (index !== -1) {
        producto.fotos_adicionales.splice(index, 1);
      }
    }

    const fotoDiv = document.querySelector(`.fotos-extra-container[data-id="${idBase}"] [data-url="${url}"]`)?.closest('div');
    if (fotoDiv) fotoDiv.remove();

    if (typeof mostrarToast === 'function') mostrarToast('✅ Foto extra eliminada');
  } finally {
    window._eliminandoFotoExtra = false;
    if (boton) {
      boton.disabled = false;
      boton.innerHTML = textoOriginal || '✖';
    }
  }
}



async function agregarImagenPrincipal(btn) {
  // 🔒 Evita múltiples selecciones simultáneas
  if (btn.disabled) return;
  btn.disabled = true;

  const idBase = btn.dataset.id;
  const fila = btn.closest('tr');
  if (!fila) {
    btn.disabled = false;
    return;
  }

  const inputFile = document.createElement('input');
  inputFile.type = 'file';
  inputFile.accept = 'image/*';
  inputFile.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      btn.disabled = false;
      return;
    }

    try {
      const blob = await optimizarImagen(file);
      const url = await subirImagen(blob);

      const producto = window.todosLosProductos.find(p => p.id_base === idBase);
      if (producto) {
        producto.imagen_url = url;
      }

      const img = fila.querySelector('td:first-child img');
      if (img) {
        img.src = getVersionUrl(url, '58');
        if (img._clickHandler) {
          img.removeEventListener('click', img._clickHandler);
        }
        const handler = () => openModal(url);
        img.addEventListener('click', handler);
        img._clickHandler = handler;
      }

      if (typeof mostrarToast === 'function') mostrarToast('✅ Imagen principal actualizada');
    } catch (err) {
      alert('Error al subir imagen: ' + err.message);
    } finally {
      btn.disabled = false;
    }
  };
  inputFile.click();
}


function parsearTallesStock(cadena) {
  const result = {};
  if (!cadena) return result;
  const pares = cadena.split(',').map(s => s.trim());
  pares.forEach(par => {
    const [talle, stock] = par.split(':').map(s => s.trim());
    if (talle && stock !== undefined) {
      const stockNum = parseInt(stock, 10);
      if (!isNaN(stockNum)) {
        result[talle] = stockNum;
      }
    }
  });
  return result;
}


function agregarFilaColor(btn) {
  const contenedor = btn.closest('.colores-stock-container');
  const nuevaFila = document.createElement('div');
  nuevaFila.className = 'fila-color d-flex align-items-center mb-1';
  nuevaFila.innerHTML = `
    <input type="text" class="form-control form-control-sm color-input" placeholder="Color">
    <input type="checkbox" class="talle-toggle">
    <span class="small">Talles</span>
    <input type="number" class="form-control form-control-sm stock-input" placeholder="Stock">
    <button class="btn btn-sm btn-outline-danger eliminar-color" title="Eliminar color">✖</button>
  `;
  
  // Insertar antes del botón "Agregar color"
  contenedor.insertBefore(nuevaFila, btn);
  
  // Asignar evento al botón eliminar
  const eliminarBtn = nuevaFila.querySelector('.eliminar-color');
  eliminarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    nuevaFila.remove();
  });
  
  // Asignar evento al checkbox para cambiar el tipo de input
  const toggle = nuevaFila.querySelector('.talle-toggle');
  const input = nuevaFila.querySelector('.stock-input'); // inicialmente es number
  toggle.addEventListener('change', function(e) {
    const estaMarcado = this.checked;
    if (estaMarcado) {
      // Cambiar a modo talles (texto)
      const valorActual = input.value;
      input.type = 'text';
      input.classList.remove('stock-input');
      input.classList.add('talles-input');
      input.placeholder = 'S:30, M:20';
      input.value = valorActual; // conservar el valor si era un número
    } else {
      // Cambiar a modo stock único (number)
      let valorActual = input.value;
      let stock = 0;
      if (input.type === 'text') {
        // Si estaba en modo talles, intentar extraer stock total o dejar 0
        const tallesObj = parsearTallesStock(valorActual);
        stock = Object.values(tallesObj).reduce((a, b) => a + b, 0);
      } else {
        stock = parseInt(valorActual, 10) || 0;
      }
      input.type = 'number';
      input.classList.remove('talles-input');
      input.classList.add('stock-input');
      input.placeholder = 'Stock';
      input.value = stock;
    }
  });

  // ✅ Marcar el producto como "con cambios pendientes" para que se guarde aunque el array esté sincronizado
  const idBase = contenedor.getAttribute('data-id');
  if (idBase) {
    if (!window._productosConCambiosPendientes) window._productosConCambiosPendientes = new Set();
    window._productosConCambiosPendientes.add(idBase);
  }
}

function renderTablaProductos() {
  const container = document.getElementById('tableView');
  if (!container) return;

  const productos = window.todosLosProductos || [];

  let html = `
    <div class="row">
      <div class="col-12">
        <div class="admin-grupos-bar">
          <button id="adminBtnNuevoGrupo" class="btn btn-sm btn-success">+ Nuevo grupo</button>
          ${renderGruposHorizontal(productos)}
        </div>
        <div id="adminSubgruposBar" class="admin-subgrupos-bar"></div>
      </div>
      <div class="col-12">
        <div class="d-flex justify-content-between mb-2">
          <div>
            <button id="btnNuevoProductoTabla" class="btn btn-sm btn-success">➕ Nuevo producto</button>
            <button id="guardarTodosTablaBtn" class="btn btn-sm btn-primary">💾 Guardar todos</button>
          </div>
        </div>
        <div class="tabla-responsive">
          <table class="table table-striped table-hover tabla-productos-admin">
            <thead>
              <tr>
                <th class="th-imagen">Imagen</th>
                <th class="th-fotos-extra">Fotos extra</th>
                <th class="th-producto">Producto</th>
                <th class="th-precio">Precio</th>
                <th class="th-colores">Colores / Talles / Stock</th>
                <th class="th-descripcion">Descripción</th>
                <th class="th-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody id="tabla-productos-body">
              ${renderFilasTabla(productos)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}


function renderGruposHorizontal(productos) {
  const grupos = [...new Set(productos.map(p => p.grupo).filter(Boolean))];
  const subgruposPorGrupo = {};
  productos.forEach(p => {
    if (p.grupo && p.subgrupo) {
      if (!subgruposPorGrupo[p.grupo]) subgruposPorGrupo[p.grupo] = new Set();
      subgruposPorGrupo[p.grupo].add(p.subgrupo);
    }
  });

  let html = '';
  grupos.forEach(grupo => {
    const tieneSub = subgruposPorGrupo[grupo] && subgruposPorGrupo[grupo].size > 0;
    html += `
      <div class="admin-grupo-item" data-grupo="${grupo}">
        <button class="btn btn-outline-secondary btn-sm grupo-btn" data-grupo="${grupo}">
          ${grupo}
        </button>
        ${tieneSub ? `<button class="btn btn-sm btn-link subgrupo-toggle-btn" data-grupo="${grupo}">▼</button>` : ''}
      </div>
    `;
  });
  return html;
}


function renderFilasTabla(productos) {
  return productos.map(p => {
    const idBase = p.id_base || '';
    const nombre = p.nombre || '';
    const precio = p.precio || 0; 
    const descripcion = p.descripcion || '';

    const imagenMiniatura = getVersionUrl(p.imagen_url || '/static/img/fallback.webp', '58');

    const imagenPrincipalHTML = `
      <div class="admin-img-principal-container">
        <button class="btn btn-sm btn-outline-secondary agregar-imagen-principal w-100" data-id="${idBase}" title="Cambiar imagen principal">+</button>
        <img src="${imagenMiniatura}" class="admin-img-thumb" data-modal-url="${p.imagen_url || ''}">
      </div>
    `;
    
    let fotosExtraHTML = `
      <div class="fotos-extra-header">
        <button class="btn btn-sm btn-outline-secondary agregar-foto-extra w-100" data-id="${idBase}">+</button>
      </div>
      <div class="fotos-extra-list" data-id="${idBase}">
    `;

    if (p.fotos_adicionales && p.fotos_adicionales.length) {
      p.fotos_adicionales.forEach(url => {
        fotosExtraHTML += `
          <div class="foto-extra-item d-flex align-items-center justify-content-between mb-1 p-1 border rounded">
            <img src="${getVersionUrl(url, '58')}" class="admin-img-thumb" data-modal-url="${url}">
            <button class="btn btn-sm btn-outline-danger eliminar-foto-extra" data-url="${url}" data-id="${idBase}">✖</button>
          </div>
        `;
      });
    }
    fotosExtraHTML += `</div>`;

    let filasColoresHTML = '';
    const variantes = p.variantes || {};
    const porColor = {};
    Object.values(variantes).forEach(v => {
      const color = v.color;
      if (!porColor[color]) porColor[color] = {};
      porColor[color][v.talle] = v.stock;
    });

    if (Object.keys(porColor).length > 0) {
      Object.entries(porColor).forEach(([color, tallesObj]) => {
        const tieneTalles = Object.keys(tallesObj).some(t => t !== 'unico');
        const tallesStr = tieneTalles ? Object.entries(tallesObj)
          .filter(([t]) => t !== 'unico')
          .map(([t, s]) => `${t}:${s}`).join(', ') : '';
        const stockUnico = !tieneTalles ? (tallesObj['unico'] || 0) : 0;

        // Determinar si el checkbox debe estar marcado (checked)
        const checkedAttr = tieneTalles ? 'checked' : '';

        filasColoresHTML += `
          <div class="fila-color d-flex align-items-center mb-1 fila-color-gap">
            <input type="text" class="form-control form-control-sm color-input" value="${color.replace(/"/g, '&quot;')}" placeholder="Color">
            <input type="checkbox" class="talle-toggle" ${checkedAttr}>
            <span class="small">Talles</span>
            <input type="${tieneTalles ? 'text' : 'number'}" class="form-control form-control-sm ${tieneTalles ? 'talles-input' : 'stock-input'}" 
                   value="${tieneTalles ? tallesStr.replace(/"/g, '&quot;') : stockUnico}" 
                   placeholder="${tieneTalles ? 'S:30, M:20' : 'Stock'}">
            <button class="btn btn-sm btn-outline-danger eliminar-fila-color" title="Eliminar color">✖</button>
          </div>
        `;
      });
    } else {
      // Sin colores: fila por defecto (sin marcar)
      filasColoresHTML = `
        <div class="fila-color d-flex align-items-center mb-1 fila-color-gap">
          <input type="text" class="form-control form-control-sm color-input" placeholder="Color">
          <input type="checkbox" class="talle-toggle">
          <span class="small">Talles</span>
          <input type="number" class="form-control form-control-sm stock-input" placeholder="Stock">
          <button class="btn btn-sm btn-outline-danger eliminar-color" title="Eliminar color">✖</button>
        </div>
      `;
    }

    const agregarColorBtn = `<button class="btn btn-sm btn-outline-success agregar-fila-color mt-1" data-id="${idBase}">➕ Agregar color</button>`;

    const coloresCellHTML = `
      <div class="colores-stock-container" data-id="${idBase}">
        ${filasColoresHTML}
        ${agregarColorBtn}
      </div>
    `;

    const descripcionHTML = `<textarea class="form-control form-control-sm descripcion-textarea" rows="2" data-id="${idBase}">${descripcion.replace(/"/g, '&quot;')}</textarea>`;

    return `
      <tr data-id-base="${idBase}">
        <td>${imagenPrincipalHTML}</td>
        <td><div class="fotos-extra-container" data-id="${idBase}">${fotosExtraHTML}</div></td>
        <td><input type="text" class="editable-input nombre-input form-control form-control-sm" value="${nombre.replace(/"/g, '&quot;')}" data-id="${idBase}" data-campo="nombre"></td>
        <td><input type="number" class="editable-input precio-input form-control form-control-sm" value="${precio}" data-id="${idBase}" data-campo="precio" step="0.01" min="0"></td>
        <td>${coloresCellHTML}</td>
        <td>${descripcionHTML}</td>
        <td>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-warning btn-sm guardar-producto" data-id="${idBase}" title="Guardar">💾</button>
            <button class="btn btn-info btn-sm duplicar-producto" data-id="${idBase}" title="Duplicar">📋</button>
            <button class="btn btn-danger btn-sm eliminar-producto" data-id="${idBase}" title="Eliminar">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}


function mostrarSubgruposHorizontal(grupo, subgrupoActivo = null) {
  const productos = window.todosLosProductos || [];
  const subgrupos = [...new Set(
    productos.filter(p => p.grupo === grupo)
             .map(p => p.subgrupo)
             .filter(Boolean)
  )];
  const barraSub = document.getElementById('adminSubgruposBar');
  if (!barraSub) return;

  let html = '';
  subgrupos.forEach(sub => {
    // Si este subgrupo es el activo, añadir clase 'active'
    const activeClass = (sub === subgrupoActivo) ? 'active' : '';
    html += `
      <button class="btn btn-sm btn-outline-secondary subgrupo-btn ${activeClass}" data-grupo="${grupo}" data-subgrupo="${sub}">
        📂 ${sub}
      </button>
    `;
  });
  html += `<button class="btn btn-sm btn-success agregar-subgrupo-btn" data-grupo="${grupo}">+ Subgrupo</button>`;

  barraSub.innerHTML = html;
  barraSub.classList.add('admin-subgrupos-bar-visible');
  barraSub.dataset.currentGroup = grupo;

  // Solo seleccionar el primer subgrupo si no se pasó ninguno como activo y no hay ningún botón con clase 'active'
  if (!subgrupoActivo) {
    setTimeout(() => {
      const activo = barraSub.querySelector('.subgrupo-btn.active');
      if (!activo) {
        const primerSub = barraSub.querySelector('.subgrupo-btn');
        if (primerSub) primerSub.click();
      }
    }, 30);
  }
}

function ocultarSubgrupos() {
  const barraSub = document.getElementById('adminSubgruposBar');
  if (barraSub) barraSub.classList.remove('admin-subgrupos-bar-visible');
}


async function agregarSubgrupo(grupo) {
  // 🔒 Evita múltiples creaciones simultáneas
  if (window._agregandoSubgrupo) {
    console.warn("Ya hay una operación de creación de subgrupo en curso");
    return;
  }
  window._agregandoSubgrupo = true;

  // Buscar el botón que activó la acción para deshabilitarlo
  const boton = document.querySelector(`.agregar-subgrupo-btn[data-grupo="${grupo}"]`);
  const textoOriginal = boton?.innerHTML;
  if (boton) {
    boton.disabled = true;
    boton.innerHTML = '⏳';
  }

  try {
    const nombreSubgrupo = prompt('Ingrese el nombre del nuevo subgrupo:');
    if (!nombreSubgrupo) return;

    const existe = window.todosLosProductos.some(p => p.grupo === grupo && p.subgrupo === nombreSubgrupo);
    if (existe) {
      alert('El subgrupo ya existe en este grupo.');
      return;
    }

    // Reemplazar substr (obsoleto) por substring
    const tempId = 'nuevo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    const nuevoProducto = {
      id_base: tempId,
      nombre: '(nuevo producto)',
      precio: 0,
      grupo: grupo,
      subgrupo: nombreSubgrupo,
      descripcion: '',
      imagen_url: '',
      fotos_adicionales: [],
    };
    window.todosLosProductos.push(nuevoProducto);
    filtrarProductos(grupo, null);
  } finally {
    window._agregandoSubgrupo = false;
    if (boton) {
      boton.disabled = false;
      boton.innerHTML = textoOriginal || '+ Subgrupo';
    }
  }
}

function filtrarProductos(grupo, subgrupo = null) {
  const productos = window.todosLosProductos || [];
  let filtrados = productos;
  if (grupo && grupo !== 'todos') {
    filtrados = productos.filter(p => p.grupo === grupo);
    if (subgrupo) {
      filtrados = filtrados.filter(p => p.subgrupo === subgrupo);
    }
  }
  const tbody = document.getElementById('tabla-productos-body');
  if (tbody) {
    tbody.innerHTML = renderFilasTabla(filtrados);
  }

  // Actualizar clases activas en botones de grupo
  const grupoBtns = document.querySelectorAll('.grupo-btn');
  grupoBtns.forEach(btn => {
    if (btn.dataset.grupo === grupo) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // ✅ Siempre mostrar la barra de subgrupos si hay un grupo seleccionado (no "Todos")
  if (grupo && grupo !== 'todos') {
      mostrarSubgruposHorizontal(grupo, subgrupo); // ← pasa el subgrupo actual
  } else {
      ocultarSubgrupos();
  }

  // Actualizar clases activas en botones de subgrupo
  const subgrupoBtns = document.querySelectorAll('.subgrupo-btn');
  subgrupoBtns.forEach(btn => {
    if (btn.dataset.grupo === grupo && btn.dataset.subgrupo === subgrupo) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  window.currentAdminSubgrupo = subgrupo;

  // ⭐ Si no se especificó un subgrupo y no hay ninguno activo,
  // seleccionar automáticamente el primer subgrupo disponible (si existe)
  if (!subgrupo) {
    setTimeout(() => {
      const subgrupoActivo = document.querySelector('.subgrupo-btn.active');
      if (!subgrupoActivo) {
        const primerSub = document.querySelector('#adminSubgruposBar .subgrupo-btn');
        if (primerSub) {
          primerSub.click();
        }
      }
    }, 50);
  }
} // <-- CIERRE CORRECTO


function obtenerProductoDesdeFila(fila, idBase) {
  const original = window.todosLosProductos.find(p => p.id_base === idBase) || {};
  const producto = { ...original };

  producto.nombre = fila.querySelector('.nombre-input')?.value || '';
  producto.precio = parseFloat(fila.querySelector('.precio-input')?.value) || 0;
  producto.descripcion = fila.querySelector('.descripcion-textarea')?.value || '';

  const coloresContainer = fila.querySelector('.colores-stock-container');
  const variantes = {};
  const tallesSet = new Set();
  const coloresSet = new Set();

  if (coloresContainer) {
    const filasColor = coloresContainer.querySelectorAll('.fila-color');
    filasColor.forEach(filaColor => {
      const colorInput = filaColor.querySelector('.color-input');
      const toggle = filaColor.querySelector('.talle-toggle');
      const inputDinamico = filaColor.querySelector('.talles-input, .stock-input');
      if (!colorInput || !inputDinamico) return;

      const color = colorInput.value.trim();
      if (!color) return; 

      coloresSet.add(color);
      const esTalle = toggle?.checked || false;

      if (esTalle) {
        const tallesStr = inputDinamico.value;
        const tallesObj = parsearTallesStock(tallesStr);
        Object.entries(tallesObj).forEach(([talle, stock]) => {
          tallesSet.add(talle);
          const key = `${talle}_${color}`.replace(/ /g, '_');
          variantes[key] = {
            talle: talle,
            color: color,
            stock: stock,
            imagen_url: ''
          };
        });
      } else {
        let stock = parseInt(inputDinamico.value, 10);
        if (isNaN(stock)) stock = 0;
        const key = `unico_${color}`.replace(/ /g, '_');
        variantes[key] = {
          talle: 'unico',
          color: color,
          stock: stock,
          imagen_url: ''
        };
        tallesSet.add('unico');
      }
    });
  }

  producto.variantes = variantes;
  producto.tiene_variantes = Object.keys(variantes).length > 0;
  producto.talles = Array.from(tallesSet);
  producto.colores = Array.from(coloresSet);
  producto.stock = Object.values(variantes).reduce((sum, v) => sum + (v.stock || 0), 0);

  const fotosContainer = fila.querySelector('.fotos-extra-container');
  if (fotosContainer) {
    const imagenes = fotosContainer.querySelectorAll('img.admin-img-thumb');
    const fotosUrls = [];
    imagenes.forEach(img => {
      const url = img.getAttribute('data-modal-url');
      if (url) fotosUrls.push(url);
    });
    producto.fotos_adicionales = fotosUrls;
  }

  return producto;
}


async function recargarProductos() {
  try {
    const email = window.cliente?.email;
    if (!email) return;
    const resp = await fetch(`/api/productos?_=${Date.now()}`);
    const data = await resp.json();
    window.todosLosProductos = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(err);
  }
}


function getCurrentSelectedGroup() {
  const activeGroupBtn = document.querySelector('.grupo-btn.active');
  if (activeGroupBtn && activeGroupBtn.dataset.grupo !== 'todos') {
    return activeGroupBtn.dataset.grupo;
  }
  return null;
}


async function agregarNuevoProducto() {
  if (window._agregandoProducto) {
    console.warn("Ya hay una operación de creación de producto en curso");
    return;
  }
  window._agregandoProducto = true;

  const grupoBtnActivo = document.querySelector('.grupo-btn.active');
  const grupoActual = grupoBtnActivo ? grupoBtnActivo.dataset.grupo : null;

  if (!grupoActual) {
    alert('Selecciona un grupo específico (no "Todos") para crear un producto.');
    window._agregandoProducto = false;
    return;
  }

  // ✅ Si hay un subgrupo activo, usarlo; si no, subgrupo queda vacío (permitido)
  let subgrupoActual = '';
  const subgrupoActivo = document.querySelector('#adminSubgruposBar .subgrupo-btn.active');
  if (subgrupoActivo) {
    subgrupoActual = subgrupoActivo.dataset.subgrupo;
  }

  const tempId = 'nuevo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  const nuevoProducto = {
    id_base: tempId,
    nombre: '',
    precio: 0,
    grupo: grupoActual,
    subgrupo: subgrupoActual,   // puede ser cadena vacía
    descripcion: '',
    imagen_url: '',
    fotos_adicionales: [],
  };

  window.todosLosProductos.push(nuevoProducto);
  // Mostrar el grupo sin filtrar por subgrupo (para que el producto nuevo aparezca)
  filtrarProductos(grupoActual, subgrupoActual || null);
  window._agregandoProducto = false;
}

async function guardarTodosProductos() {
  if (window._guardandoTodos) {
    alert("⏳ Ya hay un guardado masivo en curso. Espera un momento.");
    return;
  }
  window._guardandoTodos = true;

  const btnGuardarTodos = document.getElementById('guardarTodosTablaBtn');
  const textoOriginalBtn = btnGuardarTodos?.innerHTML;
  if (btnGuardarTodos) {
    btnGuardarTodos.disabled = true;
    btnGuardarTodos.textContent = 'Guardando todos...';
  }

  const filas = document.querySelectorAll('#tabla-productos-body tr');
  if (filas.length === 0) {
    if (btnGuardarTodos) {
      btnGuardarTodos.disabled = false;
      btnGuardarTodos.textContent = textoOriginalBtn || '💾 Guardar todos';
    }
    window._guardandoTodos = false;
    return;
  }

  // 🔍 Recopilar productos con cambios reales o marcados como pendientes
  const productosModificados = [];
  filas.forEach(fila => {
    const idBase = fila.dataset.idBase;
    if (!idBase) return;
    
    const original = window.todosLosProductos.find(p => p.id_base === idBase);
    if (!original) return;
    
    const actual = obtenerProductoDesdeFila(fila, idBase);
    // Considerar cambios si:
    // 1. El producto ha cambiado (comparación normal)
    // 2. O está marcado como pendiente (por duplicación o agregado de filas de color)
    const tieneCambios = productoHaCambiado(original, actual) ||
                         (window._productosConCambiosPendientes && window._productosConCambiosPendientes.has(idBase));
    
    if (tieneCambios) {
      productosModificados.push(actual);
    }
  });

  if (productosModificados.length === 0) {
    alert("✅ No hay cambios para guardar.");
    if (btnGuardarTodos) {
      btnGuardarTodos.disabled = false;
      btnGuardarTodos.textContent = textoOriginalBtn || '💾 Guardar todos';
    }
    window._guardandoTodos = false;
    return;
  }

  let guardados = 0;
  const errores = [];

  for (const producto of productosModificados) {
    try {
      const formDiv = { dataset: { idBase: producto.id_base } };
      const resultado = await guardarProducto(producto, formDiv, true);
      if (resultado) guardados++;
    } catch (error) {
      errores.push(producto.nombre || producto.id_base);
    }
  }

  await recargarProductos();
  renderTablaProductos();

  // ✅ Limpiar la marca de productos pendientes después de guardar
  if (window._productosConCambiosPendientes) {
    window._productosConCambiosPendientes.clear();
  }

  const mensaje = `Guardados ${guardados} de ${productosModificados.length} productos modificados.`;
  if (errores.length) {
    alert(`${mensaje}\nErrores: ${errores.join(', ')}`);
  } else {
    alert(mensaje);
  }

  if (btnGuardarTodos) {
    btnGuardarTodos.disabled = false;
    btnGuardarTodos.textContent = textoOriginalBtn || '💾 Guardar todos';
  }
  window._guardandoTodos = false;
}
// Función auxiliar para detectar cambios
function productoHaCambiado(original, actual) {
  const ignorar = new Set(['timestamp', 'fecha_actualizacion', 'actualizado', 'email_vendedor']);
  const claves = new Set([...Object.keys(original), ...Object.keys(actual)]);
  for (let clave of claves) {
    if (ignorar.has(clave)) continue;
    const valOrig = original[clave];
    const valAct = actual[clave];
    // Comparación profunda simple (arrays/objetos se comparan serializados)
    if (JSON.stringify(valOrig) !== JSON.stringify(valAct)) {
      return true;
    }
  }
  return false;
}


function agregarNuevoGrupo() {
  // 🔒 Evita múltiples creaciones simultáneas
  if (window._agregandoGrupo) {
    console.warn("Ya hay una operación de creación de grupo en curso");
    return;
  }
  window._agregandoGrupo = true;

  const nombreGrupo = prompt('Ingrese el nombre del nuevo grupo:');
  if (!nombreGrupo) {
    window._agregandoGrupo = false;
    return;
  }

  if (window.todosLosProductos.some(p => p.grupo === nombreGrupo)) {
    alert('El grupo ya existe.');
    window._agregandoGrupo = false;
    return;
  }

  const nuevoProducto = {
    id_base: 'nuevo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11),
    nombre: '(nuevo producto)',
    precio: 0,
    grupo: nombreGrupo,
    subgrupo: '',
    descripcion: '',
    imagen_url: '',
    fotos_adicionales: [],
  };
  window.todosLosProductos.push(nuevoProducto);
  renderTablaProductos();

  setTimeout(() => {
    const nuevoGrupoHeader = document.querySelector(`.grupo-btn[data-grupo="${nombreGrupo}"]`);
    if (nuevoGrupoHeader) {
      nuevoGrupoHeader.click();
    }
    window._agregandoGrupo = false;
  }, 100);
}


if (window.modoAdmin) {
  const container = document.getElementById('adminFormsContainer');
  if (container) container.classList.remove('d-none');

  const formsList = document.getElementById('formsList');
  if (formsList) formsList.classList.add('d-none');

  const configurarCA = document.getElementById('configurarCA');
  if (configurarCA) configurarCA.classList.remove('d-none');

  const tableView = document.getElementById('tableView');
  if (tableView) tableView.classList.add('d-block');

  recargarProductos().then(() => {
    renderTablaProductos();
    setTimeout(() => {
      const primerGrupo = document.querySelector('.grupo-btn');
      if (primerGrupo) {
        primerGrupo.click();
        // Esperar a que se renderice la barra de subgrupos
        setTimeout(() => {
          const primerSubgrupo = document.querySelector('#adminSubgruposBar .subgrupo-btn');
          if (primerSubgrupo) {
            primerSubgrupo.click();
          }
        }, 100);
      }
    }, 50);
  });

  const logoutWrapper = document.getElementById('logoutAdminWrapper');
  if (logoutWrapper) logoutWrapper.classList.remove('d-none');

  const configurarMP = document.getElementById('configurarMP');
  if (configurarMP) configurarMP.classList.remove('d-none');

  const loginToggleBtn = document.getElementById('loginToggleBtn');
  if (loginToggleBtn) loginToggleBtn.classList.add('d-none');

  const adminContainer = document.getElementById('adminFormsContainer');
  if (adminContainer) {
    adminContainer.addEventListener('click', async (e) => {
      const target = e.target;

      if (target.classList.contains('admin-img-thumb')) {
        e.preventDefault();
        const url = target.getAttribute('data-modal-url');
        if (url) openModal(url);
        return;
      }

      if (target.id === 'guardarTodosTablaBtn') {
        e.preventDefault();
        await guardarTodosProductos();
        return;
      }

      if (target.id === 'btnNuevoProductoTabla') {
        e.preventDefault();
        agregarNuevoProducto();
        return;
      }

      if (target.id === 'adminBtnNuevoGrupo') {
        e.preventDefault();
        agregarNuevoGrupo();
        return;
      }

      if (target.classList.contains('agregar-subgrupo-btn')) {
        e.preventDefault();
        const grupo = target.dataset.grupo;
        if (grupo) agregarSubgrupo(grupo);
        return;
      }

      if (target.classList.contains('guardar-producto')) {
        e.preventDefault();
        const idBase = target.dataset.id;
        const fila = target.closest('tr');
        if (fila && idBase) {
          const producto = obtenerProductoDesdeFila(fila, idBase);
          await guardarProducto(producto, { dataset: { idBase } }, true);
        }
        return;
      }

      if (target.classList.contains('duplicar-producto')) {
        e.preventDefault();
        const idBase = target.dataset.id;
        if (idBase) duplicarProductoDesdeCard(idBase);
        return;
      }

      if (target.classList.contains('eliminar-producto')) {
        e.preventDefault();
        const idBase = target.dataset.id;
        if (idBase && confirm('¿Eliminar este producto?')) {
          eliminarProducto(idBase);
        }
        return;
      }

      if (target.classList.contains('agregar-fila-color')) {
        e.preventDefault();
        agregarFilaColor(target);
        return;
      }

      if (target.classList.contains('eliminar-foto-extra')) {
        e.preventDefault();
        const idBase = target.dataset.id;
        const url = target.dataset.url;
        if (idBase && url) eliminarFotoExtra(idBase, url);
        return;
      }

      if (target.classList.contains('agregar-foto-extra')) {
        e.preventDefault();
        agregarFotoExtra(target);
        return;
      }

      if (target.classList.contains('agregar-imagen-principal')) {
        e.preventDefault();
        agregarImagenPrincipal(target);
        return;
      }

      if (target.classList.contains('eliminar-color') || target.classList.contains('eliminar-fila-color')) {
        e.preventDefault();
        const filaColor = target.closest('.fila-color');
        if (filaColor) filaColor.remove();
        return;
      }

      if (target.classList.contains('grupo-btn')) {
        e.preventDefault();
        const grupo = target.dataset.grupo;
        if (grupo) filtrarProductos(grupo);
        return;
      }

      if (target.classList.contains('subgrupo-toggle-btn')) {
        e.preventDefault();
        const grupo = target.dataset.grupo;
        if (grupo) {
          const barraSub = document.getElementById('adminSubgruposBar');
          if (barraSub && barraSub.classList.contains('admin-subgrupos-bar-visible') && barraSub.dataset.currentGroup === grupo) {
            ocultarSubgrupos();
          } else {
            mostrarSubgruposHorizontal(grupo);
            if (barraSub) barraSub.dataset.currentGroup = grupo;
          }
        }
        return;
      }

      if (target.classList.contains('subgrupo-btn')) {
        e.preventDefault();
        const grupo = target.dataset.grupo;
        const subgrupo = target.dataset.subgrupo;
        if (grupo && subgrupo) filtrarProductos(grupo, subgrupo);
        return;
      }
    });
  }

  adminContainer.addEventListener('change', (e) => {
    const target = e.target;
    if (target.classList.contains('talle-toggle')) {
      const filaColor = target.closest('.fila-color');
      if (!filaColor) return;
      const inputDinamico = filaColor.querySelector('.talles-input, .stock-input');
      if (!inputDinamico) return;
      const estaMarcado = target.checked;
      if (estaMarcado) {
        let valorActual = inputDinamico.value;
        if (inputDinamico.type === 'number') {
          const stock = parseInt(valorActual, 10) || 0;
          valorActual = `unico:${stock}`;
        }
        inputDinamico.type = 'text';
        inputDinamico.classList.remove('stock-input');
        inputDinamico.classList.add('talles-input');
        inputDinamico.placeholder = 'S:30, M:20';
        inputDinamico.value = valorActual;
      } else {
        let valorActual = inputDinamico.value;
        let stock = 0;
        if (inputDinamico.type === 'text') {
          const tallesObj = parsearTallesStock(valorActual);
          if (tallesObj['unico']) {
            stock = tallesObj['unico'];
          } else {
            stock = Object.values(tallesObj).reduce((a, b) => a + b, 0);
          }
        } else {
          stock = parseInt(valorActual, 10) || 0;
        }
        inputDinamico.type = 'number';
        inputDinamico.classList.remove('talles-input');
        inputDinamico.classList.add('stock-input');
        inputDinamico.placeholder = 'Stock';
        inputDinamico.value = stock;
      }
    }
  });
}

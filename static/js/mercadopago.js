// mercadopago.js - Lógica de pagos, envíos y QR

(function() {
  // -------------------- VARIABLES GLOBALES DEL MÓDULO --------------------
  let costoEnvio = 0;
  let pagando = false;
  let generandoQR = false;      // Nueva variable para evitar doble QR
  let pollingInterval = null;

  // -------------------- FUNCIONES DE ENVÍO Y CARRITO --------------------
  function resetEnvio() {
    costoEnvio = 0;
    window.costoEnvio = 0;
    const divCosto = document.getElementById('costoEnvioMostrado');
    if (divCosto) divCosto.innerHTML = '';
  }
  window.resetEnvio = resetEnvio;

  function actualizarCarritoConEnvio() {
    let subtotal = 0;
    if (window.carrito && window.carrito.length) {
      subtotal = window.carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    }
    const envio = (typeof window.costoEnvio !== 'undefined') ? window.costoEnvio : costoEnvio;
    let total = subtotal + envio;
    const totalSpan = document.getElementById('totalCarrito');
    if (totalSpan) totalSpan.textContent = total.toFixed(2);
    
    let envioLinea = document.getElementById('envioLinea');
    if (!envioLinea && window.carrito && window.carrito.length) {
      const lista = document.getElementById('listaCarrito');
      if (lista) {
        envioLinea = document.createElement('li');
        envioLinea.id = 'envioLinea';
        envioLinea.className = 'envio-linea'; 
        lista.appendChild(envioLinea);
      }
    }
    if (envioLinea) {
      envioLinea.innerHTML = '';
      const div = document.createElement('div');
      div.className = 'envio-linea-contenido';
      const spanLabel = document.createElement('span');
      spanLabel.textContent = 'Envío';
      const spanValue = document.createElement('span');
      spanValue.textContent = `$${envio.toFixed(2)}`;
      div.appendChild(spanLabel);
      div.appendChild(spanValue);
      envioLinea.appendChild(div);
    }
  }
  window.actualizarCarritoConEnvio = actualizarCarritoConEnvio;

  // Cálculo de envío (para el botón dentro del carrito)
  async function calcularEnvio() {
    const emailVendedor = window.cliente?.email;
    if (!emailVendedor) {
      alert("No se pudo identificar al vendedor");
      return;
    }

    const codigoPostal = document.getElementById('codigo_postal')?.value.trim();
    if (!codigoPostal) {
      alert("Ingresá tu código postal para calcular el envío");
      return;
    }

    let pesoTotalKg = 0;
    for (const item of (window.carrito || [])) {
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

    const btnCalcular = document.getElementById('btnCalcularEnvio');
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
        costoEnvio = data.costo;
        window.costoEnvio = costoEnvio;
        const divCosto = document.getElementById("costoEnvioMostrado");
        if (divCosto) divCosto.innerHTML = `<strong>Envío:</strong> $${costoEnvio.toFixed(2)}`;
        actualizarCarritoConEnvio();
      } else {
        alert("No se pudo calcular el envío: " + (data.error || "Error desconocido"));
        costoEnvio = 0;
        window.costoEnvio = 0;
        const divCosto = document.getElementById("costoEnvioMostrado");
        if (divCosto) divCosto.innerHTML = "";
      }
    } catch (err) {
      console.error(err);
      alert("Error al calcular envío. Verifica tu conexión.");
      costoEnvio = 0;
      window.costoEnvio = 0;
    } finally {
      if (btnCalcular) {
        btnCalcular.disabled = false;
        btnCalcular.textContent = 'Calcular envío';
      }
    }
  }
  window.calcularEnvio = calcularEnvio;

  // Cálculo de envío para el paso de dirección (usado por core.js)
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
    for (const item of (window.carrito || [])) {
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
        window.envioCalculado = true;
        const btnSiguiente = document.getElementById('btnSiguienteDatos');
        if (btnSiguiente) {
          btnSiguiente.classList.remove('paso-oculto');
        }
      } else {
        alert("No se pudo calcular el envío: " + (data.error || "Error desconocido"));
        window.costoEnvio = 0;
        document.getElementById("costoEnvioMostrado").innerHTML = "";
        window.envioCalculado = false;
        const btnSiguiente = document.getElementById('btnSiguienteDatos');
        if (btnSiguiente) btnSiguiente.classList.add('paso-oculto');
      }
    } catch (err) {
      console.error(err);
      alert("Error al calcular envío. Verifica tu conexión.");
      window.costoEnvio = 0;
      window.envioCalculado = false;
      const btnSiguiente = document.getElementById('btnSiguienteDatos');
      if (btnSiguiente) btnSiguiente.classList.add('paso-oculto');
    } finally {
      if (btnCalcular) {
        btnCalcular.disabled = false;
        btnCalcular.textContent = 'Calcular envío';
      }
    }
  }
  window.calcularEnvioPaso = calcularEnvioPaso;

  // -------------------- VERIFICACIÓN DE STOCK UI --------------------
  function actualizarStockUI(stockActualizado) {
    if (!stockActualizado) return;
    for (const [key, stock] of Object.entries(stockActualizado)) {
      const [id_base, talle, color] = key.split('_');
      const talleSelect = document.getElementById(`talle_${id_base}`);
      const cantidadInput = document.getElementById(`cantidad_${id_base}`);
      const agregarBtn = document.getElementById(`btn_agregar_${id_base}`);
      if (talleSelect) {
        if (typeof actualizarStockPorTalle === 'function') {
          actualizarStockPorTalle(id_base, talle, color || null);
        }
      } else if (cantidadInput) {
        cantidadInput.max = stock;
        if (stock <= 0) {
          cantidadInput.disabled = true;
          cantidadInput.value = 0;
          if (agregarBtn) {
            agregarBtn.disabled = true;
            agregarBtn.textContent = '❌ Sin stock';
          }
        } else {
          cantidadInput.disabled = false;
          if (agregarBtn) {
            agregarBtn.disabled = false;
            agregarBtn.textContent = 'Agregar al carrito';
          }
        }
      }
    }
  }

  // -------------------- PAGO CON CHECKOUT PRO --------------------
  async function pagarTodoJunto() {
    if (pagando) {
      console.warn("Ya hay un proceso de pago en curso");
      return;
    }
    pagando = true;

    const carrito = window.carrito || [];
    if (carrito.length === 0) {
      alert("❌ El carrito está vacío");
      pagando = false;
      return;
    }

    const nombreInput = document.getElementById('nombre');
    const apellidoInput = document.getElementById('apellido');
    const emailInput = document.getElementById('email_cliente');
    const telefonoInput = document.getElementById('telefono');
    const dniInput = document.getElementById('dni');

    if (!nombreInput || !apellidoInput || !emailInput) {
      alert("❌ Por favor completa nombre, apellido y email");
      pagando = false;
      return;
    }

    const nombre = nombreInput.value.trim();
    const apellido = apellidoInput.value.trim();
    const emailCliente = emailInput.value.trim();
    const telefono = telefonoInput?.value?.trim() || "";
    const dni = dniInput?.value?.trim() || ""; 

    if (!nombre || !apellido || !emailCliente) {
      alert("❌ Nombre, apellido y email son obligatorios");
      pagando = false;
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailCliente)) {
      alert("❌ Por favor ingresa un email válido");
      pagando = false;
      return;
    }
    
    if (dni && !/^\d{7,8}$/.test(dni)) {
        alert("❌ El DNI debe tener 7 u 8 dígitos numéricos (sin puntos)");
        pagando = false;
        return;
    }

    const tieneEnvio = (window.costoEnvio || costoEnvio) > 0;
    let calle = "", numero = "", localidad = "", provinciaCodigo = "", codigoPostal = "";

    if (tieneEnvio) {
      const calleInput = document.getElementById('calle');
      const numeroInput = document.getElementById('numero');
      const localidadInput = document.getElementById('localidad');
      const provinciaSelect = document.getElementById('provincia_codigo');
      const codigoPostalInput = document.getElementById('codigo_postal');

      if (!calleInput || !numeroInput || !localidadInput || !provinciaSelect || !codigoPostalInput) {
        alert("❌ Error: faltan campos de dirección en el formulario");
        pagando = false;
        return;
      }

      calle = calleInput.value.trim();
      numero = numeroInput.value.trim();
      localidad = localidadInput.value.trim();
      provinciaCodigo = provinciaSelect.value;
      codigoPostal = codigoPostalInput.value.trim();

      if (!calle || !numero || !localidad || !provinciaCodigo || !codigoPostal) {
        alert("❌ Para el envío, todos los campos de dirección son obligatorios");
        pagando = false;
        return;
      }
    }

    const clienteDireccion = tieneEnvio ? {
      calle, numero, localidad,
      provincia_codigo: provinciaCodigo,
      codigo_postal: codigoPostal
    } : {};

    const itemsVerificar = carrito.filter(item => item.id_base).map(item => ({
      id_base: item.id_base,
      talle: item.talle || 'unico',
      color: item.color || 'unico',
      cantidad: item.cantidad,
      precio: item.precio
    }));

    if (itemsVerificar.length === 0) {
      alert("❌ El carrito no contiene productos válidos.");
      pagando = false;
      return;
    }

    const btnPagarFinal = document.getElementById('btnPagarFinal');
    if (btnPagarFinal) {
      btnPagarFinal.disabled = true;
      btnPagarFinal.textContent = 'Verificando...';
    }

    const emailVendedor = window.TARGET_EMAIL || window.cliente?.email;
    if (!emailVendedor) {
      alert("❌ No se pudo identificar al vendedor");
      if (btnPagarFinal) {
        btnPagarFinal.disabled = false;
        btnPagarFinal.textContent = 'Pagar con Mercado Pago';
      }
      pagando = false;
      return;
    }

    try {
      // 1. Verificar stock y precios
      const verifyResp = await fetch(`/verificar-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_vendedor: emailVendedor, carrito: itemsVerificar })
      });
      const verifyData = await verifyResp.json();

      if (!verifyData.ok) {
        if (verifyData.precios_desactualizados) {
          let mensaje = "❌ Los siguientes productos cambiaron de precio:\n";
          verifyData.precios_desactualizados.forEach(item => {
            mensaje += `- ${item.nombre}: era $${item.precio_cliente}, ahora $${item.precio_actual}\n`;
          });
          mensaje += "\nActualizá la página para ver los nuevos precios.";
          alert(mensaje);
          if (typeof recargarProductos === 'function') await recargarProductos();
        } else if (verifyData.faltantes) {
          let mensaje = "❌ Stock insuficiente:\n";
          verifyData.faltantes.forEach(item => {
            mensaje += `- ${item.nombre} (talle: ${item.talle}): disponible ${item.disponible}, solicitado ${item.solicitado}\n`;
          });
          alert(mensaje);
          if (verifyData.stock_actualizado) actualizarStockUI(verifyData.stock_actualizado);
        } else {
          alert("❌ Error en verificación: " + (verifyData.error || "Desconocido"));
        }
        if (btnPagarFinal) {
          btnPagarFinal.disabled = false;
          btnPagarFinal.textContent = 'Pagar con Mercado Pago';
        }
        pagando = false;
        return;
      }

      // 2. Construir payload para /pagar
      btnPagarFinal.textContent = 'Generando pago...';

      let subtotalProductos = 0;
      const itemsCarrito = carrito.map(item => {
        const precio = parseFloat(item.precio);
        const cantidad = parseInt(item.cantidad);
        subtotalProductos += precio * cantidad;
        return {
          nombre: item.nombre,
          precio: precio,
          cantidad: cantidad,
          talle: item.talle || "",
          color: item.color || "",
          id_base: item.id_base || "",
          grupo: item.grupo || "",
          subgrupo: item.subgrupo || "",
          subtotal: precio * cantidad
        };
      });

      const totalFinal = subtotalProductos + (window.costoEnvio || costoEnvio);
      const orden_id = 'ORD_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);

      const payload = {
        email_vendedor: emailVendedor,
        carrito: itemsCarrito,
        total: totalFinal,
        costo_envio: window.costoEnvio || costoEnvio,
        cliente_nombre: nombre,
        cliente_apellido: apellido,          // 👈 nuevo
        cliente_dni: dni,         
        cliente_email: emailCliente,
        cliente_telefono: telefono,
        cliente_direccion: clienteDireccion,
        orden_id: orden_id,
        url_retorno: window.location.origin + window.location.pathname   // URL base sin parámetros
      };

      // 3. Llamar a /pagar
      const response = await fetch(`/pagar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.error) {
        alert("❌ Error: " + data.error);
      } else if (data.init_point) {
        localStorage.setItem('ultima_orden_id', orden_id);
        window.location.href = data.init_point;
      } else {
        alert("⚠️ No se pudo obtener la URL de pago. Intenta de nuevo.");
      }
    } catch (error) {
      console.error(error);
      alert("❌ Error al procesar el pago: " + error.message);
    } finally {
      if (btnPagarFinal) {
        btnPagarFinal.disabled = false;
        btnPagarFinal.textContent = 'Pagar con Mercado Pago';
      }
      pagando = false;
    }
  }
  window.pagarTodoJunto = pagarTodoJunto;

  // -------------------- PAGO CON QR --------------------
  function iniciarPolling(ordenId, emailVendedor) {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(async () => {
      try {
        const resp = await fetch(`/api/estado-pago?orden_id=${ordenId}&email=${encodeURIComponent(emailVendedor)}`);
        const data = await resp.json();
        if (data.estado === 'aprobado') {
          clearInterval(pollingInterval);
          cerrarModalQR();
          alert("✅ Pago aprobado. Gracias por tu compra.");
          if (typeof vaciarCarrito === 'function') vaciarCarrito();
          window.location.href = `/preview?email=${emailVendedor}&pago=success&orden_id=${ordenId}`;
        } else if (data.estado === 'rechazado') {
          clearInterval(pollingInterval);
          cerrarModalQR();
          alert("❌ El pago fue rechazado. Podés intentar de nuevo.");
        }
      } catch (err) {
        console.warn("Error en polling", err);
      }
    }, 3000);
  }

  function mostrarModalQR(qrImageBase64, ordenId) {
    let modal = document.getElementById('qrModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'qrModal';
      modal.className = 'modal-qr';
      modal.innerHTML = `
        <div class="modal-qr-content">
          <span class="modal-qr-close">&times;</span>
          <h3>Pago con QR</h3>
          <p>Escaneá este código con la app de Mercado Pago</p>
          <img id="qrImage" src="" alt="Código QR" class="qr-image">
          <p id="qrStatus">Esperando pago...</p>
        </div>
      `;
      document.body.appendChild(modal);
      modal.querySelector('.modal-qr-close').onclick = () => cerrarModalQR();
    }
    const img = modal.querySelector('#qrImage');
    img.src = qrImageBase64;
    modal.classList.add('modal-visible');
    window.currentQR_OrderId = ordenId;
  }

  function cerrarModalQR() {
    const modal = document.getElementById('qrModal');
    if (modal) {
      modal.classList.remove('modal-visible');
    }
    if (pollingInterval) clearInterval(pollingInterval);
  }

  async function pagarConQR() {
    if (generandoQR) {
      console.warn("Ya se está generando un QR, esperá un momento.");
      return;
    }
    generandoQR = true;
    const btnPagarQR = document.getElementById('btnPagarQR');
    const originalText = btnPagarQR?.innerHTML;
    if (btnPagarQR) {
      btnPagarQR.disabled = true;
      btnPagarQR.innerHTML = '⏳ Generando QR...';
    }

    try {
      const nombre = document.getElementById('nombre').value.trim();
      const apellido = document.getElementById('apellido').value.trim();
      const emailCliente = document.getElementById('email_cliente').value.trim();
      const telefono = document.getElementById('telefono').value.trim();
      const dni = document.getElementById('dni')?.value.trim() || '';
      
      if (!nombre || !emailCliente) {
        alert("Completá tus datos antes de pagar.");
        return;
      }

      if (!window.carrito || window.carrito.length === 0) {
        alert("El carrito está vacío.");
        return;
      }

      // Aplicar descuento del 8%
      const descuento = 0.08;
      const itemsParaMP = window.carrito.map(item => {
        const unitPriceDisc = Math.round((item.precio * (1 - descuento)) * 100) / 100;
        return {
          title: item.nombre,
          description: item.nombre,
          quantity: item.cantidad,
          unit_price: unitPriceDisc,
          sku_number: item.id_base,
          category: "others",
          unit_measure: "unit",
          imagen_url: item.imagen_url || ''
        };
      });

      const totalConDescuento = itemsParaMP.reduce((sum, it) => sum + (it.unit_price * it.quantity), 0);
      const externalRef = `QR_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

      const payload = {
          email_vendedor: window.cliente.email,
          total: totalConDescuento,
          external_reference: externalRef,
          title: `Pedido ${externalRef}`,
          description: `Compra en ${window.cliente.email}`,
          items: itemsParaMP,
          notification_url: "https://mpagina.onrender.com/webhook_mp",  // mismo webhook unificado
          // 👇 nuevos campos
          cliente_nombre: nombre,
          cliente_apellido: apellido,
          cliente_email: emailCliente,
          cliente_telefono: telefono,
          cliente_dni: dni
      };

      const resp = await fetch('/api/crear-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (data.ok) {
        const emailVendedor = window.cliente.email;
        mostrarModalQR(data.qr_image, data.orden_id);
        iniciarPolling(data.orden_id, emailVendedor);
      } else {
        alert("Error al generar QR: " + (data.error || data.detalle));
      }
    } catch (err) {
      console.error(err);
      alert("Error de red: " + err.message);
    } finally {
      generandoQR = false;
      if (btnPagarQR) {
        btnPagarQR.disabled = false;
        btnPagarQR.innerHTML = originalText || 'Pagar con QR';
      }
    }
  }
  window.pagarConQR = pagarConQR;

  // -------------------- PAGO CON TRANSFERENCIA --------------------
  async function mostrarDatosBancarios(ordenId) {
    const email = window.cliente?.email;
    if (!email) return;

    const totalBase = window.carrito ? window.carrito.reduce((s, i) => s + (i.precio * i.cantidad), 0) : 0;
    const totalConDescuento = Math.round((totalBase * 0.91) * 100) / 100;

    const resp = await fetch(`/api/config-tienda?email=${encodeURIComponent(email)}`);
    const data = await resp.json();
    const { banco, cbu, alias, titular } = data;

    let modal = document.getElementById('modalTransferencia');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modalTransferencia';
      modal.className = 'modal-qr';
      modal.innerHTML = `
        <div class="modal-qr-content">
          <span class="modal-qr-close">&times;</span>
          <h3>Pago por transferencia bancaria</h3>
          <p>¡Gracias por tu compra! Tu pedido N° <strong>${ordenId}</strong> fue registrado.</p>
          <p>Para completar el pago, transferí el monto total a la siguiente cuenta:</p>
          <div style="background:#f8f9fa; padding:15px; border-radius:8px; margin:15px 0;" id="datosBancarios"></div>
          <p>⚠️ Una vez realizada la transferencia, el vendedor verificará el pago y confirmará tu pedido.</p>
          <button id="cerrarModalTransferencia" class="btn btn-primary mt-2">Cerrar</button>
        </div>
      `;
      document.body.appendChild(modal);
      modal.querySelector('.modal-qr-close').onclick = () => {
        modal.classList.remove('modal-visible');
        window.location.reload();
      };
      modal.querySelector('#cerrarModalTransferencia').onclick = () => {
        modal.classList.remove('modal-visible');
        window.location.reload();
      };
    }

    const container = modal.querySelector('#datosBancarios');
    if (banco || cbu || alias || titular) {
      container.innerHTML = `
        ${banco ? `<strong>Banco:</strong> ${banco}<br>` : ''}
        ${cbu ? `<strong>CBU/CVU:</strong> ${cbu}<br>` : ''}
        ${alias ? `<strong>Alias:</strong> ${alias}<br>` : ''}
        ${titular ? `<strong>Titular:</strong> ${titular}<br>` : ''}
        <strong>Monto (con descuento del 9%):</strong> $${totalConDescuento.toFixed(2)}
      `;
    } else {
      container.innerHTML = `<p>El vendedor aún no configuró sus datos bancarios. Por favor, contactalo para coordinar el pago.</p>`;
    }
    modal.classList.add('modal-visible');
  }

  async function pagarConTransferencia() {
    const nombre = document.getElementById('nombre').value.trim();
    const emailCliente = document.getElementById('email_cliente').value.trim();
    if (!nombre || !emailCliente) {
      alert("Completá tus datos antes de pagar.");
      return;
    }
    const telefono = document.getElementById('telefono')?.value.trim() || '';

    const totalBase = window.carrito ? window.carrito.reduce((s, i) => s + (i.precio * i.cantidad), 0) : 0;
    const totalConDescuento = Math.round((totalBase * 0.91) * 100) / 100;

    const payload = {
      email_vendedor: window.cliente?.email,
      carrito: window.carrito,
      cliente_nombre: nombre,
      cliente_email: emailCliente,
      cliente_telefono: telefono,
      total: totalConDescuento
    };

    const btn = document.getElementById('btnPagarTransferencia');
    const originalText = btn?.innerHTML;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⏳ Procesando...';
    }

    try {
      const resp = await fetch('/api/crear-orden-transferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (data.ok) {
        if (typeof vaciarCarrito === 'function') vaciarCarrito();
        mostrarDatosBancarios(data.orden_id);
      } else {
        alert("❌ Error: " + (data.error || "No se pudo crear la orden"));
      }
    } catch (err) {
      alert("Error de red: " + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText || '🏦 Pagar con transferencia';
      }
    }
  }
  window.pagarConTransferencia = pagarConTransferencia;

  // -------------------- BOTÓN DE TRANSFERENCIA (dinámico) --------------------
  function agregarBotonTransferencia() {
    const pasoDatos = document.getElementById('pasoDatos');
    if (!pasoDatos) return;
    if (document.getElementById('btnPagarTransferencia')) return;

    let contenedorBotones = pasoDatos.querySelector('.d-flex.gap-2.justify-content-center');
    if (!contenedorBotones) {
      contenedorBotones = document.createElement('div');
      contenedorBotones.className = 'd-flex gap-2 justify-content-center mt-3';
      pasoDatos.appendChild(contenedorBotones);
    }

    const btnTransfer = document.createElement('button');
    btnTransfer.id = 'btnPagarTransferencia';
    btnTransfer.className = 'btn btn-primary btn-lg';
    btnTransfer.innerHTML = '🏦 Pagar con transferencia';
    btnTransfer.addEventListener('click', pagarConTransferencia);
    contenedorBotones.appendChild(btnTransfer);
  }
  window.agregarBotonTransferencia = agregarBotonTransferencia;

  // -------------------- ASIGNACIÓN DE EVENTOS (robusta para carga estática/dinámica) --------------------
  function asignarEventos() {
    // Botón pagar principal (Checkout Pro)
    const btnPagar = document.getElementById('btnPagarFinal');
    if (btnPagar && !btnPagar._listenerAsignado) {
      btnPagar.addEventListener('click', pagarTodoJunto);
      btnPagar._listenerAsignado = true;
    }
    // Botón calcular envío (dentro del carrito)
    const btnCalcular = document.getElementById('btnCalcularEnvio');
    if (btnCalcular && !btnCalcular._listenerAsignado) {
      btnCalcular.addEventListener('click', calcularEnvio);
      btnCalcular._listenerAsignado = true;
    }
    // Botón calcular envío paso (dentro de dirección)
    const btnCalcularPaso = document.getElementById('btnCalcularEnvioPaso');
    if (btnCalcularPaso && !btnCalcularPaso._listenerAsignado) {
      btnCalcularPaso.addEventListener('click', calcularEnvioPaso);
      btnCalcularPaso._listenerAsignado = true;
    }
    // Botón pagar con QR
    const btnPagarQR = document.getElementById('btnPagarQR');
    if (btnPagarQR && !btnPagarQR._listenerAsignado) {
      btnPagarQR.addEventListener('click', pagarConQR);
      btnPagarQR._listenerAsignado = true;
    }
    const btnDesafio = document.getElementById('btnDesafio');
    if (btnDesafio && !btnDesafio._listenerAsignado) {
        btnDesafio.addEventListener('click', async () => {
            const email = window.cliente?.email;
            if (!email) {
                alert('No se pudo identificar al vendedor');
                return;
            }
            try {
                const response = await fetch(`/desafio/preferencia?email=${encodeURIComponent(email)}`);
                const data = await response.json();
                if (data.init_point) {
                    window.location.href = data.init_point;
                } else {
                    alert('Error: ' + (data.error || 'No se obtuvo URL de pago'));
                }
            } catch (err) {
                alert('Error de red: ' + err.message);
            }
        });
        btnDesafio._listenerAsignado = true;
    }
    // El botón de transferencia se agrega dinámicamente, no necesita evento aquí, pero sí la función global.
  }

  // Ejecutar asignación de eventos cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', asignarEventos);
  } else {
    asignarEventos();
  }
})();

(function() {
  let costoEnvio = 0;
  let pagando = false;

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
      if (btnCalcular) btnCalcular.disabled = false;
      btnCalcular.textContent = 'Calcular envío';
    }
  }
  window.calcularEnvio = calcularEnvio;

  // Actualiza la UI después de verificar stock
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

    if (!nombreInput || !apellidoInput || !emailInput) {
      alert("❌ Por favor completa nombre, apellido y email");
      pagando = false;
      return;
    }

    const nombre = nombreInput.value.trim();
    const apellido = apellidoInput.value.trim();
    const emailCliente = emailInput.value.trim();
    const telefono = telefonoInput?.value?.trim() || "";

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
        cliente_nombre: `${nombre} ${apellido}`.trim(),
        cliente_email: emailCliente,
        cliente_telefono: telefono,
        cliente_direccion: clienteDireccion,
        orden_id: orden_id,
        url_retorno: window.location.href
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
        console.log("📦 Respuesta completa de /pagar:", JSON.stringify(data, null, 2));
        alert("Respuesta recibida. Revisá la consola (F12).");
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

  // Asociar el evento click al botón cuando el DOM esté listo
  document.addEventListener('DOMContentLoaded', () => {
    const btnPagar = document.getElementById('btnPagarFinal');
    if (btnPagar) {
      btnPagar.addEventListener('click', pagarTodoJunto);
    }
    const btnCalcular = document.getElementById('btnCalcularEnvio');
    if (btnCalcular) {
      btnCalcular.addEventListener('click', calcularEnvio);
    }
  });

  window.pagarTodoJunto = pagarTodoJunto;
})();

/**
 * Skeleton Loader - Placeholders animados al estilo Facebook
 * Se ejecuta inmediatamente y se limpia automáticamente cuando el contenido real está listo.
 * No requiere modificar HTML ni CSS inline.
 */

(function() {
  'use strict';

  // Solo ejecutar si el navegador soporta las APIs necesarias
  if (!window.MutationObserver && !window.requestAnimationFrame) return;

  // Configuración
  const SKELETON_CLASS = 'skeleton-placeholder';
  const OBSERVE_OPTIONS = { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] };

  // Estilos mínimos inyectados una sola vez (no inline en elementos)
  const style = document.createElement('style');
  style.textContent = `
    .${SKELETON_CLASS} {
      position: relative;
      overflow: hidden;
      background-color: rgba(255, 255, 255, 0.05) !important;
      border-radius: inherit;
    }
    .${SKELETON_CLASS}::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, 
        transparent, 
        rgba(255, 255, 255, 0.1), 
        transparent);
      animation: skeleton-shimmer 1.8s infinite;
      pointer-events: none;
      z-index: 10;
    }
    @keyframes skeleton-shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
  `;
  document.head.appendChild(style);

  // Elementos que queremos "esqueletizar"
  const SELECTORS = [
    '.producto-img:not([src]), .producto-img[src=""]',          // imágenes de producto sin src
    '.logo-wrapper .logo:not([src]), .logo-wrapper .logo[src=""]', // logo sin src
    '.descripcion-emprendimiento:empty',                         // descripción vacía
    '.card-title:empty',                                         // títulos vacíos
    '.precio-actual:empty',                                      // precios vacíos
    '.fotos-adicionales-grid:empty'                              // contenedor de fotos vacío
  ];

  // Función para aplicar skeleton a elementos que cumplan los selectores
  function applySkeletons() {
    SELECTORS.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        // No aplicar si ya tiene la clase o si ya tiene contenido real (para :empty)
        if (!el.classList.contains(SKELETON_CLASS)) {
          // Para :empty, verificamos que realmente no tenga texto ni elementos hijos
          if (selector.includes(':empty') && (el.textContent.trim() !== '' || el.children.length > 0)) {
            return;
          }
          el.classList.add(SKELETON_CLASS);
        }
      });
    });
  }

  // Función para quitar skeleton cuando el elemento ya tiene contenido
  function removeSkeleton(el) {
    if (el.classList.contains(SKELETON_CLASS)) {
      // Verificar si realmente ya está listo
      if (el.matches('img') && el.complete && el.naturalWidth > 0) {
        el.classList.remove(SKELETON_CLASS);
      } else if (!el.matches('img') && (el.textContent.trim() !== '' || el.children.length > 0)) {
        el.classList.remove(SKELETON_CLASS);
      }
    }
  }

  // Observer para detectar cambios en el DOM (carga de imágenes, inserción de texto, etc.)
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      // Cuando se añaden nodos, aplicamos skeleton si es necesario
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) { // Elemento
          // Si el nodo añadido coincide con nuestros selectores
          SELECTORS.forEach(selector => {
            if (node.matches && node.matches(selector)) {
              node.classList.add(SKELETON_CLASS);
            }
            // Buscar dentro del nodo añadido
            if (node.querySelectorAll) {
              node.querySelectorAll(selector).forEach(child => {
                child.classList.add(SKELETON_CLASS);
              });
            }
          });
        }
      });

      // Cuando cambia un atributo (ej. src de imagen)
      if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
        const img = mutation.target;
        if (img.matches && SELECTORS.some(sel => img.matches(sel.replace(':empty', '')))) {
          if (img.complete && img.naturalWidth > 0) {
            img.classList.remove(SKELETON_CLASS);
          } else {
            img.classList.add(SKELETON_CLASS);
          }
        }
      }
    });

    // También revisamos periódicamente para limpiar skeletons obsoletos
    requestAnimationFrame(() => {
      document.querySelectorAll('.' + SKELETON_CLASS).forEach(el => {
        removeSkeleton(el);
      });
    });
  });

  // Iniciar observación del documento completo
  observer.observe(document.body, OBSERVE_OPTIONS);

  // Aplicar skeletons iniciales al cargar el DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applySkeletons);
  } else {
    applySkeletons();
  }

  // Limpieza final: cuando la página esté completamente cargada, eliminar todos los skeletons
  window.addEventListener('load', () => {
    setTimeout(() => {
      document.querySelectorAll('.' + SKELETON_CLASS).forEach(el => {
        el.classList.remove(SKELETON_CLASS);
      });
    }, 500); // Pequeño retraso para asegurar que las imágenes estén pintadas
  });

})();

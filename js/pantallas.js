// Navegación y enlace de las pantallas con el contrato (Sistema).
// Rutas por hash para que el atrás del sistema haga lo mismo que el
// «Atrás» visible (modelo de navegación del informe, sección 4.3).
(function () {
  var COORDS_CASO = { lat: -34.89211333, lon: -58.06554167 };
  var DESC_MIN = 20;
  function imagenDe(ref) {
    if (ref === "resolucion") return RESOLUCION_SRC;
    if (ref === "evidencia") return EVIDENCIA_SRC;
    return ref;
  }

  // --- Borrador del reporte -----------------------------------------
  function borradorNuevo() {
    return {
      idIntento: Sistema.generarIdIntento(),
      editando: false,
      tipoId: DATOS_CATALOGO[0].id,
      peligro: "no",
      descripcion: "",
      fotos: [],
      pin: null,
      pinConfirmado: false,
      pinOrigen: null, // "foto" | "dispositivo" | null
      direccion: "",
      direccionEditada: false,
      medio: "correo",
      correo: "",
      consentimiento: false
    };
  }
  var borrador = Almacen.leerBorrador() || borradorNuevo();

  function guardarBorrador() { Almacen.guardarBorrador(borrador); }

  // --- Router -------------------------------------------------------
  var RUTAS = ["inicio", "paso1", "paso2", "paso3", "paso4", "revision",
               "cierre-seguro", "error-envio", "recibida", "modo-prueba",
               "mis-observaciones", "consulta"];

  function pantallaActual() {
    var h = (location.hash || "#/inicio").replace("#/", "");
    return RUTAS.indexOf(h) >= 0 ? h : "inicio";
  }

  function ir(ruta) { location.hash = "#/" + ruta; }

  // El «Atrás» visible sigue el flujo, no el historial del navegador:
  // desde la verificación vuelve al paso 4 aunque lo último visto haya
  // sido una edición. En medio de una edición, «Atrás» la abandona y
  // regresa a la verificación.
  var ANTERIOR = { paso2: "paso1", paso3: "paso2", paso4: "paso3",
                   revision: "paso4", "cierre-seguro": "paso1" };
  function atras() {
    var actual = pantallaActual();
    if (borrador.editando && actual.indexOf("paso") === 0) {
      borrador.editando = false;
      guardarBorrador();
      ir("revision");
      return;
    }
    if (ANTERIOR[actual]) ir(ANTERIOR[actual]);
    else history.back();
  }

  // Tras editar desde la revisión, Continuar vuelve directo a ella
  // (modelo de navegación, sección 4.3 del informe).
  function siguiente(ruta) {
    if (borrador.editando) {
      borrador.editando = false;
      guardarBorrador();
      ir("revision");
    } else {
      ir(ruta);
    }
  }

  function mostrar() {
    var actual = pantallaActual();
    RUTAS.forEach(function (r) {
      var el = document.getElementById("p-" + r);
      if (el) el.classList.toggle("activa", r === actual);
    });
    var prepara = PREPARAR[actual];
    if (prepara) prepara();
    var foco = document.querySelector("#p-" + actual + " h1");
    if (foco) { foco.setAttribute("tabindex", "-1"); foco.focus({ preventScroll: false }); }
  }
  window.addEventListener("hashchange", mostrar);

  // --- Utilidades ---------------------------------------------------
  function $(id) { return document.getElementById(id); }
  function tipoElegido() {
    return DATOS_CATALOGO.find(function (t) { return t.id === borrador.tipoId; });
  }
  function etiquetaTipo() {
    var t = tipoElegido();
    return t ? t.categoria + " · " + t.subcategoria : "";
  }

  // Bytes del archivo de evidencia: embebidos (paquete de un archivo)
  // o pedidos al servidor local.
  function obtenerBytesEvidencia() {
    if (window.EVIDENCIA_BASE64) {
      var bin = atob(window.EVIDENCIA_BASE64);
      var v = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) v[i] = bin.charCodeAt(i);
      return Promise.resolve(v.buffer);
    }
    return fetch("datos/evidencia.jpg").then(function (r) { return r.arrayBuffer(); });
  }

  function elegirFotoDeGaleria() {
    // La galería simulada tiene una única fotografía. Se guarda una
    // referencia, nunca los datos de la imagen: así la foto no puede
    // perderse por cuota de almacenamiento ni por recargas. Los
    // metadatos (GPS) se leen del archivo para proponer el pin y no se
    // almacenan; el hash se calcula sobre los bytes reales.
    obtenerBytesEvidencia()
      .then(function (buf) {
        var gps = Exif.leerGPS(buf) || COORDS_CASO;
        return Sistema.hashHex(buf).then(function (h) { return { gps: gps, hash: h }; });
      })
      .catch(function () { return { gps: COORDS_CASO, hash: "sin-lectura-directa" }; })
      .then(function (r) {
        borrador.fotos = [{ imagen: "evidencia", hash: r.hash, gps: r.gps }];
        guardarBorrador();
        pintarFotos();
      });
  }

  function pintarFotos() {
    var g = $("grilla-fotos");
    g.innerHTML = "";
    borrador.fotos.forEach(function (f, i) {
      var celda = document.createElement("div");
      celda.className = "foto-celda";
      var img = document.createElement("img");
      img.src = imagenDe(f.imagen); img.alt = "Foto " + (i + 1) + " del reporte";
      var quitar = document.createElement("button");
      quitar.className = "foto-quitar";
      quitar.setAttribute("aria-label", "Quitar la foto " + (i + 1));
      quitar.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>';
      quitar.addEventListener("click", function () {
        borrador.fotos.splice(i, 1); guardarBorrador(); pintarFotos();
      });
      celda.appendChild(img); celda.appendChild(quitar);
      g.appendChild(celda);
    });
    for (var i = borrador.fotos.length; i < 3; i++) {
      var v = document.createElement("div");
      v.className = "foto-vacia";
      g.appendChild(v);
    }
  }

  function proponerPin(origen) {
    if (origen === "foto" && borrador.fotos.length && borrador.fotos[0].gps) {
      borrador.pin = borrador.fotos[0].gps;
      borrador.pinOrigen = "foto";
    } else {
      borrador.pin = COORDS_CASO; // geolocalización simulada (6.3)
      borrador.pinOrigen = "dispositivo";
    }
    borrador.pinConfirmado = false;
    if (!borrador.direccionEditada) {
      borrador.direccion = Sistema.sugerirDireccion(borrador.pin.lat, borrador.pin.lon);
    }
    guardarBorrador();
  }

  function claseBadge(estado) {
    return "badge badge-" + estado.toLowerCase()
      .replace(/á/g, "a").replace(/é/g, "e").replace(/ó/g, "o").replace(/ /g, "-");
  }
  function fechaCorta(iso) {
    try {
      return new Date(iso).toLocaleString("es-AR",
        { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
    } catch (e) { return iso; }
  }
  function esc(t) { return String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  // --- Preparación de cada pantalla ---------------------------------
  var PREPARAR = {
    inicio: function () {},

    paso1: function () {
      var sel = $("campo-tipo");
      if (!sel.options.length) {
        DATOS_CATALOGO.forEach(function (t) {
          var o = document.createElement("option");
          o.value = t.id; o.textContent = t.categoria + " · " + t.subcategoria;
          sel.appendChild(o);
        });
      }
      sel.value = borrador.tipoId;
      document.querySelectorAll("#p-paso1 [data-peligro]").forEach(function (b) {
        b.setAttribute("aria-checked", String(b.dataset.peligro === borrador.peligro));
      });
    },

    paso2: function () {
      $("chip-tipo-p2").textContent = etiquetaTipo();
      $("campo-descripcion").value = borrador.descripcion;
      $("contador-descripcion").textContent = borrador.descripcion.length + "/500";
      $("error-descripcion").classList.add("oculto");
      $("campo-descripcion").classList.remove("campo-error");
      pintarFotos();
    },

    paso3: function () {
      $("chip-tipo-p3").textContent = etiquetaTipo();
      if (!borrador.pin) proponerPin(borrador.fotos.length ? "foto" : "dispositivo");
      $("texto-pin-propuesto").textContent = borrador.pinOrigen === "foto"
        ? "Ubicación propuesta desde la fotografía. Revisá el pin y confirmalo."
        : "Ubicación propuesta desde tu dispositivo (simulada). Revisá el pin y confirmalo.";
      $("campo-direccion").value = borrador.direccion;
      $("error-pin").classList.add("oculto");
      pintarEstadoPin();
    },

    paso4: function () {
      document.querySelectorAll("#p-paso4 [data-medio]").forEach(function (b) {
        b.setAttribute("aria-checked", String(b.dataset.medio === borrador.medio));
      });
      $("grupo-correo").classList.toggle("oculto", borrador.medio !== "correo");
      $("campo-correo").value = borrador.correo;
      $("campo-consentimiento").checked = borrador.consentimiento;
      $("error-correo").classList.add("oculto");
    },

    revision: function () {
      if (borrador.editando) { borrador.editando = false; guardarBorrador(); }
      var m = $("contenido-revision");
      function fila(rotulo, valorHtml, ruta) {
        return '<div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--deshabilitado-fondo);">' +
          '<div style="min-width: 0;"><div style="font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.08em; color: var(--texto-2); margin-bottom: 4px;">' + rotulo + "</div>" +
          '<div style="font-size: 16px; line-height: 1.35;">' + valorHtml + "</div></div>" +
          '<button class="btn" data-editar="' + ruta + '" style="background: none; color: var(--primario); font-size: 14px; min-height: 44px; padding: 0 4px;">Editar</button></div>';
      }
      var fotoHtml = borrador.fotos.length
        ? '<img src="' + imagenDe(borrador.fotos[0].imagen) + '" alt="Foto del reporte" style="width: 64px; height: 64px; object-fit: cover; border-radius: 8px; border: 1px solid var(--borde);">'
        : '<span class="ayuda">Sin fotografías</span>';
      var contactoHtml = borrador.medio === "correo" && borrador.correo
        ? borrador.correo + '<br><span class="ayuda">Avisos autorizados</span>'
        : "Sin contacto";
      m.innerHTML =
        '<h1>Revisá tu observación</h1>' +
        '<p class="ayuda" style="margin: -6px 0 0;">Confirmá que los datos sean correctos antes de enviar.</p>' +
        fila("Categoría", etiquetaTipo(), "paso1") +
        fila("Descripción", borrador.descripcion.replace(/</g, "&lt;"), "paso2") +
        fila("Fotos", fotoHtml, "paso2") +
        fila("Ubicación", "Pin confirmado en el mapa" +
          (borrador.direccion ? '<br><span class="ayuda">' + borrador.direccion.replace(/</g, "&lt;") + "</span>" : ""), "paso3") +
        fila("Contacto", contactoHtml, "paso4") +
        '<div class="aviso aviso-info" style="margin-top: auto;">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4b5fa9" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v5M12 8h.01"></path></svg>' +
        "<span>Al enviar, recibirás un código único de seguimiento.</span></div>";
      m.querySelectorAll("[data-editar]").forEach(function (b) {
        b.addEventListener("click", function () {
          borrador.editando = true;
          guardarBorrador();
          ir(b.dataset.editar);
        });
      });
    },

    "cierre-seguro": function () {},

    "error-envio": function () {},

    recibida: function () {
      var cus = sessionStorage.getItem("ecovoz-ultimo-cus") || "···-···";
      $("texto-cus").textContent = cus;
      var correo = sessionStorage.getItem("ecovoz-ultimo-correo") || "";
      $("nota-correo-cus").classList.toggle("oculto", !correo);
      $("texto-correo-cus").textContent = correo;
      $("texto-btn-copiar").textContent = "Copiar código";
    },

    "modo-prueba": function () {
      var d = Almacen.datos();
      $("campo-sin-conexion").checked = !!d.ajustes.sinConexion;
      pintarVelocidad();
      var n = d.observaciones.length;
      var c = d.observaciones.reduce(function (a, o) { return a + o.cambios.length; }, 0);
      var estadoAlm = Almacen.persistente()
        ? "Almacenamiento del navegador: disponible."
        : "Almacenamiento del navegador: NO disponible" +
          (Almacen.ultimoError() ? " (" + Almacen.ultimoError() + ")" : "") +
          ". Los datos viven solo en memoria y se pierden al recargar.";
      $("texto-datos-guardados").textContent = (n
        ? n + " observación" + (n > 1 ? "es" : "") + ", " + c + " cambios en este teléfono. "
        : "Sin datos guardados. ") + estadoAlm;
    },

    "mis-observaciones": function () {
      var lista = $("lista-observaciones");
      var obs = Sistema.listarMisObservaciones();
      if (!obs.length) {
        lista.innerHTML = '<div style="background: var(--sup-0); border: 1px dashed var(--borde); border-radius: 12px; padding: 20px;" class="ayuda">Todavía no reportaste observaciones desde este teléfono. Cuando lo hagas, van a aparecer acá con su estado.</div>';
        return;
      }
      lista.innerHTML = obs.map(function (o) {
        var foto = o.evidencias.length
          ? '<img src="' + imagenDe(o.evidencias[0].imagen) + '" alt="Foto del reporte" style="width: 72px; height: 72px; object-fit: cover; border-radius: 8px; border: 1px solid var(--borde);">'
          : '<div style="width: 72px; height: 72px; border-radius: 8px; background: var(--sup-2); border: 1px dashed var(--borde);"></div>';
        var res = o.resolucion
          ? '<div style="border-top: 1px solid var(--deshabilitado-fondo); padding-top: 12px; display: flex; gap: 12px; align-items: center;">' +
            '<img src="' + imagenDe(o.resolucion.evidencia.imagen) + '" alt="Foto de resolución" style="width: 56px; height: 56px; object-fit: cover; border-radius: 8px; border: 1px solid var(--borde); flex: none;">' +
            '<div style="font-size: 14px; line-height: 1.4;"><strong style="color: var(--exito-texto);">Respuesta de la delegación:</strong> ' + esc(o.resolucion.comentario) + "</div></div>"
          : "";
        return '<div style="background: var(--sup-0); border: 1px solid var(--borde); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 12px;">' +
          '<div style="display: flex; gap: 12px;">' + foto +
          '<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px;">' +
          '<div class="fila-espaciada"><span style="font-weight: 700; letter-spacing: 0.06em;">' + o.cus + '</span>' +
          '<span class="' + claseBadge(o.estado) + '">' + o.estado + "</span></div>" +
          '<div style="font-size: 14px;">' + esc(o.tipo.categoria + " · " + o.tipo.subcategoria) + "</div>" +
          '<div class="ayuda">' + esc(o.ubicacionReportada.direccion) + " · " + fechaCorta(o.fechaCreacion) + "</div>" +
          "</div></div>" + res + "</div>";
      }).join("");
    },

    consulta: function () {
      var ultimo = sessionStorage.getItem("ecovoz-ultimo-cus");
      if (ultimo && !$("campo-cus").value) $("campo-cus").value = ultimo;
      $("error-consulta").classList.add("oculto");
    }
  };

  function pintarEstadoPin() {
    var b = $("btn-confirmar-pin");
    b.classList.toggle("btn-confirmado", borrador.pinConfirmado);
    $("texto-btn-pin").textContent = borrador.pinConfirmado ? "Pin confirmado" : "Confirmar pin";
    $("btn-p3-continuar").disabled = !borrador.pinConfirmado;
  }

  function pintarVelocidad() {
    var v = Almacen.datos().ajustes.velocidadMs;
    ["30000", "5000"].forEach(function (ms) {
      var b = document.querySelector('[data-velocidad="' + ms + '"]');
      b.classList.toggle("btn-primario", String(v) === ms);
    });
  }

  // --- Envío --------------------------------------------------------
  function armarSolicitud() {
    return {
      idIntento: borrador.idIntento,
      tipoId: borrador.tipoId,
      peligro: borrador.peligro,
      descripcion: borrador.descripcion,
      fotos: borrador.fotos.map(function (f) { return { imagen: f.imagen, hash: f.hash }; }),
      pin: borrador.pin,
      pinConfirmado: borrador.pinConfirmado,
      direccion: borrador.direccionEditada || borrador.direccion ? borrador.direccion : "",
      contacto: borrador.medio === "correo" ? { medio: "correo", valor: borrador.correo } : null,
      consentimiento: borrador.consentimiento
    };
  }

  function enviar() {
    $("btn-enviar").disabled = true;
    Sistema.registrarObservacion(armarSolicitud()).then(function (r) {
      $("btn-enviar").disabled = false;
      if (r.ok) {
        sessionStorage.setItem("ecovoz-ultimo-cus", r.cus);
        sessionStorage.setItem("ecovoz-ultimo-correo",
          borrador.medio === "correo" && borrador.consentimiento ? borrador.correo : "");
        Almacen.borrarBorrador();
        borrador = borradorNuevo();
        ir("recibida");
      } else if (r.codigo === "NO_DISPONIBLE") {
        ir("error-envio"); // el borrador sigue guardado (RI-E2-01)
      } else {
        // Error de validación: se vuelve a la pantalla del dato.
        var destino = { peligro: "paso1", tipo: "paso1", descripcion: "paso2",
                        pin: "paso3", fotos: "paso2", contacto: "paso4",
                        consentimiento: "paso4" }[r.campo] || "revision";
        ir(destino);
        setTimeout(function () { mostrarErrorDeCampo(r); }, 50);
      }
    });
  }

  function mostrarErrorDeCampo(r) {
    if (r.campo === "descripcion") {
      $("error-descripcion").classList.remove("oculto");
      $("campo-descripcion").classList.add("campo-error");
      $("campo-descripcion").focus();
    } else if (r.campo === "pin") {
      $("texto-error-pin").textContent = r.mensaje;
      $("error-pin").classList.remove("oculto");
    } else if (r.campo === "contacto" || r.campo === "consentimiento") {
      $("texto-error-correo").textContent = r.mensaje;
      $("error-correo").classList.remove("oculto");
    }
  }

  // --- Eventos ------------------------------------------------------
  function alCargar() {
    // Inicio
    $("btn-reportar").addEventListener("click", function () { ir("paso1"); });
    $("btn-consultar").addEventListener("click", function () { ir("consulta"); });
    $("btn-mis-observaciones").addEventListener("click", function () { ir("mis-observaciones"); });
    $("btn-modo-prueba").addEventListener("click", function () { ir("modo-prueba"); });

    // Paso 1
    $("campo-tipo").addEventListener("change", function () {
      borrador.tipoId = this.value; guardarBorrador();
    });
    document.querySelectorAll("#p-paso1 [data-peligro]").forEach(function (b) {
      b.addEventListener("click", function () {
        borrador.peligro = b.dataset.peligro; guardarBorrador(); PREPARAR.paso1();
      });
    });
    $("btn-p1-cancelar").addEventListener("click", abrirCancelar);
    $("btn-p1-continuar").addEventListener("click", function () {
      if (borrador.peligro === "si") {
        ir("cierre-seguro"); // W2: canales de emergencia, nada creado
        return;
      }
      siguiente("paso2");
    });

    // Paso 2
    $("campo-descripcion").addEventListener("input", function () {
      borrador.descripcion = this.value;
      $("contador-descripcion").textContent = this.value.length + "/500";
      if (this.value.trim().length >= DESC_MIN) {
        $("error-descripcion").classList.add("oculto");
        this.classList.remove("campo-error");
      }
      guardarBorrador();
    });
    $("btn-camara").addEventListener("click", function () {
      $("nota-camara").classList.remove("oculto");
    });
    $("btn-galeria").addEventListener("click", function () { $("dialogo-galeria").showModal(); });
    $("btn-cerrar-galeria").addEventListener("click", function () { $("dialogo-galeria").close(); });
    $("btn-elegir-evidencia").addEventListener("click", function () {
      $("dialogo-galeria").close();
      elegirFotoDeGaleria();
    });
    $("btn-p2-continuar").addEventListener("click", function () {
      var desc = borrador.descripcion.trim(); // CP-03: validación 5 de 4.4
      if (!desc || desc.length < DESC_MIN) {
        $("texto-error-descripcion").textContent = desc
          ? "Contanos un poco más: la descripción necesita al menos " + DESC_MIN + " caracteres."
          : "La descripción es obligatoria. Contanos qué sucede para que la delegación pueda actuar.";
        $("error-descripcion").classList.remove("oculto");
        $("campo-descripcion").classList.add("campo-error");
        $("campo-descripcion").focus();
        return;
      }
      siguiente("paso3");
    });

    // Paso 3
    $("btn-confirmar-pin").addEventListener("click", function () {
      borrador.pinConfirmado = true; guardarBorrador();
      $("error-pin").classList.add("oculto");
      pintarEstadoPin();
    });
    $("btn-mi-ubicacion").addEventListener("click", function () {
      proponerPin("dispositivo"); PREPARAR.paso3();
    });
    $("campo-direccion").addEventListener("input", function () {
      borrador.direccion = this.value; borrador.direccionEditada = true; guardarBorrador();
    });
    $("btn-p3-continuar").addEventListener("click", function () {
      if (!borrador.pinConfirmado) return;
      var v = Sistema.validarUbicacion(borrador.pin);
      if (!v.dentro) { // AE3-01: bloquea en la misma pantalla
        $("texto-error-pin").textContent = "La ubicación no corresponde a los límites del programa.";
        $("error-pin").classList.remove("oculto");
        return;
      }
      siguiente("paso4");
    });

    // Paso 4
    document.querySelectorAll("#p-paso4 [data-medio]").forEach(function (b) {
      b.addEventListener("click", function () {
        borrador.medio = b.dataset.medio; guardarBorrador(); PREPARAR.paso4();
      });
    });
    $("campo-correo").addEventListener("input", function () {
      borrador.correo = this.value; guardarBorrador();
      $("error-correo").classList.add("oculto");
    });
    $("campo-consentimiento").addEventListener("change", function () {
      borrador.consentimiento = this.checked; guardarBorrador();
    });
    $("btn-p4-continuar").addEventListener("click", function () {
      if (borrador.medio === "correo") {
        var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(borrador.correo);
        if (!ok) {
          $("texto-error-correo").textContent = "Revisá el correo electrónico.";
          $("error-correo").classList.remove("oculto"); return;
        }
        if (!borrador.consentimiento) {
          $("texto-error-correo").textContent = "Para dejar un contacto, marcá la autorización.";
          $("error-correo").classList.remove("oculto"); return;
        }
      }
      ir("revision");
    });

    // Revisión y envío
    $("btn-enviar").addEventListener("click", enviar);
    $("btn-volver-revisar").addEventListener("click", function () { ir("revision"); });
    $("btn-reintentar").addEventListener("click", function () { enviar(); });

    // Recibida
    $("btn-copiar").addEventListener("click", function () {
      var cus = $("texto-cus").textContent;
      function listo() { $("texto-btn-copiar").textContent = "Copiado"; }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(cus).then(listo, listo);
      } else { listo(); }
    });
    $("btn-volver-inicio").addEventListener("click", function () { ir("inicio"); });

    // Cancelar (encabezados) y atrás
    document.querySelectorAll("[data-cancelar]").forEach(function (b) {
      b.addEventListener("click", abrirCancelar);
    });
    document.querySelectorAll("[data-atras]").forEach(function (b) {
      b.addEventListener("click", atras);
    });
    document.querySelectorAll("[data-inicio]").forEach(function (b) {
      b.addEventListener("click", function () { ir("inicio"); });
    });
    $("btn-seguir-cargando").addEventListener("click", function () { $("dialogo-cancelar").close(); });
    $("btn-descartar").addEventListener("click", function () {
      $("dialogo-cancelar").close();
      Almacen.borrarBorrador();
      borrador = borradorNuevo();
      ir("inicio");
    });

    // Mis observaciones y consulta
    $("btn-reportar-desde-lista").addEventListener("click", function () { ir("paso1"); });
    function buscarCodigo() {
      var r = Sistema.consultarPorCodigo($("campo-cus").value);
      var caja = $("resultado-consulta");
      if (!r.ok) {
        caja.innerHTML = "";
        $("error-consulta").classList.remove("oculto");
        return;
      }
      $("error-consulta").classList.add("oculto");
      var PUNTOS = { "Recibida": "#9ca3af", "En análisis": "#4b5fa9",
                     "En ejecución": "#fbcd21", "Resuelta": "#9ec83d" };
      var linea = r.historial.slice().reverse().map(function (h) {
        return '<div style="display: flex; gap: 12px; align-items: flex-start;">' +
          '<span style="flex: none; width: 12px; height: 12px; border-radius: 50%; margin-top: 4px; background: ' + (PUNTOS[h.estado] || "#9ca3af") + ';"></span>' +
          '<div style="padding-bottom: 12px;"><div style="font-weight: 500;">' + h.estado + "</div>" +
          '<div class="ayuda">' + fechaCorta(h.fecha) + "</div></div></div>";
      }).join("");
      var respuesta = r.respuesta
        ? '<div style="border-top: 1px solid var(--deshabilitado-fondo); padding-top: 14px; display: flex; flex-direction: column; gap: 8px;">' +
          '<div style="font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.08em; color: var(--texto-2);">Respuesta de la delegación</div>' +
          '<img src="' + imagenDe(r.respuesta.imagen) + '" alt="Foto de resolución" style="width: 100%; border-radius: 8px; border: 1px solid var(--borde);">' +
          '<div style="font-size: 14px; line-height: 1.4;">' + esc(r.respuesta.texto) +
          " Ubicación constatada: " + esc(r.respuesta.direccion) + "</div></div>"
        : "";
      caja.innerHTML = '<div style="border: 1px solid var(--borde); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 14px; background: var(--sup-0);">' +
        '<div class="fila-espaciada"><div><div style="font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.08em; color: var(--texto-2);">Observación ' + r.cus + "</div>" +
        '<div>' + esc(r.tipo) + "</div></div>" +
        '<span class="' + claseBadge(r.estado) + '">' + r.estado + "</span></div>" +
        '<div style="display: flex; flex-direction: column;">' + linea + "</div>" + respuesta + "</div>";
    }
    $("btn-buscar").addEventListener("click", buscarCodigo);
    $("campo-cus").addEventListener("keydown", function (e) {
      if (e.key === "Enter") buscarCodigo();
    });

    // Modo prueba
    $("campo-sin-conexion").addEventListener("change", function () {
      Almacen.datos().ajustes.sinConexion = this.checked; Almacen.guardar();
    });
    document.querySelectorAll("[data-velocidad]").forEach(function (b) {
      b.addEventListener("click", function () {
        Almacen.datos().ajustes.velocidadMs = Number(b.dataset.velocidad);
        Almacen.guardar(); pintarVelocidad();
      });
    });
    $("btn-borrar-todo").addEventListener("click", function () {
      Almacen.borrarTodo();
      borrador = borradorNuevo();
      PREPARAR["modo-prueba"]();
    });

    if (!location.hash) location.replace("#/inicio");
    mostrar();
  }

  function abrirCancelar() { $("dialogo-cancelar").showModal(); }

  document.addEventListener("DOMContentLoaded", alCargar);
})();

// Módulo local que hace de sistema (Etapa 3, punto 6): recibe las
// operaciones del contrato, aplica las reglas del punto 4 y persiste en
// el almacén local. Las pantallas hablan con este módulo, nunca con el
// almacén: si algún día hay servidor, se reemplaza este archivo.
(function () {
  var ALFABETO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // sin 0, O, 1, I
  var ESTADOS = ["Recibida", "En análisis", "En ejecución", "Resuelta"];
  var DESC_MIN = 20; // observación del grupo: una sola letra no alcanza

  function ahora() { return new Date().toISOString(); }

  function error(codigo, campo, mensaje) {
    return { ok: false, codigo: codigo, campo: campo, mensaje: mensaje };
  }

  function generarCodigo() {
    var d = Almacen.datos();
    for (var intento = 0; intento < 100; intento++) {
      var s = "";
      var azar = new Uint8Array(6);
      if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(azar);
      else for (var i = 0; i < 6; i++) azar[i] = Math.floor(Math.random() * 256);
      for (var j = 0; j < 6; j++) s += ALFABETO[azar[j] % ALFABETO.length];
      var cus = s.slice(0, 3) + "-" + s.slice(3);
      var existe = d.observaciones.some(function (o) { return o.cus === cus; });
      if (!existe) return cus; // si ya existía, se genera otro (4.6)
    }
    return null;
  }

  function hashHex(buffer) {
    if (window.crypto && crypto.subtle && crypto.subtle.digest) {
      return crypto.subtle.digest("SHA-256", buffer).then(function (h) {
        return Array.prototype.map.call(new Uint8Array(h), function (b) {
          return ("0" + b.toString(16)).slice(-2);
        }).join("");
      });
    }
    // Sin crypto.subtle (contexto no seguro): suma simple, declarada.
    var v = new Uint8Array(buffer), acc = 0;
    for (var i = 0; i < v.length; i++) acc = (acc * 31 + v[i]) >>> 0;
    return Promise.resolve("simple-" + acc.toString(16));
  }

  function agregarCambio(obs, tipo, extras) {
    var c = { fecha: ahora(), tipo: tipo, usuario: extras && extras.usuario || "sistema" };
    if (extras) for (var k in extras) c[k] = extras[k];
    obs.cambios.push(c);
    return c;
  }

  function notificar(obs, cambio, texto) {
    if (!obs.contacto) return;
    Almacen.datos().avisos.push({
      fecha: ahora(), cus: obs.cus, canal: "correo",
      destino: obs.contacto.valor, texto: texto, resultado: "enviada (simulada)"
    });
  }

  // --- Operaciones del contrato -------------------------------------

  function obtenerCatalogo() { return DATOS_CATALOGO.slice(); }

  function sugerirDireccion(lat, lon) { return DATOS_DIRECCIONES.sugerir(lat, lon); }

  function validarUbicacion(pin) {
    var L = DATOS_AREA.limites;
    var dentro = pin && pin.lat >= L.latMin && pin.lat <= L.latMax &&
                 pin.lon >= L.lonMin && pin.lon <= L.lonMax;
    return { dentro: !!dentro, area: DATOS_AREA.nombre };
  }

  function validar(s) {
    if (s.peligro !== "no") {
      return error("CIERRE_SEGURO", "peligro", "Ante peligro inmediato, llamá al 911 o al 103.");
    }
    var tipoOk = DATOS_CATALOGO.some(function (t) { return t.id === s.tipoId; });
    if (!tipoOk) return error("TIPO_INVALIDO", "tipo", "Elegí un tipo del catálogo.");
    if (!s.pinConfirmado || !s.pin) {
      return error("PIN_SIN_CONFIRMAR", "pin", "Revisá y confirmá el pin para continuar.");
    }
    if (!validarUbicacion(s.pin).dentro) {
      return error("FUERA_DE_AREA", "pin", "La ubicación no corresponde a los límites del programa.");
    }
    if (!s.descripcion || !s.descripcion.trim()) {
      return error("DESCRIPCION_INVALIDA", "descripcion", "La descripción es obligatoria. Contanos qué sucede.");
    }
    if (s.descripcion.trim().length < DESC_MIN) {
      return error("DESCRIPCION_INVALIDA", "descripcion",
        "Contanos un poco más: la descripción necesita al menos " + DESC_MIN + " caracteres.");
    }
    if (s.descripcion.length > 500) {
      return error("DESCRIPCION_INVALIDA", "descripcion", "La descripción admite hasta 500 caracteres.");
    }
    if (s.fotos && s.fotos.length > 3) {
      return error("FOTO_NO_ADMITIDA", "fotos", "Se admiten hasta 3 fotografías.");
    }
    if (s.contacto) {
      if (!s.consentimiento) {
        return error("CONTACTO_INVALIDO", "consentimiento", "Para dejar un contacto, marcá la autorización.");
      }
      var correoOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.contacto.valor || "");
      if (s.contacto.medio === "correo" && !correoOk) {
        return error("CONTACTO_INVALIDO", "contacto", "Revisá el correo electrónico.");
      }
    }
    return null;
  }

  // Registrar observación: idempotente por idIntento; todo o nada.
  function registrarObservacion(s) {
    var d = Almacen.datos();

    // AE3-02: el mismo intento devuelve el mismo CUS y no duplica.
    var previa = d.observaciones.find(function (o) { return o.idIntento === s.idIntento; });
    if (previa) return Promise.resolve({ ok: true, cus: previa.cus, repetida: true });

    // Falla de conexión simulada (modo prueba): nada se crea.
    if (d.ajustes.sinConexion) {
      d.ajustes.sinConexion = false; // se desactiva sola al reintentar
      Almacen.guardar();
      return Promise.resolve(error("NO_DISPONIBLE", null,
        "No pudimos enviar tu observación. Tus datos quedaron guardados."));
    }

    var falla = validar(s);
    if (falla) return Promise.resolve(falla);

    var cus = generarCodigo();
    if (!cus) return Promise.resolve(error("NO_DISPONIBLE", null, "No se pudo generar el código."));

    var tipo = DATOS_CATALOGO.find(function (t) { return t.id === s.tipoId; });
    var obs = {
      cus: cus,
      idIntento: s.idIntento,
      tipo: { categoria: tipo.categoria, subcategoria: tipo.subcategoria },
      descripcion: s.descripcion.trim(),
      estado: "Recibida",
      areaAsignada: tipo.area,
      ubicacionReportada: { lat: s.pin.lat, lon: s.pin.lon, direccion: s.direccion || "" },
      evidencias: (s.fotos || []).map(function (f) {
        return { imagen: f.imagen, hash: f.hash, fecha: ahora(), contexto: "registro" };
      }),
      contacto: s.contacto ? { medio: s.contacto.medio, valor: s.contacto.valor,
        fechaConsentimiento: ahora() } : null,
      resolucion: null,
      fechaCreacion: ahora(),
      fechaPrimeraRespuesta: null,
      proximoSalto: Date.now() + d.ajustes.velocidadMs,
      cambios: []
    };
    agregarCambio(obs, "creación", { estadoNuevo: "Recibida" });

    // Confirmación única: la observación entra completa al almacén.
    d.observaciones.push(obs);
    Almacen.guardar();

    notificar(obs, null, "Tu observación " + cus + " fue recibida.");
    Almacen.guardar();
    return Promise.resolve({ ok: true, cus: cus });
  }

  function consultarPorCodigo(cus) {
    var d = Almacen.datos();
    var normal = (cus || "").trim().toUpperCase();
    var obs = d.observaciones.find(function (o) { return o.cus === normal; });
    if (!obs) return error("NO_ENCONTRADA", "cus", "No encontramos una observación con ese código.");
    // RF-03: estado, fechas y respuestas; sin descripción ni contacto.
    return {
      ok: true, cus: obs.cus,
      tipo: obs.tipo.categoria + " · " + obs.tipo.subcategoria,
      estado: obs.estado,
      historial: obs.cambios.filter(function (c) {
        return c.tipo === "creación" || c.tipo === "estado";
      }).map(function (c) {
        return { fecha: c.fecha, estado: c.estadoNuevo };
      }),
      respuesta: obs.resolucion ? {
        texto: obs.resolucion.comentario,
        imagen: obs.resolucion.evidencia.imagen,
        direccion: obs.resolucion.direccion
      } : null
    };
  }

  function listarMisObservaciones() {
    return Almacen.datos().observaciones.slice().reverse();
  }

  // --- Simulador de gestión (reemplaza a la delegación) -------------

  function aplicarSalto(obs, cuando) {
    var idx = ESTADOS.indexOf(obs.estado);
    if (idx < 0 || idx >= ESTADOS.length - 1) { obs.proximoSalto = null; return; }
    var anterior = obs.estado;
    var nuevo = ESTADOS[idx + 1];
    obs.estado = nuevo;
    var fecha = new Date(cuando).toISOString();
    obs.cambios.push({ fecha: fecha, tipo: "estado", usuario: "simulador",
      estadoAnterior: anterior, estadoNuevo: nuevo });
    if (!obs.fechaPrimeraRespuesta) obs.fechaPrimeraRespuesta = fecha;
    if (nuevo === "Resuelta") {
      obs.resolucion = {
        comentario: "La esquina fue limpiada. Foto tomada en el lugar.",
        fecha: fecha,
        direccion: "Calle 465 y Calle 132 Bis",
        evidencia: { imagen: "resolucion", hash: "resolucion-fija", contexto: "resolución" }
      };
      obs.cambios.push({ fecha: fecha, tipo: "resolución", usuario: "simulador",
        texto: obs.resolucion.comentario });
      obs.proximoSalto = null;
      notificar(obs, null, "Tu observación " + obs.cus + " fue resuelta.");
    } else {
      obs.proximoSalto = cuando + Almacen.datos().ajustes.velocidadMs;
      notificar(obs, null, "Tu observación " + obs.cus + " pasó a " + nuevo + ".");
    }
  }

  // Aplica los saltos vencidos (también al reabrir la app: CP-02).
  function avanzarSimulador() {
    var d = Almacen.datos();
    var cambio = false;
    d.observaciones.forEach(function (obs) {
      var tope = 0;
      while (obs.proximoSalto && obs.proximoSalto <= Date.now() && tope < 10) {
        aplicarSalto(obs, obs.proximoSalto);
        cambio = true;
        tope++;
      }
    });
    if (cambio) Almacen.guardar();
    return cambio;
  }

  setInterval(avanzarSimulador, 1000);
  avanzarSimulador();

  window.Sistema = {
    obtenerCatalogo: obtenerCatalogo,
    sugerirDireccion: sugerirDireccion,
    validarUbicacion: validarUbicacion,
    registrarObservacion: registrarObservacion,
    consultarPorCodigo: consultarPorCodigo,
    listarMisObservaciones: listarMisObservaciones,
    avanzarSimulador: avanzarSimulador,
    hashHex: hashHex,
    generarIdIntento: function () {
      return "intento-" + Date.now() + "-" + Math.floor(Math.random() * 1e6);
    }
  };
})();

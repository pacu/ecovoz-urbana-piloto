// Almacén local del prototipo. Un solo documento JSON en localStorage.
// Si el almacenamiento no está disponible, la app funciona en memoria
// y lo informa (los datos se pierden al recargar).
(function () {
  var CLAVE = "ecovoz-etapa4";
  var CLAVE_BORRADOR = "ecovoz-etapa4-borrador";
  var memoria = null;
  var disponible = true;

  function inicial() {
    return {
      observaciones: [],
      avisos: [],
      ajustes: { sinConexion: false, velocidadMs: 30000 }
    };
  }

  function leer() {
    if (memoria) return memoria;
    try {
      var crudo = localStorage.getItem(CLAVE);
      memoria = crudo ? JSON.parse(crudo) : inicial();
    } catch (e) {
      disponible = false;
      memoria = inicial();
    }
    if (!memoria.ajustes) memoria.ajustes = inicial().ajustes;
    if (!memoria.avisos) memoria.avisos = [];
    return memoria;
  }

  var ultimoError = null;
  function guardar() {
    if (!memoria) return;
    try {
      localStorage.setItem(CLAVE, JSON.stringify(memoria));
      ultimoError = null;
    } catch (e) {
      disponible = false;
      ultimoError = String(e && e.name || e);
    }
  }

  window.Almacen = {
    datos: leer,
    guardar: guardar,
    persistente: function () { return disponible; },
    leerBorrador: function () {
      try {
        var crudo = localStorage.getItem(CLAVE_BORRADOR);
        return crudo ? JSON.parse(crudo) : null;
      } catch (e) { return null; }
    },
    guardarBorrador: function (borrador) {
      try {
        localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(borrador));
      } catch (e) {
        disponible = false;
        ultimoError = String(e && e.name || e);
      }
    },
    ultimoError: function () { return ultimoError; },
    borrarBorrador: function () {
      try { localStorage.removeItem(CLAVE_BORRADOR); } catch (e) {}
    },
    borrarTodo: function () {
      memoria = inicial();
      guardar();
      this.borrarBorrador();
    }
  };
})();

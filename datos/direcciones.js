// Origen de la foto de resolución (el empaquetador la vuelve embebida).
window.RESOLUCION_SRC = "datos/resolucion.jpg";
window.EVIDENCIA_SRC = "datos/evidencia.jpg";

// Geocodificación inversa simulada: tabla fija de puntos conocidos.
// Devuelve la dirección del punto más cercano dentro de la tolerancia.
window.DATOS_DIRECCIONES = {
  puntos: [
    { lat: -34.89211333, lon: -58.06554167, direccion: "Calle 465 y Calle 132 Bis" }
  ],
  toleranciaGrados: 0.003,
  sugerir: function (lat, lon) {
    var mejor = null;
    var mejorDist = Infinity;
    for (var i = 0; i < this.puntos.length; i++) {
      var p = this.puntos[i];
      var d = Math.max(Math.abs(p.lat - lat), Math.abs(p.lon - lon));
      if (d < mejorDist) { mejorDist = d; mejor = p; }
    }
    if (mejor && mejorDist <= this.toleranciaGrados) return mejor.direccion;
    return "";
  }
};

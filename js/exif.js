// Lector mínimo de EXIF: extrae las coordenadas GPS de un JPEG.
// Suficiente para el prototipo: recorre los segmentos APP1, interpreta
// el TIFF y busca el IFD de GPS (etiqueta 0x8825).
(function () {
  function leerGPS(buffer) {
    try {
      var v = new DataView(buffer);
      if (v.getUint16(0) !== 0xFFD8) return null; // no es JPEG
      var pos = 2;
      while (pos + 4 < v.byteLength) {
        var marca = v.getUint16(pos);
        var largo = v.getUint16(pos + 2);
        if (marca === 0xFFE1) { // APP1
          var gps = leerTiff(v, pos + 4, largo - 2);
          if (gps) return gps;
        }
        if ((marca & 0xFF00) !== 0xFF00) break;
        pos += 2 + largo;
      }
    } catch (e) { /* archivo raro: sin GPS */ }
    return null;
  }

  function leerTiff(v, inicio, largo) {
    // "Exif\0\0" y luego el encabezado TIFF
    if (v.getUint32(inicio) !== 0x45786966) return null;
    var t = inicio + 6;
    var le = v.getUint16(t) === 0x4949; // II little endian, MM big endian
    function u16(o) { return v.getUint16(o, le); }
    function u32(o) { return v.getUint32(o, le); }
    if (u16(t + 2) !== 42) return null;
    var ifd0 = t + u32(t + 4);
    var n = u16(ifd0);
    var gpsIfd = 0;
    for (var i = 0; i < n; i++) {
      var e = ifd0 + 2 + i * 12;
      if (u16(e) === 0x8825) gpsIfd = t + u32(e + 8);
    }
    if (!gpsIfd) return null;
    var m = u16(gpsIfd);
    var latRef = "N", lonRef = "E", lat = null, lon = null;
    function racionales(e2, cuenta) {
      var off = t + u32(e2 + 8);
      var xs = [];
      for (var k = 0; k < cuenta; k++) {
        xs.push(u32(off + k * 8) / u32(off + k * 8 + 4));
      }
      return xs;
    }
    for (var j = 0; j < m; j++) {
      var e2 = gpsIfd + 2 + j * 12;
      var tag = u16(e2);
      if (tag === 1) latRef = String.fromCharCode(v.getUint8(e2 + 8));
      if (tag === 3) lonRef = String.fromCharCode(v.getUint8(e2 + 8));
      if (tag === 2) { var a = racionales(e2, 3); lat = a[0] + a[1] / 60 + a[2] / 3600; }
      if (tag === 4) { var b = racionales(e2, 3); lon = b[0] + b[1] / 60 + b[2] / 3600; }
    }
    if (lat === null || lon === null) return null;
    if (latRef === "S") lat = -lat;
    if (lonRef === "W") lon = -lon;
    return { lat: lat, lon: lon };
  }

  window.Exif = { leerGPS: leerGPS };
})();

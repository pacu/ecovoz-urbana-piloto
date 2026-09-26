// Prueba del módulo local (contrato de la Etapa 3, punto 6) sin
// navegador. Ejecutar desde app/: node pruebas/contrato.test.js
// Cubre las validaciones de 4.4, las garantías de 6.4, la idempotencia
// AE3-02, la consulta RF-03 y el simulador de gestión (CP-02).
global.window = global;
global.localStorage = { d:{}, getItem(k){return this.d[k]||null}, setItem(k,v){this.d[k]=v}, removeItem(k){delete this.d[k]} };
require('../datos/catalogo.js'); require('../datos/area.js'); require('../datos/direcciones.js');
require('../js/almacen.js'); require('../js/sistema.js');
const S = global.Sistema, A = global.Almacen;
function assert(c,m){ if(!c){ console.error("FALLA:",m); process.exitCode=1; } else console.log("ok:",m); }

(async () => {
  const base = { idIntento:"i1", tipoId:"residuos-via-publica", peligro:"no",
    descripcion:"Bolsas de residuos y restos de obra acumulados en la esquina desde hace una semana.",
    fotos:[{imagen:"x",hash:"h"}], pin:{lat:-34.89211333,lon:-58.06554167}, pinConfirmado:true,
    direccion:"Calle 465 y Calle 132 Bis", contacto:{medio:"correo",valor:"juan.citybell@gmail.com"}, consentimiento:true };

  let r = await S.registrarObservacion({...base, peligro:"si", idIntento:"iv1"});
  assert(!r.ok && r.codigo==="CIERRE_SEGURO","peligro sí => cierre seguro");
  r = await S.registrarObservacion({...base, descripcion:"  ", idIntento:"iv2"});
  assert(!r.ok && r.codigo==="DESCRIPCION_INVALIDA","descripción vacía rechazada (CP-03)");
  r = await S.registrarObservacion({...base, descripcion:"x", idIntento:"iv2b"});
  assert(!r.ok && r.codigo==="DESCRIPCION_INVALIDA","descripción de una letra rechazada (mínimo 20)");
  r = await S.registrarObservacion({...base, pin:{lat:-34.5,lon:-58.4}, idIntento:"iv3"});
  assert(!r.ok && r.codigo==="FUERA_DE_AREA","fuera de área bloquea (AE3-01)");
  r = await S.registrarObservacion({...base, pinConfirmado:false, idIntento:"iv4"});
  assert(!r.ok && r.codigo==="PIN_SIN_CONFIRMAR","pin sin confirmar");
  r = await S.registrarObservacion({...base, contacto:{medio:"correo",valor:"malcorreo"}, idIntento:"iv5"});
  assert(!r.ok && r.codigo==="CONTACTO_INVALIDO","correo inválido");
  assert(A.datos().observaciones.length===0,"garantía 2: nada creado tras validaciones fallidas");

  A.datos().ajustes.sinConexion = true;
  r = await S.registrarObservacion(base);
  assert(!r.ok && r.codigo==="NO_DISPONIBLE","sin conexión => NO_DISPONIBLE, nada creado");
  assert(A.datos().ajustes.sinConexion===false,"el interruptor se desactiva solo");
  r = await S.registrarObservacion(base);
  assert(r.ok && /^[2-9A-HJ-NP-Z]{3}-[2-9A-HJ-NP-Z]{3}$/.test(r.cus),"reintento exitoso con CUS válido");
  const cus = r.cus;
  const r2 = await S.registrarObservacion(base);
  assert(r2.ok && r2.cus===cus && A.datos().observaciones.length===1,"AE3-02: mismo intento, mismo CUS, una sola observación");

  const c = S.consultarPorCodigo(cus.toLowerCase());
  assert(c.ok && c.estado==="Recibida" && !("descripcion" in c) && !("contacto" in c),"consulta sin datos personales (RF-03)");
  assert(!S.consultarPorCodigo("XXX-XXX").ok,"código inexistente => NO_ENCONTRADA");

  const obs = A.datos().observaciones[0];
  obs.proximoSalto = Date.now()-1; S.avanzarSimulador();
  assert(obs.estado==="En análisis" && obs.fechaPrimeraRespuesta,"salto 1 y primera respuesta fijada");
  const fpr = obs.fechaPrimeraRespuesta;
  obs.proximoSalto = Date.now()-120000; S.avanzarSimulador();
  assert(obs.estado==="Resuelta","saltos atrasados en cadena (CP-02 al reabrir)");
  assert(obs.resolucion && obs.resolucion.evidencia && obs.resolucion.direccion==="Calle 465 y Calle 132 Bis","resolución con evidencia y ubicación constatada");
  assert(obs.fechaPrimeraRespuesta===fpr,"invariante 9: primera respuesta no cambia");
  assert(obs.cambios.filter(x=>x.tipo==="creación"||x.tipo==="estado").length===4,"historial: creación + 3 estados");
  assert(S.consultarPorCodigo(cus).respuesta.imagen==="resolucion","la consulta referencia la foto de resolución por marcador");
  assert(A.datos().avisos.length===4,"4 avisos simulados al contacto");
  console.log(process.exitCode? "PRUEBAS CON FALLAS":"TODAS LAS PRUEBAS PASARON");
  process.exit(process.exitCode||0);
})();

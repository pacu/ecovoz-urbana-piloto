# EcoVoz Urbana, aplicación de prueba

Prototipo académico del programa piloto de observaciones ambientales
de City Bell. Es una aplicación web solo frontend. La lógica corre en
el navegador y los datos se guardan en el almacenamiento local del
dispositivo.

No requiere cuenta ni autenticación. Permite registrar una observación,
obtener un Código Único de Seguimiento (CUS), consultar su estado y
recorrer los casos de prueba definidos para el piloto.

La versión publicada se puede recorrer en:

<https://pacu.github.io/ecovoz-urbana-piloto/>

## Cómo ejecutarla

Se recomienda servir la carpeta con un servidor HTTP local para que el
navegador pueda leer todos los recursos:

```sh
python3 -m http.server 8080
```

Luego se abre <http://localhost:8080> en el navegador. En un teléfono
conectado a la misma red se puede usar la dirección IP de la
computadora en lugar de `localhost`.

También se puede abrir `index.html` directamente. Algunos navegadores
restringen la lectura de metadatos de fotografías cuando se usa esta
modalidad. En ese caso, la ubicación propuesta se obtiene de los datos
de prueba embebidos.

## Pruebas automatizadas

Requieren Node.js. Se ejecutan desde la raíz del repositorio:

```sh
node pruebas/contrato.test.js
```

La suite verifica las validaciones principales, el cierre seguro por
peligro inmediato, el bloqueo fuera del área, la persistencia local,
el reintento sin duplicados, la consulta por CUS y la simulación de la
resolución.

## Alcance

La aplicación cubre los casos CP-01 A y B, CP-02 y CP-03, además del
cierre seguro. El mapa, la galería, la dirección, las notificaciones y
la gestión municipal se simulan localmente. No existen backend, base
de datos compartida, autenticación interna ni integraciones reales.

La pantalla «Modo prueba» permite simular una falla de conexión y
acelerar el recorrido de gestión. Los datos incluidos se usan solo con
fines académicos y de demostración.

Las fotografías incluidas en este repositorio no conservan metadatos
EXIF ni coordenadas GPS. La ubicación del caso de prueba se obtiene de
los datos embebidos en la aplicación.

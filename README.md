# EcoVoz Urbana, aplicación de prueba

> [!IMPORTANT]
> **Aviso académico y de no vinculación institucional**
>
> EcoVoz Urbana es un trabajo práctico realizado por el Grupo C para el
> Taller de Diseño de Aplicaciones de la Maestría en Transformación Digital
> de UNNOBA y UNLP. No es una aplicación oficial ni tiene vinculación
> institucional, contractual, técnica u operativa con la Municipalidad de
> La Plata, sus dependencias o sus autoridades. El municipio no encargó,
> financió, validó, aprobó ni patrocinó este prototipo.
>
> El caso, los reportes, las personas, los estados, las respuestas y las
> actuaciones representadas son ficticios y se utilizan únicamente con
> fines académicos y de demostración. Las fotografías son recursos visuales
> de prueba y no deben interpretarse como evidencia de una actuación
> municipal real. Esta aplicación no debe utilizarse para efectuar reportes
> reales ni para solicitar asistencia ante una emergencia.

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

## Licencia y ausencia de garantías

Salvo que se indique lo contrario, el contenido completo de este
repositorio, incluido su código, se publica bajo la licencia
[Creative Commons Atribución-NoComercial 4.0 Internacional][cc-by-nc].
La atribución debe identificar al Grupo C, Taller de Diseño de
Aplicaciones, Maestría en Transformación Digital, UNNOBA y UNLP, 2026.

El material se ofrece «tal cual», sin garantías de ningún tipo. No se
garantizan su exactitud, disponibilidad, adecuación para un propósito
determinado ni ausencia de errores. Véase el archivo [LICENSE](LICENSE)
para conocer el alcance del aviso y el texto legal aplicable.

[cc-by-nc]: https://creativecommons.org/licenses/by-nc/4.0/deed.es

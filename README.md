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

## Licencias y ausencia de garantías

El software de este repositorio se publica bajo la licencia
[BSD 3-Clause](LICENSE). Esto comprende `index.html`, los archivos de
`css/`, `js/` y `pruebas/`, `manifest.webmanifest` y los archivos de
datos ejecutables. La licencia permite utilizar, modificar y redistribuir
el código, incluso con fines comerciales, siempre que se conserven sus
avisos. No permite usar los nombres de los autores para promocionar o
avalar productos derivados sin autorización previa.

La documentación, los textos explicativos y las fotografías se publican
bajo la licencia [Creative Commons Atribución-NoComercial 4.0
Internacional](LICENSE-CONTENIDOS.md), salvo que se indique lo contrario.
Esto comprende el `README` y los archivos de imagen de `datos/`.

La atribución debe identificar a Laura Lopresti, Samuel Kowalczuk,
Gerardo Breard, Alejandro Luna, Carolina Covas y Francisco Gindre,
integrantes del Grupo C del Taller de Diseño de Aplicaciones, Maestría
en Transformación Digital, UNNOBA y UNLP, 2026. El software y los
contenidos se ofrecen «tal cual», sin garantías de ningún tipo. No se
garantizan su exactitud, disponibilidad, adecuación para un propósito
determinado ni ausencia de errores.

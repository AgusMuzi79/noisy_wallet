# Requerimientos del proyecto: App de Gestión de Gastos (MVP)

## Resumen ejecutivo

App móvil de uso personal para dos personas (una pareja) para llevar las finanzas del hogar en una sola caja común. Funciona con un modelo de **saldo corriente tipo billetera**: hay un único saldo que se arrastra solo de mes a mes. El 1ro de cada mes se acreditan automáticamente los ingresos recurrentes, los gastos lo van bajando, y lo que sobra queda disponible para el mes siguiente sin ningún paso manual. No hay login multiusuario: cada gasto se etiqueta con quién lo hizo, pero la app es un único espacio compartido al que ambos acceden desde sus teléfonos.

> **Nota de alcance:** este documento cubre solo la lógica y el alcance funcional. El diseño visual / look & feel se define por fuera (en Claude Design) y no es parte de estos requerimientos.

## Usuarios y roles

No hay sistema de usuarios ni permisos. La app es de un solo espacio compartido al que ambos acceden desde sus dispositivos.

- **Autor del gasto:** etiqueta simple en cada gasto (vos / tu novia) para saber quién lo registró. No implica cuentas separadas ni autenticación.

## Modelo central: saldo corriente

Es importante tener claro cómo funciona la plata, porque define toda la lógica:

- Existe **un único saldo disponible** (la "billetera").
- El **1ro de cada mes** se le suman automáticamente los **ingresos recurrentes** (los fijos).
- Los **ingresos extra** (una venta, un laburo suelto) se cargan manualmente en cualquier momento y se suman al saldo al instante.
- Cada **gasto** resta del saldo en el momento en que se carga.
- **No hay reseteo mensual:** lo que sobra simplemente permanece en el saldo. El arrastre es automático por diseño.
- **El saldo puede quedar negativo.** No se bloquea ni se avisa: se asume que puede deberse a un error de carga que después se corrige editando los movimientos.

## Alcance del MVP

### Incluye
- Configuración de ingresos recurrentes mensuales, **cargados como fuentes separadas y editables** (acreditación automática el 1ro).
- Carga de ingresos extra puntuales.
- Carga manual de gastos con categoría y autor.
- Categorías con un **set base por defecto** + posibilidad de agregar y editar categorías propias.
- Edición y eliminación de gastos e ingresos.
- Vista principal con el saldo actual y el historial de movimientos.
- Notificación recordatoria diaria a la noche ("¿registraste los gastos de hoy?"), configurable y desactivable.
- **Sincronización en tiempo real entre los dos teléfonos** (backend compartido).
- **Protección de acceso por PIN y biometría.**

### NO incluye (queda para versiones futuras)
- Escaneo de tickets / OCR.
- Gastos en cuotas y proyección de compromisos futuros.
- Reportes, gráficos y estadísticas avanzadas.
- Gamificación (rachas, niveles, badges, logros).
- Múltiples monedas o ajuste automático por inflación / tipo de cambio.
- Cuentas de usuario reales / login individual.

## Épicas y User Stories

### Épica 1: Gestión de ingresos

**Historia 1.1 — Ingresos recurrentes (fuentes separadas)**
Como usuario, quiero configurar cada ingreso fijo por separado, para poder actualizar solo la fuente que cambió (ej. el alquiler ajusta, o la app del club varía por el dólar) sin recalcular el total a mano.
- [ ] Puedo dar de alta varias fuentes de ingreso recurrente, cada una con nombre y monto.
- [ ] La suma de las fuentes activas se acredita al saldo automáticamente el 1ro de cada mes.
- [ ] Puedo editar el monto de una fuente cuando hay un aumento/ajuste, y el cambio aplica desde el próximo mes.
- [ ] Puedo dar de baja una fuente de ingreso.

**Historia 1.2 — Ingreso extra puntual**
Como usuario, quiero cargar un ingreso extra fuera de lo habitual (una venta, un laburo suelto), para que se sume al saldo al instante.
- [ ] Puedo cargar un ingreso con monto, fecha y una nota opcional.
- [ ] El monto se suma al saldo inmediatamente.
- [ ] El ingreso queda registrado en el historial.

### Épica 2: Gestión de gastos

**Historia 2.1 — Cargar un gasto**
Como usuario, quiero registrar un gasto rápido indicando monto, categoría y quién lo hizo, para descontarlo del saldo común.
- [ ] Puedo cargar un gasto con monto, categoría, autor y fecha (por defecto hoy).
- [ ] Puedo agregar una nota opcional.
- [ ] El monto se descuenta del saldo inmediatamente.
- [ ] La carga es rápida (pocos toques).

**Historia 2.2 — Categorías**
Como usuario, quiero contar con categorías ya armadas y poder crear las mías, para clasificar los gastos sin tener que configurar todo de cero.
- [ ] Existe un set de categorías base por defecto.
- [ ] Puedo agregar nuevas categorías.
- [ ] Puedo editar o eliminar categorías.

**Historia 2.3 — Editar / borrar movimientos**
Como usuario, quiero corregir o eliminar un gasto o ingreso cargado por error, para mantener el saldo correcto.
- [ ] Puedo editar cualquier campo de un movimiento existente.
- [ ] Puedo eliminar un movimiento.
- [ ] El saldo se recalcula al editar o borrar.

### Épica 3: Vista principal y saldo

**Historia 3.1 — Ver el saldo y los movimientos**
Como usuario, quiero ver de un vistazo cuánta plata tenemos disponible y el historial reciente, para saber cómo venimos.
- [ ] La pantalla principal muestra el saldo actual de forma destacada (puede ser negativo).
- [ ] Muestra el historial de movimientos (ingresos y gastos) ordenado por fecha.
- [ ] Cada movimiento muestra monto, categoría/tipo, autor y fecha.

**Historia 3.2 — Acreditación automática mensual**
Como usuario, quiero que los ingresos fijos se acrediten solos el 1ro, para no tener que acordarme de cargarlos.
- [ ] El 1ro de cada mes, la suma de las fuentes recurrentes activas se acredita al saldo.
- [ ] La acreditación queda registrada como un movimiento visible en el historial.
- [ ] Si la app no se abrió el día 1, la acreditación pendiente se aplica igual (sin duplicarse).

### Épica 4: Notificaciones

**Historia 4.1 — Recordatorio de carga**
Como usuario, quiero recibir un recordatorio a la noche para no olvidarme de registrar los gastos del día.
- [ ] La app envía una notificación diaria a la noche tipo "¿registraste los gastos de hoy?".
- [ ] El horario es configurable.
- [ ] Puedo desactivar las notificaciones.

### Épica 5: Acceso y seguridad

**Historia 5.1 — Bloqueo de la app**
Como usuario, quiero proteger el acceso a la app, porque muestra información financiera del hogar.
- [ ] La app se desbloquea con PIN.
- [ ] La app se desbloquea con biometría (huella / face).
- [ ] El bloqueo se puede activar/desactivar desde configuración.

### Épica 6: Sincronización

**Historia 6.1 — Datos compartidos en tiempo real**
Como pareja, queremos que los dos carguemos desde nuestros teléfonos y veamos el mismo saldo actualizado, para tener una única fuente de verdad.
- [ ] Los movimientos cargados en un dispositivo aparecen en el otro.
- [ ] El saldo es consistente entre ambos dispositivos.
- [ ] Los datos persisten en un backend compartido.

## Requerimientos no funcionales

- **Plataforma:** app móvil.
- **Carga de uso:** mínima (2 usuarios). No hay requisitos de escala.
- **Privacidad / seguridad:** datos financieros del hogar; acceso protegido por PIN + biometría.
- **Sincronización:** los datos viven en un backend compartido y se mantienen consistentes entre dos dispositivos en tiempo (cuasi) real.
- **Persistencia:** saldo y movimientos persisten entre sesiones.

## Restricciones y supuestos

- Moneda única: pesos argentinos (ARS), monto nominal. Si una fuente varía por el dólar, se actualiza editando esa fuente a mano (no hay conversión automática en el MVP).
- Un único espacio compartido, sin cuentas de usuario individuales ni permisos.
- Las fuentes de ingreso fijas actuales son: el desarrollo/mantenimiento de la app del club y dos alquileres.
- **Saldo inicial:** al arrancar la app por primera vez hay que cargar el saldo actual de la billetera como punto de partida.
- **Diseño visual:** fuera de alcance de este documento; se resuelve por separado.

## Preguntas abiertas

Ninguna pendiente a nivel funcional. Las decisiones de stack/backend (elección concreta del backend de sincronización, base de datos, etc.) se definen en la fase de arquitectura.

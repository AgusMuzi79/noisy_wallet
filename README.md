# NoisyWallet

App móvil de finanzas compartidas para dos personas. Un único saldo común que se arrastra mes a mes, sin resets, sin cuentas de usuario, sin complicaciones.

## La idea

Dos teléfonos, un solo saldo. Cada gasto o ingreso que carga cualquiera de los dos aparece al instante en el otro. No hay login ni permisos: cada movimiento lleva una etiqueta de quién lo registró, nada más.

El modelo es una billetera corriente:

- El **1ro de cada mes** se acreditan automáticamente los ingresos fijos (alquileres, trabajos recurrentes), cada uno como una fuente separada y editable.
- Los **ingresos extra** (una venta, un trabajo puntual) se cargan cuando surgen y se suman al instante.
- Cada **gasto** resta del saldo en el momento en que se registra.
- Lo que sobra **se arrastra solo** al mes siguiente, sin ningún paso manual.
- El saldo **puede quedar negativo** — no se bloquea, se asume que es un error de carga que se corrige editando el movimiento.

## Stack

| Capa | Tecnología |
|---|---|
| Mobile | Expo SDK 56 · React Native 0.85 · TypeScript |
| Routing | Expo Router v4 (file-based) |
| Backend | Supabase — PostgreSQL + Realtime |
| Cron | Supabase Edge Function (acreditación mensual automática) |
| Biometría / PIN | expo-local-authentication + expo-secure-store |
| Push notifications | expo-notifications vía EAS |
| Builds | Expo EAS |

## Pantallas

- **Inicio** — saldo actual (destacado, puede ser negativo) + historial de movimientos ordenado por fecha
- **Nuevo gasto** — monto, categoría, autor, fecha, nota opcional
- **Nuevo ingreso** — monto, fecha, nota opcional
- **Configuración** — fuentes de ingreso recurrentes, categorías, horario de notificación, PIN/biometría

## Base de datos

```
transactions        — todos los movimientos (gastos, ingresos manuales, créditos automáticos)
recurring_sources   — fuentes de ingreso fijo, cada una editable por separado
categories          — set base + categorías personalizadas
monthly_credits     — registro de acreditaciones mensuales (evita duplicados)
settings            — configuración global (singleton, siempre id = 1)
```

El saldo se calcula como:

```
saldo = initial_balance
      + Σ transacciones de tipo 'income' y 'recurring_credit'
      − Σ transacciones de tipo 'expense'
```

## Acreditación automática

Una Supabase Edge Function (`credit-monthly-income`) corre el 1ro de cada mes a las 00:05 ART. Inserta una transacción por cada fuente activa y registra el mes en `monthly_credits` para garantizar idempotencia. La app también la invoca de forma defensiva al abrirse, cubriendo el caso de que el cron no haya corrido.

## MVP — qué incluye y qué no

**Incluye:** ingresos recurrentes configurables · ingresos extra · gastos con categoría y autor · edición y eliminación de movimientos · sincronización en tiempo real · notificación diaria configurable · bloqueo por PIN y biometría.

**No incluye (versiones futuras):** escaneo de tickets · gastos en cuotas · gráficos y reportes · múltiples monedas · cuentas de usuario individuales.

---

Moneda: pesos argentinos (ARS), monto nominal. Sin conversión automática.

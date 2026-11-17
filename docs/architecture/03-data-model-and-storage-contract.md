# Modelo de datos y persistencia

El esquema Prisma en `prisma/schema.prisma` es la fuente técnica para campos, restricciones, enums y relaciones. Esta página resume las entidades principales.

| Entidad | Propósito |
|---|---|
| `User` | Cuenta, email y relaciones con sesiones y datos de trabajo |
| `Session` | Token y vencimiento de sesión asociado a una cuenta |
| `VerificationToken` | Tokens de un solo uso para verificación y recuperación |
| `Opportunity` | Cliente, descripción, presupuesto, canal, etapa y estados de trabajo/pago |
| `Note` | Nota asociada a una oportunidad |
| `StageChange` | Etapa anterior y nueva de una oportunidad |
| `SubStateChange` | Cambio de estado con valores anterior/nuevo y observación opcional |
| `UserSettings` | Umbrales de inactividad y preferencia de notificaciones |
| `Task` | Tarea independiente, opcionalmente vinculada a una oportunidad |
| `Notification` | Aviso asociado a una tarea y a una cuenta |
| `Account` | Relación de proveedor externo prevista por el esquema de autenticación |

## Reglas principales

- Las relaciones de datos de trabajo se vinculan con una cuenta; las consultas privadas se limitan a su propietario autenticado.
- `PipelineStage`, `PaymentStatus`, `DevelopmentStatus` y `ContactChannel` son enums de Prisma.
- Las notas y los cambios de estado son registros históricos. No se ofrece edición ni borrado de notas desde la API.
- Un presupuesto se almacena como valor numérico. La aplicación presenta importes en PEN con el símbolo `S/.`; no convierte divisas.
- `Task.opportunityId` es opcional. Las tareas generales no necesitan una oportunidad.

Consulta el esquema para la definición completa y actualizada.

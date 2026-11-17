# ADR-005 — Módulo de agenda de tareas independiente con 5 opciones de adelanto

**Estado:** Adoptada
**Fecha:** 2026-11-08  
**Afecta:** `prisma/schema.prisma`, `src/services/task-service.ts`, `src/lib/rules/task-schedule.ts`, `src/app/api/tasks/`

## Contexto

El borrador original interpretaba los "recordatorios" como notificaciones disparadas exclusivamente por oportunidades comerciales inactivas. La definición del producto establece que los recordatorios deben funcionar como una **agenda de tareas autónoma** tipo calendario: el freelancer programa tareas operativas independientes (ej. "Enviar mockup", "Cobrar factura", "Reunión de kickoff") con fecha y hora límite, y el sistema genera notificaciones anticipadas.

## Decisión

1. **Modelos desacoplados:** Se implementan las entidades `Task` y `Notification` independientes. Opcionalmente, una tarea puede vincularse a una oportunidad (`opportunityId?`), pero no es obligatorio.
2. **5 opciones de anticipación:** Cada tarea guarda un tiempo de adelanto `leadMinutes` dentro de un conjunto cerrado de opciones:
   - 15 minutos
   - 30 minutos
   - 60 minutos (1 hora)
   - 120 minutos (2 horas)
   - 1440 minutos (1 día)
3. **Canales de aviso:** Notificación en interfaz (campana de alertas y badge) y despacho mediante el adaptador de correo.

## Alternativas consideradas

1. *Vincular tareas únicamente como subtareas de oportunidades:* Descartado porque el freelancer requiere gestionar hitos administrativos generales que no siempre corresponden a un deal específico.
2. *Tiempos de notificación arbitrarios en segundos:* Descartado para mantener una interfaz limpia y simplificar el programador de alertas.

## Consecuencias

- Flexibilidad funcional completa para el usuario independiente.
- Regla de dominio pura `calculateNotificationTrigger(dueDate, leadMinutes)` fácilmente testeable con pruebas unitarias sin dependencias externas.



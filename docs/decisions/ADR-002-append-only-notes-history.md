# ADR-002 — Historial y notas bajo principio estricto Append-Only

**Estado:** Adoptada
**Fecha:** 2026-11-08  
**Afecta:** `prisma/schema.prisma`, `src/services/note-service.ts`, `src/app/api/notes/route.ts`

## Contexto

En la gestión de oportunidades de freelance y negociaciones comerciales, la pérdida o edición retrospectiva de acuerdos, compromisos de fechas o montos presupuestados introduce riesgos de inconsistencia y pérdida de contexto histórico. Se evaluó si el sistema debía permitir actualizar o eliminar comentarios registrados previamente por el usuario.

## Decisión

Todas las notas y registros de auditoría de estado (`StageChange`, `SubStateChange`, `Note`) son de **solo inserción (*append-only*)**:
1. No existe interfaz de usuario para editar o eliminar una nota registrada.
2. Los servicios de dominio no implementan métodos `updateNote` o `deleteNote`.
3. Los endpoints HTTP correspondientes (`PATCH`, `PUT`, `DELETE` en `/api/notes/` y `/api/notes/[id]`) devuelven explícitamente código de error `405 Method Not Allowed`.

## Alternativas consideradas

1. *Permitir edición y borrado con soft-delete:* Descartado para evitar que el historial de una propuesta pierda su coherencia cronológica original.
2. *Estricto Append-Only:* Seleccionado. Garantiza inmutabilidad, simplicidad de sincronización y total trazabilidad del flujo de ventas.

## Consecuencias

- Integridad de datos garantizada a nivel de schema y controladores.
- Reducción de complejidad en la base de datos al no requerir flags de soft-delete en notas.
- Pruebas unitarias e integrales verifican el rechazo activo (HTTP 405) de mutaciones retrospectivas.



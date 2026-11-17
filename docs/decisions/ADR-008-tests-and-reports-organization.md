# ADR-008 — Separación de código y pruebas permanentes

**Estado:** Adoptada  
**Fecha:** 2026-11-11

## Contexto

El código de aplicación debe permanecer separado de las pruebas para que cada tipo de archivo tenga un propósito y un ciclo de vida claros. Las pruebas forman parte del producto de software: previenen regresiones y permiten mantener el comportamiento con cambios futuros.

## Decisión

- El código definitivo de la aplicación reside bajo `src/`.
- Las pruebas unitarias y de integración viven bajo `tests/` y se mantienen junto con el producto.
- Las pruebas usan dobles para aislar servicios externos y no requieren enviar correos reales.
- Las configuraciones de Vitest separan la suite completa de la ejecución unitaria aislada.

## Alternativas consideradas

1. Guardar pruebas dentro del código de aplicación: descartado porque mezcla lógica de producto y verificación.
2. Eliminar pruebas después de cada entrega: descartado porque elimina la protección frente a regresiones.

## Consecuencias

La estructura mantiene el código de producción pequeño y permite ejecutar las pruebas unitarias de forma independiente de servicios externos.


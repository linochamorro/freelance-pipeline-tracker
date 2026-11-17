# ADR-003 — Umbrales de inactividad configurables

**Estado:** Adoptada  
**Fecha:** 2026-11-08

## Contexto

Las oportunidades pueden permanecer en distintas etapas durante lapsos diferentes. Un único umbral fijo puede marcar como inactivos flujos que siguen su ritmo normal.

## Decisión

El cálculo de inactividad usa los valores guardados en `UserSettings`: umbrales diferenciados para prospección, propuestas, ejecución, facturación y etapas cerradas. Las reglas reciben los valores como datos de entrada y usan los valores predeterminados definidos por el esquema cuando corresponde.

## Alternativas consideradas

- Un único umbral global: descartado porque no representa las necesidades de cada etapa.
- Umbrales configurables por cuenta: adoptado por mantener separadas configuración y regla de negocio.

## Consecuencias

La interfaz de ajustes permite modificar los umbrales y el dashboard los aplica al identificar oportunidades inactivas.


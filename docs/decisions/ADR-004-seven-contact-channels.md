# ADR-004 — Enumeración de exactamente 7 canales de contacto

**Estado:** Adoptada
**Fecha:** 2026-11-09  
**Afecta:** `prisma/schema.prisma`, `src/lib/rules/contact-channels.ts`, componentes UI de formularios y filtros

## Contexto

Durante el levantamiento de requisitos previos se detectó una inconsistencia entre la especificación escrita (que listaba 6 canales) y los tipos definidos en Prisma y componentes TypeScript. Era imprescindible fijar la lista exhaustiva y canónica para evitar errores en selectores de formularios y validaciones de esquema.

## Decisión

El enum `ContactChannel` contiene **exactamente 7 valores oficiales**:
1. `LinkedIn` (redes profesionales)
2. `Email` (correo directo)
3. `Referral` (referencia o recomendación)
4. `ColdOutreach` (prospección en frío)
5. `WhatsApp` (mensajería directa)
6. `Phone` (llamada telefónica)
7. `Other` (cualquier otro canal no catalogado)

Ningún otro valor es admitido por la capa de validación Zod ni persistido en la base de datos.

## Alternativas consideradas

1. *Permitir canales arbitrarios como texto libre (`string`):* Descartado por fragmentación de datos y pérdida de capacidad analítica en reportes y filtros.
2. *Limitar a 5 o 6 opciones fijas:* Descartado para dar cabida expresa a WhatsApp y llamadas telefónicas, fundamentales en el mercado independiente hispanohablante e internacional.

## Consecuencias

- Coherencia absoluta entre la base de datos PostgreSQL, los esquemas de validación Zod, las reglas de dominio y los selectores del frontend.
- Tipado estricto en TypeScript sin necesidad de conversiones forzadas (`as string`).



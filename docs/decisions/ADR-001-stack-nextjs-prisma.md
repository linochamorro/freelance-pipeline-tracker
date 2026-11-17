# ADR-001 — Stack de aplicación, persistencia y autenticación

**Estado:** Adoptada  
**Fecha:** 2026-11-08

## Contexto

El producto necesita una aplicación web tipada, persistencia relacional y autenticación de cuentas individuales. La configuración debe poder instalarse y ejecutarse de forma reproducible.

## Decisión

- Next.js App Router, React y TypeScript para la aplicación web.
- PostgreSQL con Prisma y el generador `prisma-client-js` para persistencia.
- Autenticación propia mediante endpoints de registro, login, logout y recuperación. Las contraseñas se verifican con bcrypt y las sesiones se almacenan en PostgreSQL.
- Tailwind CSS para estilos de interfaz.

## Alternativas consideradas

Se prefieren componentes estables y configuraciones reproducibles frente a generadores ORM experimentales o autenticación no utilizada por la aplicación.

## Consecuencias

El esquema Prisma y los manifiestos de dependencias describen la configuración ejecutable. Los secretos de entorno se configuran localmente y no se incluyen en el repositorio.


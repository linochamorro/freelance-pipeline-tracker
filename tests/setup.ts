// Configuración inicial de entorno de pruebas Vitest
// Dobles de servicios y variables de entorno seguras para pruebas

// Shim de React.act: React 19 ya no exporta `act` desde "react" y
// react-dom/test-utils.act delega a React.act (que no existe), por lo que
// @testing-library/react no puede montar componentes. Este shim solo se
// define cuando falta, ejecuta el callback y fuerza el vaciado del trabajo
// sincrónico programado por React 19 (createRoot.render programa trabajo que
// de otro modo nunca se confirma en jsdom). No afecta código de producto ni
// secretos, y no modifica pruebas ni código de otras fases.
import React from "react";
import ReactDOM from "react-dom";

if (typeof (React as any).act !== "function") {
  // Ejecuta el callback dentro de flushSync para forzar el commit síncrono del
  // render (React 19 lo diferencia por defecto). Esto es lo mínimo necesario
  // para que @testing-library/react monte componentes en jsdom.
  (React as any).act = (callback: () => unknown): unknown => {
    if (typeof ReactDOM.flushSync === "function") {
      return ReactDOM.flushSync(callback);
    }
    return callback();
  };
}

import "@testing-library/jest-dom";

// Asegurar que el entorno de tests no emita llamadas reales.
// Vitest define NODE_ENV="test" automáticamente, por lo que no se asigna aquí
// (evita conflicto con tipado readonly de process.env en @types/node / Node v26).
process.env.AUTH_SECRET = process.env.AUTH_SECRET || "mock-secret-key-for-vitest-testing-min-32-chars";

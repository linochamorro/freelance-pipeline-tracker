#!/usr/bin/env node

import { randomBytes } from "node:crypto";
import process from "node:process";

try {
  process.loadEnvFile(".env");
} catch (error) {
  if (error?.code !== "ENOENT") {
    throw error;
  }
}

if (process.env.NODE_ENV === "production") {
  throw new Error("Demo seeding is disabled in production.");
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required. No connection was attempted.");
}

let databaseUrl;
try {
  databaseUrl = new URL(connectionString);
} catch {
  throw new Error("DATABASE_URL is invalid. No connection was attempted.");
}

const hostname = databaseUrl.hostname.replace(/^\[|\]$/g, "").toLowerCase();
const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
if (!localHosts.has(hostname)) {
  throw new Error(
    "Demo seeding is restricted to a PostgreSQL server on localhost/loopback. No connection was attempted.",
  );
}

if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol)) {
  throw new Error("DATABASE_URL must use PostgreSQL. No connection was attempted.");
}

const [{ PrismaClient }, bcrypt] = await Promise.all([
  import("@prisma/client"),
  import("bcryptjs"),
]);

const prisma = new PrismaClient();
const demoEmail = "demo@freelance-pipeline.local";
const demoPassword = randomBytes(24).toString("base64url");

try {
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email: demoEmail } });
    if (existing) {
      return { created: false };
    }

    const user = await tx.user.create({
      data: {
        name: "Freelance Demo",
        email: demoEmail,
        passwordHash: await bcrypt.hash(demoPassword, 12),
        userSettings: { create: {} },
      },
    });

    const [lead, proposal] = await Promise.all([
      tx.opportunity.create({
        data: {
          userId: user.id,
          clientName: "Andes Coffee Co.",
          description: "Landing page y catálogo para una marca de café local.",
          estimatedBudget: 4200,
          contactPersonName: "María Demo",
          contactChannel: "Referral",
          pipelineStage: "Lead",
          notes: {
            create: { content: "Primera reunión de descubrimiento agendada." },
          },
        },
      }),
      tx.opportunity.create({
        data: {
          userId: user.id,
          clientName: "Orion Studio",
          description: "Rediseño de sitio institucional con formulario de contacto.",
          estimatedBudget: 7600,
          contactPersonName: "Diego Ejemplo",
          contactChannel: "Email",
          pipelineStage: "ProposalSent",
          notes: {
            create: { content: "Propuesta enviada; pendiente de comentarios." },
          },
        },
      }),
    ]);

    const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const task = await tx.task.create({
      data: {
        userId: user.id,
        opportunityId: proposal.id,
        title: "Dar seguimiento a la propuesta",
        description: "Consultar si el cliente necesita ajustes en el alcance.",
        dueDate,
        leadMinutes: 60,
      },
    });

    await tx.notification.create({
      data: {
        userId: user.id,
        taskId: task.id,
        title: "Seguimiento pendiente",
        message: "Recuerda consultar sobre la propuesta enviada.",
        triggerAt: new Date(dueDate.getTime() - task.leadMinutes * 60 * 1000),
      },
    });

    await tx.task.create({
      data: {
        userId: user.id,
        opportunityId: lead.id,
        title: "Preparar preguntas de descubrimiento",
        description: "Revisar objetivos y necesidades antes de la primera reunión.",
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        leadMinutes: 30,
      },
    });

    return { created: true, taskCount: 2, opportunityCount: 2 };
  });

  if (!result.created) {
    console.log(`La cuenta demo ${demoEmail} ya existe; no se modificaron ni duplicaron datos.`);
  } else {
    console.log("Se creó una cuenta demo local con oportunidades, notas, tareas y un aviso sintéticos.");
    console.log(`Email de acceso: ${demoEmail}`);
    console.log(`Contraseña temporal aleatoria (guárdala localmente): ${demoPassword}`);
  }
} finally {
  await prisma.$disconnect();
}

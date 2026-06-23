import { PrismaClient, PipelineStage, ContactChannel } from "@/generated/prisma";

const prisma = new PrismaClient();

export async function createTestUser(overrides: Partial<{ name: string; email: string }> = {}) {
  return prisma.user.create({
    data: {
      name: overrides.name ?? "Test User",
      email: overrides.email ?? "test@example.com",
      passwordHash: "$2a$10$dummyhash",
    },
  });
}

export async function createTestOpportunity(
  userId: string,
  overrides: Partial<{
    clientName: string;
    description: string;
    estimatedBudget: number;
    pipelineStage: PipelineStage;
    contactChannel: ContactChannel;
  }> = {},
) {
  return prisma.opportunity.create({
    data: {
      userId,
      clientName: overrides.clientName ?? "Test Client",
      description: overrides.description ?? "A test project",
      estimatedBudget: overrides.estimatedBudget ?? 5000,
      contactPersonName: "John Doe",
      contactChannel: overrides.contactChannel ?? ContactChannel.Email,
      pipelineStage: overrides.pipelineStage ?? PipelineStage.Lead,
    },
  });
}

export async function cleanDatabase() {
  await prisma.note.deleteMany();
  await prisma.stageChange.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.userSettings.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();
}

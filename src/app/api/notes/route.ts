import { auth } from "@/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { addNote, getNotesByOpportunity } from "@/services/note-service";
import { z } from "zod";

const createNoteSchema = z.object({
  opportunityId: z.string().min(1),
  content: z.string().min(1, "Note content is required"),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const opportunityId = searchParams.get("opportunityId");
  if (!opportunityId) return errorResponse("opportunityId query param is required", 400);

  try {
    const notes = await getNotesByOpportunity(opportunityId, session.user.id);
    return successResponse(notes);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Failed to fetch notes", 404);
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse("Unauthorized", 401);

  const body = await request.json();
  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.errors[0].message, 400);
  }

  try {
    const note = await addNote(
      parsed.data.opportunityId,
      session.user.id,
      parsed.data.content,
    );
    return successResponse(note, 201);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Failed to add note", 400);
  }
}

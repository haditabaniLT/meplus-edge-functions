import { createSupabaseClient } from "../utils/supabaseClient.ts";
import { createErrorResponse, createSuccessResponse, AuthenticatedUser } from "../utils/authHelpers.ts";

export interface CreateTaskRequest {
  category: string;
  title: string;
  content: string;
  priority?: "low" | "medium" | "high";
  due_date?: string;
  tags?: string[];
}

export const createTask = async (req: Request, user: AuthenticatedUser) => {
  try {
    const body: CreateTaskRequest = await req.json();
    
    // Validate required fields
    if (!body.category || !body.title || !body.content) {
      return createErrorResponse("Missing required fields: category, title, content");
    }

    const supabase = createSupabaseClient();
    
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        category: body.category,
        title: body.title,
        content: body.content,
        // priority: body.priority || "medium",
        // due_date: body.due_date || null,
        // tags: body.tags || [],
        // status: "pending",
        // favorite: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return createErrorResponse(`Failed to create task: ${error.message}`, 500);
    }

    return createSuccessResponse(data, "Task created successfully");
  } catch (error) {
    return createErrorResponse(`Invalid request: ${error.message}`, 400);
  }
};

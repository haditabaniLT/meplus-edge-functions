import { createSupabaseClient } from "../utils/supabaseClient.ts";
import { createErrorResponse, createSuccessResponse, AuthenticatedUser } from "../utils/authHelpers.ts";

export interface UpdateTaskRequest {
  title?: string;
  content?: string;
  category?: string;
  status?: "active" | "archived" | "deleted";
  type?: "generated" | "custom";
  tags?: string[];
  is_favorite?: boolean;
  is_shared?: boolean;
  shared_link?: string;
  metadata?: Record<string, any>;
}

export const updateTask = async (req: Request, user: AuthenticatedUser, taskId: string) => {
  try {
    const body: UpdateTaskRequest = await req.json();
    
    if (Object.keys(body).length === 0) {
      return createErrorResponse("No fields to update");
    }

    const supabase = createSupabaseClient();
    
    // First check if task exists and belongs to user
    const { data: existingTask, error: fetchError } = await supabase
      .from("tasks")
      .select("id")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return createErrorResponse("Task not found", 404);
      }
      return createErrorResponse(`Failed to fetch task: ${fetchError.message}`, 500);
    }

    // Update the task
    const updateData = {
      ...body,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("tasks")
      .update(updateData)
      .eq("id", taskId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return createErrorResponse(`Failed to update task: ${error.message}`, 500);
    }

    return createSuccessResponse(data, "Task updated successfully");
  } catch (error) {
    return createErrorResponse(`Invalid request: ${error.message}`, 400);
  }
};

import { createSupabaseClient } from "../utils/supabaseClient.ts";
import { createErrorResponse, createSuccessResponse, AuthenticatedUser } from "../utils/authHelpers.ts";

export const deleteTask = async (req: Request, user: AuthenticatedUser, taskId: string) => {
  try {
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

    // Delete the task
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("user_id", user.id);

    if (error) {
      return createErrorResponse(`Failed to delete task: ${error.message}`, 500);
    }

    return createSuccessResponse({ id: taskId }, "Task deleted successfully");
  } catch (error) {
    return createErrorResponse(`Invalid request: ${error.message}`, 400);
  }
};

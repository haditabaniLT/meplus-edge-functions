import { createSupabaseClient } from "../utils/supabaseClient.ts";
import { createErrorResponse, createSuccessResponse, AuthenticatedUser } from "../utils/authHelpers.ts";

export const getTaskById = async (req: Request, user: AuthenticatedUser, taskId: string) => {
  try {
    const supabase = createSupabaseClient();
    
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return createErrorResponse("Task not found", 404);
      }
      return createErrorResponse(`Failed to fetch task: ${error.message}`, 500);
    }

    return createSuccessResponse(data, "Task fetched successfully");
  } catch (error) {
    return createErrorResponse(`Invalid request: ${error.message}`, 400);
  }
};

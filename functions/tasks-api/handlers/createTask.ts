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
    
    // Check user plan limits before creating task
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("plan, usage")
      .eq("id", user.id)
      .single();

    if (userError) {
      return createErrorResponse(`Failed to fetch user data: ${userError.message}`, 500);
    }

    // Get plan details
    const { data: planData, error: planError } = await supabase
      .from("plans")
      .select("*")
      .eq("name", userData.plan)
      .single();

    if (planError) {
      return createErrorResponse(`Failed to fetch plan data: ${planError.message}`, 500);
    }

    // Check task limit
    const currentTasksGenerated = (userData.usage?.tasks_generated || 0) as number;
    if (planData.task_limit && currentTasksGenerated >= planData.task_limit) {
      return createErrorResponse("Task limit reached for your current plan", 403);
    }
    
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        category: body.category,
        title: body.title,
        content: body.content,
        priority: body.priority || "medium",
        due_date: body.due_date || null,
        tags: body.tags || [],
        status: "active",
        type: "custom",
        is_favorite: false,
        is_shared: false,
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

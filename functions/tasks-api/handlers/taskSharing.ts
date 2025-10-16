import { createSupabaseClient } from "../utils/supabaseClient.ts";
import { createErrorResponse, createSuccessResponse, AuthenticatedUser } from "../utils/authHelpers.ts";

// Share task
export const shareTask = async (req: Request, user: AuthenticatedUser, taskId: string) => {
  try {
    const supabase = createSupabaseClient();
    
    // First check if task exists and user owns it
    const { data: existingTask, error: fetchError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingTask) {
      return createErrorResponse("Task not found or access denied", 404);
    }

    // Generate share link
    const frontendUrl = (globalThis as any).Deno?.env?.get("FRONTEND_URL") || "https://meplus.ai";
    const sharedLink = `${frontendUrl}/task/${taskId}`;

    const { data, error } = await supabase
      .from("tasks")
      .update({
        is_shared: true,
        shared_link: sharedLink,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return createErrorResponse(`Failed to share task: ${error.message}`, 500);
    }

    return createSuccessResponse({
      task: data,
      shared_link: sharedLink
    }, "Task shared successfully");
  } catch (error) {
    return createErrorResponse(`Invalid request: ${error.message}`, 400);
  }
};

// Unshare task
export const unshareTask = async (req: Request, user: AuthenticatedUser, taskId: string) => {
  try {
    const supabase = createSupabaseClient();
    
    // First check if task exists and user owns it
    const { data: existingTask, error: fetchError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingTask) {
      return createErrorResponse("Task not found or access denied", 404);
    }

    const { data, error } = await supabase
      .from("tasks")
      .update({
        is_shared: false,
        shared_link: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return createErrorResponse(`Failed to unshare task: ${error.message}`, 500);
    }

    return createSuccessResponse(data, "Task unshared successfully");
  } catch (error) {
    return createErrorResponse(`Invalid request: ${error.message}`, 400);
  }
};

// Export task
export const exportTask = async (req: Request, user: AuthenticatedUser, taskId: string) => {
  try {
    const supabase = createSupabaseClient();
    
    // First check if task exists and user owns it
    const { data: existingTask, error: fetchError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingTask) {
      return createErrorResponse("Task not found or access denied", 404);
    }

    // Check user plan limits before export
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

    // Check export limit
    const currentExportCount = (userData.usage?.export_count || 0) as number;
    if (planData.export_limit && currentExportCount >= planData.export_limit) {
      return createErrorResponse("Export limit reached for your current plan", 403);
    }

    // Increment export count
    const newExportCount = currentExportCount + 1;
    const { error: updateUsageError } = await supabase
      .from("users")
      .update({
        usage: {
          ...userData.usage,
          export_count: newExportCount
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateUsageError) {
      return createErrorResponse(`Failed to update usage: ${updateUsageError.message}`, 500);
    }

    // Prepare export data
    const exportData = {
      id: existingTask.id,
      title: existingTask.title,
      content: existingTask.content,
      category: existingTask.category,
      priority: existingTask.priority,
      status: existingTask.status,
      tags: existingTask.tags,
      created_at: existingTask.created_at,
      updated_at: existingTask.updated_at,
      exported_at: new Date().toISOString(),
      exported_by: user.id
    };

    // Return downloadable JSON
    const jsonString = JSON.stringify(exportData, null, 2);
    
    return new Response(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="task-${taskId}.json"`,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (error) {
    return createErrorResponse(`Invalid request: ${error.message}`, 400);
  }
};

// Export multiple tasks
export const exportTasks = async (req: Request, user: AuthenticatedUser) => {
  try {
    const url = new URL(req.url);
    const taskIds = url.searchParams.get("taskIds");
    const category = url.searchParams.get("category");
    const status = url.searchParams.get("status");

    if (!taskIds && !category && !status) {
      return createErrorResponse("Please specify taskIds, category, or status to export", 400);
    }

    const supabase = createSupabaseClient();
    
    // Build query
    let query = supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id);

    if (taskIds) {
      const ids = taskIds.split(",");
      query = query.in("id", ids);
    } else {
      if (category) query = query.eq("category", category);
      if (status) query = query.eq("status", status);
    }

    const { data: tasks, error } = await query;

    if (error) {
      return createErrorResponse(`Failed to fetch tasks: ${error.message}`, 500);
    }

    if (!tasks || tasks.length === 0) {
      return createErrorResponse("No tasks found to export", 404);
    }

    // Check user plan limits before export
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

    // Check export limit
    const currentExportCount = (userData.usage?.export_count || 0) as number;
    if (planData.export_limit && currentExportCount >= planData.export_limit) {
      return createErrorResponse("Export limit reached for your current plan", 403);
    }

    // Increment export count
    const newExportCount = currentExportCount + 1;
    const { error: updateUsageError } = await supabase
      .from("users")
      .update({
        usage: {
          ...userData.usage,
          export_count: newExportCount
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateUsageError) {
      return createErrorResponse(`Failed to update usage: ${updateUsageError.message}`, 500);
    }

    // Prepare export data
    const exportData = {
      exported_at: new Date().toISOString(),
      exported_by: user.id,
      total_tasks: tasks.length,
      tasks: tasks.map(task => ({
        id: task.id,
        title: task.title,
        content: task.content,
        category: task.category,
        priority: task.priority,
        status: task.status,
        tags: task.tags,
        created_at: task.created_at,
        updated_at: task.updated_at,
      }))
    };

    // Return downloadable JSON
    const jsonString = JSON.stringify(exportData, null, 2);
    
    return new Response(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="tasks-export-${new Date().toISOString().split('T')[0]}.json"`,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (error) {
    return createErrorResponse(`Invalid request: ${error.message}`, 400);
  }
};

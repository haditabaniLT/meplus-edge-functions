import { createSupabaseClient } from "../utils/supabaseClient.ts";
import { createErrorResponse, createSuccessResponse, AuthenticatedUser } from "../utils/authHelpers.ts";

export interface UsageData {
  plan: string;
  usage: {
    tasks_generated: number;
    export_count: number;
  };
  limits: {
    tasks_generated: number | null;
    export_limit: number | null;
  };
}

export const getUsage = async (req: Request, user: AuthenticatedUser) => {
  try {
    const supabase = createSupabaseClient();
    
    // Get user's plan and usage from users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("plan, usage")
      .eq("id", user.id)
      .single();

    if (userError) {
      return createErrorResponse(`Failed to fetch user data: ${userError.message}`, 500);
    }

    const userPlan = userData?.plan || "BASE";
    const currentUsage = userData?.usage || { tasks_generated: 0, export_count: 0 };

    // Get plan limits from plans table
    const { data: planData, error: planError } = await supabase
      .from("plans")
      .select("task_limit, export_limit")
      .eq("name", userPlan)
      .single();

    if (planError) {
      return createErrorResponse(`Failed to fetch plan limits: ${planError.message}`, 500);
    }

    const response: UsageData = {
      plan: userPlan,
      usage: {
        tasks_generated: currentUsage.tasks_generated || 0,
        export_count: currentUsage.export_count || 0,
      },
      limits: {
        tasks_generated: planData.task_limit,
        export_limit: planData.export_limit,
      },
    };

    return createSuccessResponse(response, "Usage data fetched successfully");
  } catch (error) {
    return createErrorResponse(`Invalid request: ${error.message}`, 400);
  }
};

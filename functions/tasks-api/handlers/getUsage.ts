import { createSupabaseClient } from "../utils/supabaseClient.ts";
import { createErrorResponse, createSuccessResponse, AuthenticatedUser } from "../utils/authHelpers.ts";

export interface UsageData {
  plan: string;
  usage: {
    tasks_generated: number;
    export_count: number;
  };
  limits: {
    tasks_generated: number;
    export_limit: number;
  };
}

export const getUsage = async (req: Request, user: AuthenticatedUser) => {
  try {
    const supabase = createSupabaseClient();
    
    // Get user's plan from users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("plan")
      .eq("id", user.id)
      .single();

    if (userError) {
      return createErrorResponse(`Failed to fetch user data: ${userError.message}`, 500);
    }

    const userPlan = userData?.plan || "BASE";

    // Get plan limits from plans table
    const { data: planData, error: planError } = await supabase
      .from("plans")
      .select("tasks_generated_limit, export_limit")
      .eq("name", userPlan)
      .single();

    if (planError) {
      return createErrorResponse(`Failed to fetch plan limits: ${planError.message}`, 500);
    }

    // Get current usage from usage_tracking table
    const { data: usageData, error: usageError } = await supabase
      .from("usage_tracking")
      .select("tasks_generated, export_count")
      .eq("user_id", user.id)
      .eq("month", new Date().toISOString().slice(0, 7)) // YYYY-MM format
      .single();

    // If no usage data exists, create it with zeros
    let currentUsage = { tasks_generated: 0, export_count: 0 };
    
    if (usageError && usageError.code !== "PGRST116") {
      return createErrorResponse(`Failed to fetch usage data: ${usageError.message}`, 500);
    } else if (usageData) {
      currentUsage = usageData;
    } else {
      // Create initial usage record for this month
      const { error: insertError } = await supabase
        .from("usage_tracking")
        .insert({
          user_id: user.id,
          month: new Date().toISOString().slice(0, 7),
          tasks_generated: 0,
          export_count: 0,
        });

      if (insertError) {
        console.warn(`Failed to create usage record: ${insertError.message}`);
      }
    }

    const response: UsageData = {
      plan: userPlan,
      usage: currentUsage,
      limits: {
        tasks_generated: planData.tasks_generated_limit,
        export_limit: planData.export_limit,
      },
    };

    return createSuccessResponse(response, "Usage data fetched successfully");
  } catch (error) {
    return createErrorResponse(`Invalid request: ${error.message}`, 400);
  }
};

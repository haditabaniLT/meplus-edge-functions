import { createSupabaseClient } from "../utils/supabaseClient.ts";
import { createErrorResponse, createSuccessResponse, AuthenticatedUser } from "../utils/authHelpers.ts";

export const getTasks = async (req: Request, user: AuthenticatedUser) => {
  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const status = url.searchParams.get("status");
    const limit = url.searchParams.get("limit");
    const offset = url.searchParams.get("offset");

    const supabase = createSupabaseClient();
    
    let query = supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Apply filters
    if (category) {
      query = query.eq("category", category);
    }
    
    if (status) {
      query = query.eq("status", status);
    }

    // Apply pagination
    if (limit) {
      const limitNum = parseInt(limit);
      if (limitNum > 0) {
        query = query.limit(limitNum);
      }
    }

    if (offset) {
      const offsetNum = parseInt(offset);
      if (offsetNum >= 0) {
        query = query.range(offsetNum, offsetNum + (parseInt(limit) || 10) - 1);
      }
    }

    const { data, error } = await query;

    if (error) {
      return createErrorResponse(`Failed to fetch tasks: ${error.message}`, 500);
    }

    return createSuccessResponse(data, "Tasks fetched successfully");
  } catch (error) {
    return createErrorResponse(`Invalid request: ${error.message}`, 400);
  }
};

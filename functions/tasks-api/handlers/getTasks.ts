import { createSupabaseClient } from "../utils/supabaseClient.ts";
import { createErrorResponse, createSuccessResponse, AuthenticatedUser } from "../utils/authHelpers.ts";

export const getTasks = async (req: Request, user: AuthenticatedUser) => {
  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");
    const fromDate = url.searchParams.get("fromDate");
    const toDate = url.searchParams.get("toDate");
    const priority = url.searchParams.get("priority");
    const isFavorite = url.searchParams.get("isFavorite");
    const sortBy = url.searchParams.get("sortBy") || "created_at";
    const sortOrder = url.searchParams.get("sortOrder") || "desc";
    const limit = url.searchParams.get("limit");
    const offset = url.searchParams.get("offset");

    const supabase = createSupabaseClient();
    
    // Build base query
    let query = supabase
      .from("tasks")
      .select("*", { count: 'exact' })
      .eq("user_id", user.id);

    // Apply filters
    if (category) {
      query = query.eq("category", category);
    }
    
    if (status) {
      query = query.eq("status", status);
    }

    if (priority) {
      query = query.eq("priority", priority);
    }

    if (isFavorite !== null && isFavorite !== undefined) {
      query = query.eq("is_favorite", isFavorite === "true");
    }

    // Apply search filter (title and content)
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    // Apply date range filters
    if (fromDate) {
      query = query.gte("created_at", fromDate);
    }

    if (toDate) {
      query = query.lte("created_at", toDate);
    }

    // Apply sorting
    const ascending = sortOrder.toLowerCase() === "asc";
    query = query.order(sortBy, { ascending });

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

    const { data, error, count } = await query;

    if (error) {
      return createErrorResponse(`Failed to fetch tasks: ${error.message}`, 500);
    }

    // Return paginated result with meta
    return createSuccessResponse({
      data: data || [],
      count: count || 0,
      pagination: {
        limit: parseInt(limit) || 10,
        offset: parseInt(offset) || 0,
        hasMore: (parseInt(offset) || 0) + (parseInt(limit) || 10) < (count || 0)
      }
    }, "Tasks fetched successfully");
  } catch (error) {
    return createErrorResponse(`Invalid request: ${error.message}`, 400);
  }
};

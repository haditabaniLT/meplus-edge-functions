import { createSupabaseClient } from "../utils/supabaseClient.ts";
import { createErrorResponse, createSuccessResponse, AuthenticatedUser } from "../utils/authHelpers.ts";

export interface CreateTemplateRequest {
  title: string;
  category: string;
  content: string;
  tags?: string[];
  is_public?: boolean;
  is_favorite?: boolean;
}

export interface UpdateTemplateRequest {
  title?: string;
  category?: string;
  content?: string;
  tags?: string[];
  is_public?: boolean;
  is_favorite?: boolean;
}

// Create template
export const createTemplate = async (req: Request, user: AuthenticatedUser) => {
  try {
    const body: CreateTemplateRequest = await req.json();
    
    // Validate required fields
    if (!body.title || !body.category || !body.content) {
      return createErrorResponse("Missing required fields: title, category, content");
    }

    const supabase = createSupabaseClient();
    
    const { data, error } = await supabase
      .from("templates")
      .insert({
        user_id: user.id,
        title: body.title,
        category: body.category,
        content: body.content,
        tags: body.tags || [],
        is_public: body.is_public || false,
        is_favorite: body.is_favorite || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return createErrorResponse(`Failed to create template: ${error.message}`, 500);
    }

    return createSuccessResponse(data, "Template created successfully");
  } catch (error) {
    return createErrorResponse(`Invalid request: ${error.message}`, 400);
  }
};

// Get templates
export const getTemplates = async (req: Request, user: AuthenticatedUser) => {
  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const isPublic = url.searchParams.get("isPublic");
    const isFavorite = url.searchParams.get("isFavorite");
    const search = url.searchParams.get("search");
    const sortBy = url.searchParams.get("sortBy") || "created_at";
    const sortOrder = url.searchParams.get("sortOrder") || "desc";
    const limit = url.searchParams.get("limit");
    const offset = url.searchParams.get("offset");

    const supabase = createSupabaseClient();
    
    // Build base query - include public templates and user's own templates
    let query = supabase
      .from("templates")
      .select("*", { count: 'exact' })
      .or(`user_id.eq.${user.id},is_public.eq.true`);

    // Apply filters
    if (category) {
      query = query.eq("category", category);
    }

    if (isPublic !== null && isPublic !== undefined) {
      query = query.eq("is_public", isPublic === "true");
    }

    if (isFavorite !== null && isFavorite !== undefined) {
      query = query.eq("is_favorite", isFavorite === "true");
    }

    // Apply search filter (title and content)
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
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
      return createErrorResponse(`Failed to fetch templates: ${error.message}`, 500);
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
    }, "Templates fetched successfully");
  } catch (error) {
    return createErrorResponse(`Invalid request: ${error.message}`, 400);
  }
};

// Get template by ID
export const getTemplateById = async (req: Request, user: AuthenticatedUser, templateId: string) => {
  try {
    const supabase = createSupabaseClient();
    
    const { data, error } = await supabase
      .from("templates")
      .select("*")
      .eq("id", templateId)
      .or(`user_id.eq.${user.id},is_public.eq.true`)
      .single();

    if (error) {
      return createErrorResponse(`Failed to fetch template: ${error.message}`, 500);
    }

    if (!data) {
      return createErrorResponse("Template not found", 404);
    }

    return createSuccessResponse(data, "Template fetched successfully");
  } catch (error) {
    return createErrorResponse(`Invalid request: ${error.message}`, 400);
  }
};

// Update template
export const updateTemplate = async (req: Request, user: AuthenticatedUser, templateId: string) => {
  try {
    const body: UpdateTemplateRequest = await req.json();
    
    const supabase = createSupabaseClient();
    
    // First check if template exists and user owns it
    const { data: existingTemplate, error: fetchError } = await supabase
      .from("templates")
      .select("*")
      .eq("id", templateId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingTemplate) {
      return createErrorResponse("Template not found or access denied", 404);
    }

    const { data, error } = await supabase
      .from("templates")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", templateId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return createErrorResponse(`Failed to update template: ${error.message}`, 500);
    }

    return createSuccessResponse(data, "Template updated successfully");
  } catch (error) {
    return createErrorResponse(`Invalid request: ${error.message}`, 400);
  }
};

// Delete template
export const deleteTemplate = async (req: Request, user: AuthenticatedUser, templateId: string) => {
  try {
    const supabase = createSupabaseClient();
    
    // First check if template exists and user owns it
    const { data: existingTemplate, error: fetchError } = await supabase
      .from("templates")
      .select("*")
      .eq("id", templateId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingTemplate) {
      return createErrorResponse("Template not found or access denied", 404);
    }

    const { error } = await supabase
      .from("templates")
      .delete()
      .eq("id", templateId)
      .eq("user_id", user.id);

    if (error) {
      return createErrorResponse(`Failed to delete template: ${error.message}`, 500);
    }

    return createSuccessResponse(null, "Template deleted successfully");
  } catch (error) {
    return createErrorResponse(`Invalid request: ${error.message}`, 400);
  }
};

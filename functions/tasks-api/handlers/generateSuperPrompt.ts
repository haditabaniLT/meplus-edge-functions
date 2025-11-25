import { createSupabaseClient } from "../utils/supabaseClient.ts";
import { createErrorResponse, createSuccessResponse, AuthenticatedUser } from "../utils/authHelpers.ts";
import { generateOpenAiResponse } from "./ai-models/openAi.ts";
import { generateClaudeResponse } from "./ai-models/claude.ts";
import { generateGeminiResponse } from "./ai-models/gemini.ts";
import { generateGrokResponse } from "./ai-models/grok.ts";

export interface GenerateSuperPrompt {
  provided_ai_model?: 'openai' | 'claude' | 'gemini' | 'grok';
  category_id?: string;
  category_name?: string;
  task: string;
  tone?: string;
  audience?: string;
  questions?: {
    restorative?: string;
    constraints?: string;
    preferences?: string;
    goal?: string;
  };
  metadata?: Record<string, any>;
}

export const generateSuperPrompt = async (req: Request, user: AuthenticatedUser) => {
  try {
    const body: GenerateSuperPrompt = await req.json();

    // Default to openai if not specified
    const aiModel = body.provided_ai_model || 'openai';

    if (!body.task) {
      return createErrorResponse("task is required", 400);
    }

    // Build enhanced prompt with all context, spreading questions throughout
    let enhancedPrompt = body.task;

    // Add category context if provided
    if (body.category_name || body.category_id) {
      enhancedPrompt += `\n\nCategory: ${body.category_name || body.category_id}`;
    }

    // Add tone if provided
    if (body.tone) {
      enhancedPrompt += `\n\nTone: ${body.tone}`;
    }

    // Add audience if provided
    if (body.audience) {
      enhancedPrompt += `\n\nAudience: ${body.audience}`;
    }

    // Spread all questions dynamically into the prompt
    if (body.questions && Object.keys(body.questions).length > 0) {
      enhancedPrompt += `\n\nThese are the questions and answers that should be involved in the prompt generation:\n`;
      for (const [key, value] of Object.entries(body.questions)) {
        if (value) {
          // Capitalize first letter of key and replace underscores with spaces
          const formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
          enhancedPrompt += `${formattedKey}: ${value}\n`;
        }
      }
    }

    // Get user data for context
    const supabase = createSupabaseClient();
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("plan, usage, full_name, email, industry, seniority, goals")
      .eq("id", user.id)
      .single();

    if (userError) {
      return createErrorResponse(`Failed to fetch user data: ${userError.message}`, 500);
    }

    // Build metadata object with all context
    const metadata = {
      ...body.metadata,
      category_id: body.category_id,
      category_name: body.category_name,
      task: body.task,
      tone: body.tone,
      audience: body.audience,
      questions: body.questions,
    };

    // Generate optimized prompt using the specified AI model
    let aiResponse;
    
    switch (aiModel) {
      case 'openai':
        aiResponse = await generateOpenAiResponse(enhancedPrompt, userData, metadata);
        break;
      case 'claude':
        aiResponse = await generateClaudeResponse(enhancedPrompt, userData, metadata);
        break;
      case 'gemini':
        aiResponse = await generateGeminiResponse(enhancedPrompt, userData, metadata);
        break;
      case 'grok':
        aiResponse = await generateGrokResponse(enhancedPrompt, userData, metadata);
        break;
      default:
        return createErrorResponse(`Unsupported AI model: ${aiModel}`, 400);
    }

    if (!aiResponse.success || !aiResponse.data) {
      return createErrorResponse(
        `AI generation failed: ${aiResponse.error || "Unknown error"}`,
        500
      );
    }

    const generatedPrompt = aiResponse.data;

    // Stringify questions for database storage
    const questionsString = body.questions ? JSON.stringify(body.questions) : null;

    // Save the generated prompt to super_prompts table
    const { data: savedPrompt, error: saveError } = await supabase
      .from("super_prompts")
      .insert({
        user_id: user.id,
        generated_prompt: generatedPrompt,
        ai_model: aiModel,
        questions: questionsString,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) {
      return createErrorResponse(`Failed to save prompt: ${saveError.message}`, 500);
    }

    return createSuccessResponse({
      id: savedPrompt.id,
      generated_prompt: savedPrompt.generated_prompt,
      ai_model: savedPrompt.ai_model,
      questions: savedPrompt.questions ? JSON.parse(savedPrompt.questions) : null,
      created_at: savedPrompt.created_at,
      updated_at: savedPrompt.updated_at,
      context: {
        category_id: body.category_id,
        category_name: body.category_name,
        task: body.task,
        tone: body.tone,
        audience: body.audience,
      },
    }, "Super prompt generated and saved successfully");

  } catch (error: any) {
    return createErrorResponse(`Invalid request: ${error.message}`, 400);
  }
};

// Get super prompts
export const getSuperPrompts = async (req: Request, user: AuthenticatedUser) => {
  try {
    const url = new URL(req.url);
    const aiModel = url.searchParams.get("ai_model");
    const search = url.searchParams.get("search");
    const fromDate = url.searchParams.get("fromDate");
    const toDate = url.searchParams.get("toDate");
    const sortBy = url.searchParams.get("sortBy") || "created_at";
    const sortOrder = url.searchParams.get("sortOrder") || "desc";
    const limit = url.searchParams.get("limit");
    const offset = url.searchParams.get("offset");

    const supabase = createSupabaseClient();
    
    // Build base query - only user's own super prompts
    let query = supabase
      .from("super_prompts")
      .select("*", { count: 'exact' })
      .eq("user_id", user.id);

    // Apply filters
    if (aiModel) {
      query = query.eq("ai_model", aiModel);
    }

    // Apply date range filters
    if (fromDate) {
      query = query.gte("created_at", fromDate);
    }

    if (toDate) {
      query = query.lte("created_at", toDate);
    }

    // Apply search filter (in generated_prompt)
    if (search) {
      query = query.ilike("generated_prompt", `%${search}%`);
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
      const limitNum = limit ? parseInt(limit) : 10;
      if (offsetNum >= 0) {
        query = query.range(offsetNum, offsetNum + limitNum - 1);
      }
    }

    const { data, error, count } = await query;

    if (error) {
      return createErrorResponse(`Failed to fetch super prompts: ${error.message}`, 500);
    }

    // Parse questions JSON for each prompt
    const parsedData = (data || []).map((prompt: any) => ({
      ...prompt,
      questions: prompt.questions ? JSON.parse(prompt.questions) : null,
    }));

    // Calculate pagination values
    const limitNum = limit ? parseInt(limit) : 10;
    const offsetNum = offset ? parseInt(offset) : 0;

    // Return paginated result with meta
    return createSuccessResponse({
      data: parsedData,
      count: count || 0,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < (count || 0)
      }
    }, "Super prompts fetched successfully");
  } catch (error: any) {
    return createErrorResponse(`Invalid request: ${error.message}`, 400);
  }
};

// Update super prompt
export interface UpdateSuperPromptRequest {
  generated_prompt?: string;
  ai_model?: 'openai' | 'claude' | 'gemini' | 'grok';
  questions?: {
    [key: string]: string;
  };
}

export const updateSuperPrompt = async (req: Request, user: AuthenticatedUser, promptId: string) => {
  try {
    const body: UpdateSuperPromptRequest = await req.json();
    
    if (Object.keys(body).length === 0) {
      return createErrorResponse("No fields to update", 400);
    }

    const supabase = createSupabaseClient();
    
    // First check if prompt exists and belongs to user
    const { data: existingPrompt, error: fetchError } = await supabase
      .from("super_prompts")
      .select("id")
      .eq("id", promptId)
      .eq("user_id", user.id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return createErrorResponse("Super prompt not found", 404);
      }
      return createErrorResponse(`Failed to fetch super prompt: ${fetchError.message}`, 500);
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.generated_prompt !== undefined) {
      updateData.generated_prompt = body.generated_prompt;
    }

    if (body.ai_model !== undefined) {
      updateData.ai_model = body.ai_model;
    }

    if (body.questions !== undefined) {
      updateData.questions = JSON.stringify(body.questions);
    }

    // Update the super prompt
    const { data, error } = await supabase
      .from("super_prompts")
      .update(updateData)
      .eq("id", promptId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return createErrorResponse(`Failed to update super prompt: ${error.message}`, 500);
    }

    // Parse questions JSON for response
    const parsedData = {
      ...data,
      questions: data.questions ? JSON.parse(data.questions) : null,
    };

    return createSuccessResponse(parsedData, "Super prompt updated successfully");
  } catch (error: any) {
    return createErrorResponse(`Invalid request: ${error.message}`, 400);
  }
};

// Delete super prompt
export const deleteSuperPrompt = async (req: Request, user: AuthenticatedUser, promptId: string) => {
  try {
    const supabase = createSupabaseClient();
    
    // First check if prompt exists and belongs to user
    const { data: existingPrompt, error: fetchError } = await supabase
      .from("super_prompts")
      .select("id")
      .eq("id", promptId)
      .eq("user_id", user.id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return createErrorResponse("Super prompt not found", 404);
      }
      return createErrorResponse(`Failed to fetch super prompt: ${fetchError.message}`, 500);
    }

    // Delete the super prompt
    const { error } = await supabase
      .from("super_prompts")
      .delete()
      .eq("id", promptId)
      .eq("user_id", user.id);

    if (error) {
      return createErrorResponse(`Failed to delete super prompt: ${error.message}`, 500);
    }

    return createSuccessResponse({ id: promptId }, "Super prompt deleted successfully");
  } catch (error: any) {
    return createErrorResponse(`Invalid request: ${error.message}`, 400);
  }
};


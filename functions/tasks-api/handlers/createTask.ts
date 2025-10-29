import { createSupabaseClient } from "../utils/supabaseClient.ts";
import { createErrorResponse, createSuccessResponse, AuthenticatedUser } from "../utils/authHelpers.ts";
import { generateOpenAiResponse } from "./ai-models/openAi.ts";
import { generateClaudeResponse } from "./ai-models/claude.ts";
import { generateGeminiResponse } from "./ai-models/gemini.ts";

export interface CreateTaskRequest {
  category: string;
  title: string;
  content: string;
  priority?: "low" | "medium" | "high";
  due_date?: string;
  tags?: string[];
  prompt?: string;
  ai_model?: 'openai' | 'claude' | 'gemini' | 'grok';
  metadata?: Record<string, any>;
}

export const createTask = async (req: Request, user: AuthenticatedUser) => {
  try {
    const body: CreateTaskRequest = await req.json();
    const metadata = body.metadata;

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

    // Validate required fields
    if (!body.category || !body.title) {
      return createErrorResponse("Missing required fields: category, title");
    }

    // If ai_model is provided, prompt is required
    if (body.ai_model && !body.prompt) {
      return createErrorResponse("Prompt is required when ai_model is specified");
    }

    // Generate AI content if ai_model is provided
    let generatedContent = "";
    if (body.ai_model && body.prompt) {
      let aiResponse;

      switch (body.ai_model) {
        case 'openai':
          aiResponse = await generateOpenAiResponse(body.prompt, userData, metadata);
          break;
        case 'claude':
          aiResponse = await generateClaudeResponse(body.prompt, userData, metadata);
          break;
        case 'gemini':
          aiResponse = await generateGeminiResponse(body.prompt, userData, metadata);
          break;
        case 'grok':
          // Grok is not implemented yet
          return createErrorResponse("Grok AI model is not yet supported");
        default:
          return createErrorResponse(`Unsupported AI model: ${body.ai_model}`);
      }

      if (!aiResponse.success || !aiResponse.data) {
        return createErrorResponse(
          `AI generation failed: ${aiResponse.error || "Unknown error"}`,
          500
        );
      }

      // Use AI-generated content, or merge with provided content if exists
      generatedContent = aiResponse.data;

    } else if (!body.content) {
      // If no AI generation and no content provided
      return createErrorResponse("Content is required when ai_model is not specified");
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
        content: generatedContent,
        priority: body.priority || "medium",
        due_date: body.due_date || null,
        tags: body.tags || [],
        prompt: body.prompt || null,
        ai_model: body.ai_model || null,
        status: "active",
        type: body.ai_model ? "generated" : "custom",
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

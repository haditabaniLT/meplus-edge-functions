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


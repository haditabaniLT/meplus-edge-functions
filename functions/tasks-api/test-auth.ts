import { validateUser } from "./utils/authHelpers.ts";
import { createErrorResponse, createSuccessResponse } from "./utils/authHelpers.ts";

Deno.serve(async (req) => {
  try {
    const { pathname } = new URL(req.url);
    
    // Test endpoint for debugging JWT
    if (pathname === "/test-auth" && req.method === "GET") {
      try {
        const user = await validateUser(req);
        return createSuccessResponse({
          user,
          message: "JWT validation successful",
          headers: {
            authorization: req.headers.get("Authorization"),
            contentType: req.headers.get("Content-Type"),
          }
        });
      } catch (error) {
        return createErrorResponse(`JWT validation failed: ${error.message}`, 401);
      }
    }

    // Health check endpoint
    if (pathname === "/health" && req.method === "GET") {
      return createSuccessResponse({
        status: "healthy",
        environment: {
          hasSupabaseUrl: !!Deno.env.get("SUPABASE_URL"),
          hasSupabaseAnonKey: !!Deno.env.get("SUPABASE_ANON_KEY"),
          hasSupabaseServiceKey: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
        }
      });
    }

    return createErrorResponse("Test endpoint not found", 404);
  } catch (error) {
    return createErrorResponse(`Unexpected error: ${error.message}`, 500);
  }
});

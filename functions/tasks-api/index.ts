// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createTask } from "./handlers/createTask.ts";
import { deleteTask } from "./handlers/deleteTask.ts";
import { getTaskById } from "./handlers/getTaskById.ts";
import { getTasks } from "./handlers/getTasks.ts";
import { getUsage } from "./handlers/getUsage.ts";
import {
  exportTask,
  exportTasks,
  shareTask,
  unshareTask
} from "./handlers/taskSharing.ts";
import {
  createTemplate,
  deleteTemplate,
  getTemplateById,
  getTemplates,
  updateTemplate
} from "./handlers/templates.ts";
import { updateTask } from "./handlers/updateTask.ts";
import { createErrorResponse, validateUser } from "./utils/authHelpers.ts";
import { checkRateLimit, getClientIP } from "./utils/rateLimiter.ts";
import { generateGrokResponse } from "./handlers/ai-models/grok.ts";

// Helper function to add CORS headers to responses
const addCorsHeaders = (response: Response): Response => {
  const newHeaders = new Headers(response.headers);
  newHeaders.set("Access-Control-Allow-Origin", "*");
  newHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  // newHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
};

Deno.serve(async (req) => {
  try {
    // Rate limiting check
    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(clientIP);

    if (!rateLimitResult.allowed) {
      return addCorsHeaders(new Response(
        JSON.stringify({
          success: false,
          error: "Rate limit exceeded. Please try again later.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": "100",
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.resetTime.toString(),
          },
        }
      ));
    }

    const { pathname } = new URL(req.url);
    const method = req.method;

    // Handle CORS preflight requests
    if (method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // Authenticate user for all routes except OPTIONS
    let user;
    try {
      user = await validateUser(req);
    } catch (error) {
      return addCorsHeaders(createErrorResponse(error.message, 401));
    }

    // Debug endpoint for JWT testing
    if (pathname === "/debug-auth" && method === "GET") {
      return addCorsHeaders(new Response(
        JSON.stringify({
          success: true,
          user,
          headers: {
            authorization: req.headers.get("Authorization"),
            contentType: req.headers.get("Content-Type"),
          },
          environment: {
            hasSupabaseUrl: !!(globalThis as any).Deno?.env?.get("SUPABASE_URL"),
            hasSupabaseAnonKey: !!(globalThis as any).Deno?.env?.get("SUPABASE_ANON_KEY"),
            hasSupabaseServiceKey: !!(globalThis as any).Deno?.env?.get("SUPABASE_SERVICE_ROLE_KEY"),
          }
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      ));
    }

    // Route handling
    if (pathname === "/tasks-api/tasks" && method === "POST") {
      return addCorsHeaders(await createTask(req, user));
    }

    if (pathname === "/tasks-api/tasks" && method === "GET") {
      return addCorsHeaders(await getTasks(req, user));
    }

    if (pathname === "/tasks-api/usage" && method === "GET") {
      return addCorsHeaders(await getUsage(req, user));
    }

    // Templates routes
    if (pathname === "/tasks-api/templates" && method === "POST") {
      return addCorsHeaders(await createTemplate(req, user));
    }

    if (pathname === "/tasks-api/templates" && method === "GET") {
      return addCorsHeaders(await getTemplates(req, user));
    }

    if (pathname === "/tasks-api/grok" && method === "POST") {
      return addCorsHeaders(await generateGrokResponse(req));
    }

    // Handle dynamic routes for individual tasks
    const taskIdMatch = pathname.match(/^\/tasks-api\/tasks\/([^\/]+)$/);
    if (taskIdMatch) {
      const taskId = taskIdMatch[1];

      if (method === "GET") {
        return addCorsHeaders(await getTaskById(req, user, taskId));
      }

      if (method === "PUT") {
        return addCorsHeaders(await updateTask(req, user, taskId));
      }

      if (method === "DELETE") {
        return addCorsHeaders(await deleteTask(req, user, taskId));
      }
    }

    // Handle task sharing routes
    const taskShareMatch = pathname.match(/^\/tasks-api\/tasks\/([^\/]+)\/share$/);
    if (taskShareMatch) {
      const taskId = taskShareMatch[1];
      if (method === "POST") {
        return addCorsHeaders(await shareTask(req, user, taskId));
      }
      if (method === "DELETE") {
        return addCorsHeaders(await unshareTask(req, user, taskId));
      }
    }

    // Handle task export routes
    const taskExportMatch = pathname.match(/^\/tasks-api\/tasks\/([^\/]+)\/export$/);
    if (taskExportMatch) {
      const taskId = taskExportMatch[1];
      if (method === "GET") {
        return addCorsHeaders(await exportTask(req, user, taskId));
      }
    }

    // Handle bulk export route
    if (pathname === "/tasks-api/tasks/export" && method === "GET") {
      return addCorsHeaders(await exportTasks(req, user));
    }

    // Handle dynamic routes for individual templates
    const templateIdMatch = pathname.match(/^\/tasks-api\/templates\/([^\/]+)$/);
    if (templateIdMatch) {
      const templateId = templateIdMatch[1];

      if (method === "GET") {
        return addCorsHeaders(await getTemplateById(req, user, templateId));
      }

      if (method === "PUT") {
        return addCorsHeaders(await updateTemplate(req, user, templateId));
      }

      if (method === "DELETE") {
        return addCorsHeaders(await deleteTemplate(req, user, templateId));
      }
    }

    // Route not found
    return addCorsHeaders(createErrorResponse(`Route ${pathname} not found`, 404));

  } catch (error) {
    console.error("Unexpected error:", error);
    return addCorsHeaders(createErrorResponse("Internal server error", 500));
  }
});

/* 
API Endpoints:

TASKS:
POST /tasks
- Create a new task
- Body: { category, title, content, priority?, due_date?, tags? }

GET /tasks
- Fetch all tasks for authenticated user
- Query params: category?, status?, search?, fromDate?, toDate?, priority?, isFavorite?, sortBy?, sortOrder?, limit?, offset?

GET /tasks/:id
- Fetch a single task by ID

PUT /tasks/:id
- Update an existing task
- Body: { title?, content?, category?, status?, priority?, due_date?, tags?, is_favorite? }

DELETE /tasks/:id
- Delete a task

POST /tasks/:id/share
- Share a task (generates public link)

DELETE /tasks/:id/share
- Unshare a task

GET /tasks/:id/export
- Export a single task as JSON

GET /tasks/export
- Export multiple tasks as JSON
- Query params: taskIds?, category?, status?

TEMPLATES:
POST /templates
- Create a new template
- Body: { title, category, content, tags?, is_public?, is_favorite? }

GET /templates
- Fetch templates (user's own + public)
- Query params: category?, isPublic?, isFavorite?, search?, sortBy?, sortOrder?, limit?, offset?

GET /templates/:id
- Fetch a single template by ID

PUT /templates/:id
- Update an existing template
- Body: { title?, category?, content?, tags?, is_public?, is_favorite? }

DELETE /templates/:id
- Delete a template

USAGE:
GET /usage
- Get user's current usage and plan limits
- Returns: { plan, usage: { tasks_generated, export_count }, limits: { tasks_generated, export_limit } }

All endpoints require Authorization header with Bearer token.
Rate limit: 100 requests per minute per IP.
Plan limits enforced: BASE (10 tasks, 2 exports), PRO (unlimited).
*/

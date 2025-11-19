// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

export interface AuthenticatedUser {
  id: string;
  email?: string;
}

export const validateUser = async (req: Request): Promise<AuthenticatedUser> => {
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid authorization header");
  }

  const token = authHeader.substring(7);
  
  // Get environment variables
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing required environment variables: SUPABASE_URL or SUPABASE_ANON_KEY");
  }

  // Create Supabase client with anon key
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // For local development, we need to handle JWT verification differently
    // Decode the JWT token to check the issuer
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      throw new Error("Invalid JWT token format");
    }

    const payload = JSON.parse(atob(tokenParts[1]));
    
    // Check if the token issuer matches our Supabase URL
    const expectedIssuer = `${supabaseUrl}/auth/v1`;
    if (payload.iss !== expectedIssuer) {
      console.warn(`Token issuer mismatch. Expected: ${expectedIssuer}, Got: ${payload.iss}`);
      
      // For local development, we might need to use the production URL for JWT verification
      // while still using local database
      if (supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost')) {
        console.log("Local development detected, attempting verification with production issuer");
        
        // Try with the production Supabase URL for JWT verification
        const productionUrl = payload.iss.replace('/auth/v1', '');
        const productionSupabase = createClient(productionUrl, supabaseAnonKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });
        
        const { data: { user }, error } = await productionSupabase.auth.getUser(token);
        
        if (error) {
          console.error("Production JWT verification error:", error);
          throw new Error(`JWT verification failed: ${error.message}`);
        }
        
        if (!user) {
          throw new Error("User not found in token");
        }

        return {
          id: user.id,
          email: user.email,
        };
      }
    }

    // Normal verification for matching issuer
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error("JWT verification error:", error);
      throw new Error(`JWT verification failed: ${error.message}`);
    }
    
    if (!user) {
      throw new Error("User not found in token");
    }

    return {
      id: user.id,
      email: user.email,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    throw new Error(`Authentication failed: ${error.message}`);
  }
};

export const createErrorResponse = (message: string, status: number = 400) => {
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: message 
    }),
    { 
      status,
      headers: { "Content-Type": "application/json" }
    }
  );
};

export const createSuccessResponse = (data: any, message: string = "Success") => {
  return new Response(
    JSON.stringify({ 
      success: true, 
      data, 
      message 
    }),
    { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
};

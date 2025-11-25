# Super Prompt API - Frontend Integration Guide

## 📋 Overview

The Super Prompt API allows you to generate and retrieve optimized prompts using AI models (OpenAI, Claude, Gemini, or Grok). The API takes a base prompt along with context (category, task, tone, audience, questions) and returns an AI-generated optimized prompt. You can also retrieve previously generated prompts with filtering, sorting, and pagination.

## 🔗 API Endpoints

### Generate Super Prompt
```
POST /functions/v1/tasks-api/super-prompt
```

### Get Super Prompts
```
GET /functions/v1/tasks-api/super-prompt
```

### Update Super Prompt
```
PUT /functions/v1/tasks-api/super-prompt/:id
```

### Delete Super Prompt
```
DELETE /functions/v1/tasks-api/super-prompt/:id
```

**Base URL:** Your Supabase project URL  
**Authentication:** Required (Bearer token)

## 📤 Request Format

### Headers
```javascript
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_SUPABASE_JWT_TOKEN"
}
```

### Request Body

```typescript
interface SuperPromptRequest {
  provided_prompt: string;                    // Required: Base prompt to optimize
  provided_ai_model?: 'openai' | 'claude' | 'gemini' | 'grok';  // Optional, defaults to 'openai'
  category_id?: string;                       // Optional: Category identifier
  category_name?: string;                     // Optional: Category display name
  task?: string;                              // Optional: Task description
  tone?: string;                              // Optional: Desired tone (e.g., "motivational", "professional")
  audience?: string;                          // Optional: Target audience
  questions?: {                               // Optional: Dynamic questions object
    [key: string]: string;                    // Any key-value pairs
    // Common examples:
    // restorative?: string;
    // constraints?: string;
    // preferences?: string;
    // goal?: string;
  };
  metadata?: Record<string, any>;            // Optional: Additional metadata
}
```

### Example Request

```json
{
  "provided_prompt": "Create a strategic planning task",
  "provided_ai_model": "openai",
  "category_id": "play-time",
  "category_name": "Play Time",
  "task": "Create a initiative program to motivate players",
  "tone": "motivational",
  "audience": "The App Project",
  "questions": {
    "restorative": "How to make it restorative?",
    "constraints": "time",
    "preferences": "group",
    "goal": "Create dominance"
  }
}
```

## 📥 Response Format

### POST - Success Response (200)

```typescript
interface SuperPromptResponse {
  success: true;
  data: {
    id: string;                              // UUID of saved prompt
    generated_prompt: string;                // AI-generated optimized prompt
    ai_model: string;                        // AI model used
    questions: {                             // Parsed questions object
      [key: string]: string;
    } | null;
    created_at: string;                      // ISO timestamp
    updated_at: string;                      // ISO timestamp
    context: {                               // Original context
      category_id?: string;
      category_name?: string;
      task?: string;
      tone?: string;
      audience?: string;
    };
  };
  message: "Super prompt generated and saved successfully";
}
```

### GET - Success Response (200)

```typescript
interface GetSuperPromptsResponse {
  success: true;
  data: {
    data: Array<{
      id: string;                            // UUID of prompt
      user_id: string;                       // User ID who owns the prompt
      generated_prompt: string;               // AI-generated optimized prompt
      ai_model: string;                      // AI model used (openai, claude, gemini, grok)
      questions: {                           // Parsed questions object
        [key: string]: string;
      } | null;
      created_at: string;                    // ISO timestamp
      updated_at: string;                    // ISO timestamp
    }>;
    count: number;                           // Total number of prompts matching filters
    pagination: {
      limit: number;                         // Number of results per page
      offset: number;                        // Number of results skipped
      hasMore: boolean;                      // Whether more results are available
    };
  };
  message: "Super prompts fetched successfully";
}
```

### PUT - Success Response (200)

```typescript
interface UpdateSuperPromptResponse {
  success: true;
  data: {
    id: string;                              // UUID of prompt
    user_id: string;                         // User ID who owns the prompt
    generated_prompt: string;                // Updated AI-generated optimized prompt
    ai_model: string;                        // AI model used (openai, claude, gemini, grok)
    questions: {                             // Parsed questions object
      [key: string]: string;
    } | null;
    created_at: string;                      // ISO timestamp
    updated_at: string;                      // ISO timestamp
  };
  message: "Super prompt updated successfully";
}
```

### DELETE - Success Response (200)

```typescript
interface DeleteSuperPromptResponse {
  success: true;
  data: {
    id: string;                              // UUID of deleted prompt
  };
  message: "Super prompt deleted successfully";
}
```

### Error Response (400/404/500)

```typescript
interface ErrorResponse {
  success: false;
  error: string;                             // Error message
}
```

---

## 📖 Update Super Prompt API

### Request Body

All fields are optional - only include fields you want to update:

```typescript
interface UpdateSuperPromptRequest {
  generated_prompt?: string;                // Optional: Updated prompt text
  ai_model?: 'openai' | 'claude' | 'gemini' | 'grok';  // Optional: Change AI model
  questions?: {                             // Optional: Updated questions object
    [key: string]: string;
  };
}
```

### Example PUT Request

```json
{
  "generated_prompt": "Updated optimized prompt text here...",
  "ai_model": "claude",
  "questions": {
    "restorative": "Updated restorative question",
    "goal": "Updated goal"
  }
}
```

### Example PUT Response

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "generated_prompt": "Updated optimized prompt text here...",
    "ai_model": "claude",
    "questions": {
      "restorative": "Updated restorative question",
      "goal": "Updated goal"
    },
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T11:45:00Z"
  },
  "message": "Super prompt updated successfully"
}
```

## 📖 Delete Super Prompt API

### Example DELETE Request

```javascript
DELETE /functions/v1/tasks-api/super-prompt/550e8400-e29b-41d4-a716-446655440000
```

### Example DELETE Response

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000"
  },
  "message": "Super prompt deleted successfully"
}
```

## 📖 GET Super Prompts API

### Query Parameters

All parameters are optional:

```typescript
interface GetSuperPromptsParams {
  ai_model?: 'openai' | 'claude' | 'gemini' | 'grok';  // Filter by AI model
  search?: string;                           // Search in generated_prompt text
  fromDate?: string;                         // Filter prompts created after this date (ISO format)
  toDate?: string;                           // Filter prompts created before this date (ISO format)
  sortBy?: string;                           // Field to sort by (default: 'created_at')
  sortOrder?: 'asc' | 'desc';               // Sort direction (default: 'desc')
  limit?: number;                            // Number of results per page (default: 10)
  offset?: number;                           // Number of results to skip (default: 0)
}
```

### Example GET Request

```javascript
// Get all prompts
GET /functions/v1/tasks-api/super-prompt

// Get prompts filtered by AI model
GET /functions/v1/tasks-api/super-prompt?ai_model=openai

// Get prompts with search, date range, and pagination
GET /functions/v1/tasks-api/super-prompt?search=strategic&fromDate=2025-01-01&toDate=2025-01-31&sortBy=created_at&sortOrder=desc&limit=20&offset=0
```

### Example GET Response

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "generated_prompt": "Create a comprehensive strategic planning initiative...",
        "ai_model": "openai",
        "questions": {
          "restorative": "How to make it restorative?",
          "constraints": "time",
          "preferences": "group",
          "goal": "Create dominance"
        },
        "created_at": "2025-01-15T10:30:00Z",
        "updated_at": "2025-01-15T10:30:00Z"
      }
    ],
    "count": 42,
    "pagination": {
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  },
  "message": "Super prompts fetched successfully"
}
```

## 💻 Frontend Integration Examples

### React/TypeScript Example

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface SuperPromptRequest {
  provided_prompt: string;
  provided_ai_model?: 'openai' | 'claude' | 'gemini' | 'grok';
  category_id?: string;
  category_name?: string;
  task?: string;
  tone?: string;
  audience?: string;
  questions?: Record<string, string>;
  metadata?: Record<string, any>;
}

interface UpdateSuperPromptRequest {
  generated_prompt?: string;
  ai_model?: 'openai' | 'claude' | 'gemini' | 'grok';
  questions?: Record<string, string>;
}

interface GetSuperPromptsParams {
  ai_model?: 'openai' | 'claude' | 'gemini' | 'grok';
  search?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Generate Super Prompt
async function generateSuperPrompt(request: SuperPromptRequest) {
  try {
    // Get the current session token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/tasks-api/super-prompt`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(request),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to generate super prompt');
    }

    return result.data;
  } catch (error) {
    console.error('Error generating super prompt:', error);
    throw error;
  }
}

// Update Super Prompt
async function updateSuperPrompt(promptId: string, updates: UpdateSuperPromptRequest) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/tasks-api/super-prompt/${promptId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(updates),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update super prompt');
    }

    return result.data;
  } catch (error) {
    console.error('Error updating super prompt:', error);
    throw error;
  }
}

// Delete Super Prompt
async function deleteSuperPrompt(promptId: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/tasks-api/super-prompt/${promptId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete super prompt');
    }

    return result.data;
  } catch (error) {
    console.error('Error deleting super prompt:', error);
    throw error;
  }
}

// Get Super Prompts
async function getSuperPrompts(params?: GetSuperPromptsParams) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }

    // Build query string
    const queryParams = new URLSearchParams();
    if (params?.ai_model) queryParams.append('ai_model', params.ai_model);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params?.toDate) queryParams.append('toDate', params.toDate);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const queryString = queryParams.toString();
    const url = `${SUPABASE_URL}/functions/v1/tasks-api/super-prompt${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch super prompts');
    }

    return result.data;
  } catch (error) {
    console.error('Error fetching super prompts:', error);
    throw error;
  }
}

// Usage Examples
const handleGeneratePrompt = async () => {
  try {
    const result = await generateSuperPrompt({
      provided_prompt: "Create a strategic planning task",
      provided_ai_model: "openai",
      category_id: "play-time",
      category_name: "Play Time",
      task: "Create a initiative program to motivate players",
      tone: "motivational",
      audience: "The App Project",
      questions: {
        restorative: "How to make it restorative?",
        constraints: "time",
        preferences: "group",
        goal: "Create dominance"
      }
    });

    console.log('Generated Prompt:', result.generated_prompt);
    console.log('Prompt ID:', result.id);
  } catch (error) {
    console.error('Failed to generate prompt:', error);
  }
};

const handleGetPrompts = async () => {
  try {
    const result = await getSuperPrompts({
      ai_model: 'openai',
      search: 'strategic',
      sortBy: 'created_at',
      sortOrder: 'desc',
      limit: 20,
      offset: 0
    });

    console.log('Prompts:', result.data);
    console.log('Total count:', result.count);
    console.log('Has more:', result.pagination.hasMore);
  } catch (error) {
    console.error('Failed to fetch prompts:', error);
  }
};

const handleUpdatePrompt = async (promptId: string) => {
  try {
    const result = await updateSuperPrompt(promptId, {
      generated_prompt: "Updated prompt text",
      ai_model: "claude"
    });

    console.log('Updated Prompt:', result.generated_prompt);
  } catch (error) {
    console.error('Failed to update prompt:', error);
  }
};

const handleDeletePrompt = async (promptId: string) => {
  try {
    const result = await deleteSuperPrompt(promptId);
    console.log('Deleted Prompt ID:', result.id);
  } catch (error) {
    console.error('Failed to delete prompt:', error);
  }
};
```

### React Hook Example

```typescript
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface UseSuperPromptReturn {
  generatePrompt: (request: SuperPromptRequest) => Promise<void>;
  getPrompts: (params?: GetSuperPromptsParams) => Promise<void>;
  updatePrompt: (promptId: string, updates: UpdateSuperPromptRequest) => Promise<void>;
  deletePrompt: (promptId: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  generatedPrompt: string | null;
  promptId: string | null;
  prompts: Array<any>;
  promptsCount: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  } | null;
}

function useSuperPrompt(): UseSuperPromptReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [promptId, setPromptId] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<Array<any>>([]);
  const [promptsCount, setPromptsCount] = useState(0);
  const [pagination, setPagination] = useState<{
    limit: number;
    offset: number;
    hasMore: boolean;
  } | null>(null);

  const generatePrompt = async (request: SuperPromptRequest) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/tasks-api/super-prompt`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(request),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate super prompt');
      }

      setGeneratedPrompt(result.data.generated_prompt);
      setPromptId(result.data.id);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      console.error('Error generating super prompt:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPrompts = async (params?: GetSuperPromptsParams) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      const queryParams = new URLSearchParams();
      if (params?.ai_model) queryParams.append('ai_model', params.ai_model);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
      if (params?.toDate) queryParams.append('toDate', params.toDate);
      if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const queryString = queryParams.toString();
      const url = `${SUPABASE_URL}/functions/v1/tasks-api/super-prompt${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch super prompts');
      }

      setPrompts(result.data.data);
      setPromptsCount(result.data.count);
      setPagination(result.data.pagination);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      console.error('Error fetching super prompts:', err);
    } finally {
      setLoading(false);
    }
  };

  const updatePrompt = async (promptId: string, updates: UpdateSuperPromptRequest) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/tasks-api/super-prompt/${promptId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(updates),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update super prompt');
      }

      // Refresh prompts list if needed
      await getPrompts();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      console.error('Error updating super prompt:', err);
    } finally {
      setLoading(false);
    }
  };

  const deletePrompt = async (promptId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/tasks-api/super-prompt/${promptId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete super prompt');
      }

      // Refresh prompts list
      await getPrompts();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      console.error('Error deleting super prompt:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    generatePrompt,
    getPrompts,
    updatePrompt,
    deletePrompt,
    loading,
    error,
    generatedPrompt,
    promptId,
    prompts,
    promptsCount,
    pagination,
  };
}

// Usage in Component
function PromptGenerator() {
  const { 
    generatePrompt, 
    getPrompts, 
    updatePrompt,
    deletePrompt,
    loading, 
    error, 
    generatedPrompt,
    prompts,
    pagination
  } = useSuperPrompt();

  const handleSubmit = async (formData: SuperPromptRequest) => {
    await generatePrompt(formData);
  };

  const handleLoadPrompts = async () => {
    await getPrompts({
      ai_model: 'openai',
      sortBy: 'created_at',
      sortOrder: 'desc',
      limit: 10
    });
  };

  const handleUpdate = async (promptId: string) => {
    await updatePrompt(promptId, {
      generated_prompt: "Updated prompt text"
    });
  };

  const handleDelete = async (promptId: string) => {
    if (confirm('Are you sure you want to delete this prompt?')) {
      await deletePrompt(promptId);
    }
  };

  return (
    <div>
      {/* Your form here */}
      <button onClick={handleLoadPrompts}>Load Prompts</button>
      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}
      {generatedPrompt && (
        <div className="result">
          <h3>Generated Prompt:</h3>
          <p>{generatedPrompt}</p>
        </div>
      )}
      {prompts.length > 0 && (
        <div>
          <h3>Your Prompts ({prompts.length})</h3>
          {prompts.map((prompt) => (
            <div key={prompt.id}>
              <p>{prompt.generated_prompt}</p>
              <small>Created: {new Date(prompt.created_at).toLocaleDateString()}</small>
              <button onClick={() => handleUpdate(prompt.id)}>Update</button>
              <button onClick={() => handleDelete(prompt.id)}>Delete</button>
            </div>
          ))}
          {pagination?.hasMore && <button>Load More</button>}
        </div>
      )}
    </div>
  );
}
```

### Vue.js Example

```vue
<template>
  <div>
    <form @submit.prevent="handleSubmit">
      <textarea v-model="formData.provided_prompt" placeholder="Enter your prompt" />
      <select v-model="formData.provided_ai_model">
        <option value="openai">OpenAI</option>
        <option value="claude">Claude</option>
        <option value="gemini">Gemini</option>
        <option value="grok">Grok</option>
      </select>
      <input v-model="formData.task" placeholder="Task" />
      <input v-model="formData.tone" placeholder="Tone" />
      <button type="submit" :disabled="loading">
        {{ loading ? 'Generating...' : 'Generate Prompt' }}
      </button>
    </form>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="generatedPrompt" class="result">
      <h3>Generated Prompt:</h3>
      <p>{{ generatedPrompt }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loading = ref(false);
const error = ref<string | null>(null);
const generatedPrompt = ref<string | null>(null);

const formData = ref({
  provided_prompt: '',
  provided_ai_model: 'openai',
  task: '',
  tone: '',
  questions: {}
});

const handleSubmit = async () => {
  loading.value = true;
  error.value = null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/tasks-api/super-prompt`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData.value),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to generate super prompt');
    }

    generatedPrompt.value = result.data.generated_prompt;
  } catch (err: any) {
    error.value = err.message || 'An error occurred';
  } finally {
    loading.value = false;
  }
};
</script>
```

### JavaScript/Plain Fetch Example

```javascript
// Generate Super Prompt
async function generateSuperPrompt(requestData) {
  // Get Supabase session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('User not authenticated');
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/tasks-api/super-prompt`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestData),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to generate super prompt');
    }

    return result.data;
  } catch (error) {
    console.error('Error generating super prompt:', error);
    throw error;
  }
}

// Update Super Prompt
async function updateSuperPrompt(promptId, updates) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('User not authenticated');
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/tasks-api/super-prompt/${promptId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(updates),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update super prompt');
    }

    return result.data;
  } catch (error) {
    console.error('Error updating super prompt:', error);
    throw error;
  }
}

// Delete Super Prompt
async function deleteSuperPrompt(promptId) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('User not authenticated');
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/tasks-api/super-prompt/${promptId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete super prompt');
    }

    return result.data;
  } catch (error) {
    console.error('Error deleting super prompt:', error);
    throw error;
  }
}

// Get Super Prompts
async function getSuperPrompts(params = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('User not authenticated');
  }

  try {
    // Build query string
    const queryParams = new URLSearchParams();
    if (params.ai_model) queryParams.append('ai_model', params.ai_model);
    if (params.search) queryParams.append('search', params.search);
    if (params.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params.toDate) queryParams.append('toDate', params.toDate);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());

    const queryString = queryParams.toString();
    const url = `${SUPABASE_URL}/functions/v1/tasks-api/super-prompt${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch super prompts');
    }

    return result.data;
  } catch (error) {
    console.error('Error fetching super prompts:', error);
    throw error;
  }
}

// Usage - Generate Prompt
const requestData = {
  provided_prompt: "Create a strategic planning task",
  provided_ai_model: "openai",
  category_name: "Play Time",
  task: "Create a initiative program to motivate players",
  tone: "motivational",
  audience: "The App Project",
  questions: {
    restorative: "How to make it restorative?",
    constraints: "time",
    preferences: "group",
    goal: "Create dominance"
  }
};

generateSuperPrompt(requestData)
  .then(result => {
    console.log('Generated Prompt:', result.generated_prompt);
  })
  .catch(error => {
    console.error('Error:', error.message);
  });

// Usage - Get Prompts
getSuperPrompts({
  ai_model: 'openai',
  search: 'strategic',
  sortBy: 'created_at',
  sortOrder: 'desc',
  limit: 20,
  offset: 0
})
  .then(result => {
    console.log('Prompts:', result.data);
    console.log('Total count:', result.count);
    console.log('Has more:', result.pagination.hasMore);
  })
  .catch(error => {
    console.error('Error:', error.message);
  });

// Usage - Update Prompt
updateSuperPrompt('550e8400-e29b-41d4-a716-446655440000', {
  generated_prompt: 'Updated prompt text',
  ai_model: 'claude'
})
  .then(result => {
    console.log('Updated Prompt:', result.generated_prompt);
  })
  .catch(error => {
    console.error('Error:', error.message);
  });

// Usage - Delete Prompt
deleteSuperPrompt('550e8400-e29b-41d4-a716-446655440000')
  .then(result => {
    console.log('Deleted Prompt ID:', result.id);
  })
  .catch(error => {
    console.error('Error:', error.message);
  });
```

## 🎯 Key Features

1. **Dynamic Questions**: The `questions` object accepts any key-value pairs, making it flexible for different use cases.

2. **Multiple AI Models**: Choose from OpenAI (default), Claude, Gemini, or Grok.

3. **Context-Aware**: The API automatically incorporates category, task, tone, audience, and questions into the prompt generation.

4. **Persistent Storage**: Generated prompts are saved to the database and can be retrieved later using the returned `id`.

5. **Advanced Filtering**: Retrieve prompts with filtering by AI model, date range, and text search.

6. **Pagination**: Efficiently paginate through large lists of prompts with configurable limits and offsets.

7. **Flexible Sorting**: Sort prompts by any field (created_at, updated_at, ai_model) in ascending or descending order.

8. **Update & Delete**: Update existing prompts or delete them when no longer needed.

## ⚠️ Error Handling

### Common Errors

- **401 Unauthorized**: User not authenticated
  ```javascript
  // Solution: Ensure user is logged in and token is valid
  const { data: { session } } = await supabase.auth.getSession();
  ```

- **400 Bad Request**: Missing required field `task` (for POST) or no fields to update (for PUT)
  ```javascript
  // Solution: Always include task in POST request, include at least one field in PUT request
  ```

- **404 Not Found**: Super prompt not found (for PUT/DELETE)
  ```javascript
  // Solution: Ensure the prompt ID exists and belongs to the authenticated user
  ```

- **500 Internal Server Error**: AI generation failed
  ```javascript
  // Solution: Check AI model API keys are configured
  // Try a different AI model or check error message for details
  ```

## 🔒 Security Notes

1. Always use the user's session token for authentication
2. Never expose service role keys in frontend code
3. Validate user input before sending to API
4. Handle errors gracefully and show user-friendly messages

## 📝 Best Practices

1. **Loading States**: Show loading indicators while generating prompts
2. **Error Handling**: Display clear error messages to users
3. **Caching**: Consider caching generated prompts using the returned `id`
4. **Validation**: Validate required fields before making the API call
5. **User Feedback**: Provide feedback on which AI model is being used

## 🔄 Example: Complete Form Integration

```typescript
// Complete example with form handling
interface FormData {
  prompt: string;
  aiModel: 'openai' | 'claude' | 'gemini' | 'grok';
  category: string;
  task: string;
  tone: string;
  audience: string;
  questions: Record<string, string>;
}

function PromptForm() {
  const [formData, setFormData] = useState<FormData>({
    prompt: '',
    aiModel: 'openai',
    category: '',
    task: '',
    tone: '',
    audience: '',
    questions: {}
  });

  const { generatePrompt, loading, error, generatedPrompt } = useSuperPrompt();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await generatePrompt({
      provided_prompt: formData.prompt,
      provided_ai_model: formData.aiModel,
      category_name: formData.category,
      task: formData.task,
      tone: formData.tone,
      audience: formData.audience,
      questions: formData.questions
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={formData.prompt}
        onChange={(e) => setFormData({...formData, prompt: e.target.value})}
        placeholder="Enter your prompt"
        required
      />
      {/* Other form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Generating...' : 'Generate Super Prompt'}
      </button>
      {error && <div className="error">{error}</div>}
      {generatedPrompt && <div className="result">{generatedPrompt}</div>}
    </form>
  );
}
```

## 🚀 Quick Start Checklist

- [ ] Install Supabase client library
- [ ] Set up authentication in your app
- [ ] Create API call functions (generate, get, update, delete)
- [ ] Add form/UI for prompt input
- [ ] Implement loading states
- [ ] Add error handling
- [ ] Test with different AI models
- [ ] Display generated prompts
- [ ] Add prompt list view with filtering and pagination
- [ ] Add update and delete functionality for prompts

---

**Need Help?** Check the Supabase Edge Functions documentation or review the API response structure for additional details.


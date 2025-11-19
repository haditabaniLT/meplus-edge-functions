# Super Prompt API - Frontend Integration Guide

## 📋 Overview

The Super Prompt API allows you to generate optimized prompts using AI models (OpenAI, Claude, Gemini, or Grok). The API takes a base prompt along with context (category, task, tone, audience, questions) and returns an AI-generated optimized prompt.

## 🔗 API Endpoint

```
POST /functions/v1/tasks-api/super-prompt
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

### Success Response (200)

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

### Error Response (400/500)

```typescript
interface ErrorResponse {
  success: false;
  error: string;                             // Error message
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

// Usage Example
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
```

### React Hook Example

```typescript
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface UseSuperPromptReturn {
  generatePrompt: (request: SuperPromptRequest) => Promise<void>;
  loading: boolean;
  error: string | null;
  generatedPrompt: string | null;
  promptId: string | null;
}

function useSuperPrompt(): UseSuperPromptReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [promptId, setPromptId] = useState<string | null>(null);

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

  return {
    generatePrompt,
    loading,
    error,
    generatedPrompt,
    promptId,
  };
}

// Usage in Component
function PromptGenerator() {
  const { generatePrompt, loading, error, generatedPrompt } = useSuperPrompt();

  const handleSubmit = async (formData: SuperPromptRequest) => {
    await generatePrompt(formData);
  };

  return (
    <div>
      {/* Your form here */}
      {loading && <p>Generating prompt...</p>}
      {error && <p className="error">{error}</p>}
      {generatedPrompt && (
        <div className="result">
          <h3>Generated Prompt:</h3>
          <p>{generatedPrompt}</p>
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

// Usage
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
```

## 🎯 Key Features

1. **Dynamic Questions**: The `questions` object accepts any key-value pairs, making it flexible for different use cases.

2. **Multiple AI Models**: Choose from OpenAI (default), Claude, Gemini, or Grok.

3. **Context-Aware**: The API automatically incorporates category, task, tone, audience, and questions into the prompt generation.

4. **Persistent Storage**: Generated prompts are saved to the database and can be retrieved later using the returned `id`.

## ⚠️ Error Handling

### Common Errors

- **401 Unauthorized**: User not authenticated
  ```javascript
  // Solution: Ensure user is logged in and token is valid
  const { data: { session } } = await supabase.auth.getSession();
  ```

- **400 Bad Request**: Missing required field `provided_prompt`
  ```javascript
  // Solution: Always include provided_prompt in request
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
- [ ] Create API call function
- [ ] Add form/UI for prompt input
- [ ] Implement loading states
- [ ] Add error handling
- [ ] Test with different AI models
- [ ] Display generated prompts

---

**Need Help?** Check the Supabase Edge Functions documentation or review the API response structure for additional details.


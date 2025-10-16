# MePlus.ai Supabase Edge Functions API

Enhanced Supabase Edge Function project for MePlus.ai with comprehensive task management, template system, sharing, and export capabilities.

## 🚀 Features

### ✅ Enhanced Task Management
- **Advanced Filtering**: Filter by category, status, priority, favorites, date ranges
- **Search**: Full-text search across task titles and content
- **Sorting**: Sort by any field (created_at, updated_at, title, etc.) in ascending/descending order
- **Pagination**: Efficient pagination with metadata
- **Plan Limits**: BASE vs PRO user plan enforcement

### ✅ Template System
- **CRUD Operations**: Create, read, update, delete reusable task templates
- **Public Templates**: Share templates publicly or keep them private
- **Favorites**: Mark templates as favorites for quick access
- **Search & Filter**: Find templates by category, public status, favorites

### ✅ Task Sharing & Export
- **Share Links**: Generate public sharing links for tasks
- **Export**: Export individual tasks or bulk export as JSON
- **Usage Tracking**: Track export counts against plan limits
- **Download**: Direct file download with proper headers

### ✅ Plan Enforcement
- **BASE Plan**: 10 tasks, 2 exports per month
- **PRO Plan**: Unlimited tasks and exports
- **Real-time Checks**: Validate limits before operations
- **Usage Tracking**: Automatic usage counter updates

## 📋 API Endpoints

### Tasks

#### Create Task
```http
POST /tasks-api/tasks
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "category": "Decision Mastery",
  "title": "Task Title",
  "content": "Task content...",
  "priority": "high",
  "due_date": "2025-01-20T10:00:00Z",
  "tags": ["urgent", "important"]
}
```

#### Get Tasks (Enhanced)
```http
GET /tasks-api/tasks?category=Decision Mastery&status=active&search=important&fromDate=2025-01-01&toDate=2025-01-31&priority=high&isFavorite=true&sortBy=created_at&sortOrder=desc&limit=20&offset=0
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `category`: Filter by task category
- `status`: Filter by task status (active, archived, deleted)
- `search`: Search in title and content
- `fromDate`: Filter tasks created after this date
- `toDate`: Filter tasks created before this date
- `priority`: Filter by priority (low, medium, high)
- `isFavorite`: Filter by favorite status (true/false)
- `sortBy`: Sort field (created_at, updated_at, title, etc.)
- `sortOrder`: Sort direction (asc, desc)
- `limit`: Number of results per page
- `offset`: Number of results to skip

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [...],
    "count": 42,
    "pagination": {
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  },
  "message": "Tasks fetched successfully"
}
```

#### Share Task
```http
POST /tasks-api/tasks/{taskId}/share
Authorization: Bearer <jwt_token>
```

#### Unshare Task
```http
DELETE /tasks-api/tasks/{taskId}/share
Authorization: Bearer <jwt_token>
```

#### Export Task
```http
GET /tasks-api/tasks/{taskId}/export
Authorization: Bearer <jwt_token>
```

#### Bulk Export Tasks
```http
GET /tasks-api/tasks/export?category=Decision Mastery&status=active
GET /tasks-api/tasks/export?taskIds=uuid1,uuid2,uuid3
Authorization: Bearer <jwt_token>
```

### Templates

#### Create Template
```http
POST /tasks-api/templates
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "title": "Template Title",
  "category": "Decision Mastery",
  "content": "Template content...",
  "tags": ["template", "reusable"],
  "is_public": false,
  "is_favorite": true
}
```

#### Get Templates
```http
GET /tasks-api/templates?category=Decision Mastery&isPublic=true&isFavorite=true&search=template&sortBy=created_at&sortOrder=desc&limit=10&offset=0
Authorization: Bearer <jwt_token>
```

#### Update Template
```http
PUT /tasks-api/templates/{templateId}
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "title": "Updated Title",
  "is_public": true,
  "is_favorite": false
}
```

#### Delete Template
```http
DELETE /tasks-api/templates/{templateId}
Authorization: Bearer <jwt_token>
```

### Usage

#### Get Usage Information
```http
GET /tasks-api/usage
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "plan": "BASE",
    "usage": {
      "tasks_generated": 5,
      "export_count": 1
    },
    "limits": {
      "tasks_generated": 10,
      "export_limit": 2
    }
  },
  "message": "Usage fetched successfully"
}
```

## 🗄️ Database Schema

### Templates Table
```sql
CREATE TABLE "public"."templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "category" "text" NOT NULL,
    "content" "text" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "is_public" boolean DEFAULT false,
    "is_favorite" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);
```

### Enhanced Tasks Table
- Added `priority` field (low, medium, high)
- Added `due_date` field
- Enhanced indexing for better performance

### Plans Table
```sql
INSERT INTO "public"."plans" ("name", "price", "description", "features", "task_limit", "export_limit")
VALUES 
    ('BASE', 0.00, 'Free plan with basic features', ARRAY['Basic task generation', 'Limited exports'], 10, 2),
    ('PRO', 29.99, 'Pro plan with unlimited features', ARRAY['Unlimited task generation', 'Unlimited exports', 'Priority support'], NULL, NULL);
```

## 🔒 Security Features

- **Row Level Security (RLS)**: All tables protected with RLS policies
- **JWT Authentication**: All endpoints require valid Supabase JWT
- **Rate Limiting**: 100 requests per minute per IP
- **Plan Enforcement**: Real-time limit checking
- **CORS Support**: Proper CORS headers for web clients

## 🚀 Deployment

1. **Run Migration**: Apply the database migration
   ```bash
   supabase db push
   ```

2. **Deploy Functions**: Deploy the edge functions
   ```bash
   supabase functions deploy tasks-api
   ```

3. **Set Environment Variables**:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
   - `FRONTEND_URL`: Your frontend URL for sharing links

## 📊 Usage Tracking

The system automatically tracks:
- **Task Generation**: Incremented when tasks are created
- **Export Count**: Incremented when tasks are exported
- **Plan Limits**: Enforced before operations

## 🔄 Error Handling

All endpoints return consistent error responses:
```json
{
  "success": false,
  "error": "Error message",
  "code": 400
}
```

## 📈 Performance

- **Indexed Queries**: All filterable fields are indexed
- **Pagination**: Efficient pagination with count queries
- **Text Search**: Full-text search with GIN indexes
- **Connection Pooling**: Optimized Supabase client usage

## 🧪 Testing

Use the debug endpoint to test authentication:
```http
GET /tasks-api/debug-auth
Authorization: Bearer <jwt_token>
```

This will return user information and environment status for debugging.

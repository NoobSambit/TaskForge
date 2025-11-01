# Smart Task Input Feature

## Overview

The Smart Task Input feature provides AI-powered natural language parsing for task creation. Users can type in natural language, and the AI will automatically extract and suggest task details like title, description, priority, tags, recurrence, and due dates.

## Components

### SmartTaskInput.tsx

The main input component that handles user input with debounced AI parsing.

**Features:**
- Debounced API calls (800ms default) to `/api/ai/parse`
- Real-time AI parsing as user types
- Enter key to accept suggestions and create task
- Automatic abort of pending requests when new input is received
- Loading state indication
- Error handling with graceful fallback

**Props:**
- `value: string` - Input value
- `onChange: (value: string) => void` - Input change handler
- `onSuggestionAccepted: (result: AiParseResult) => void` - Callback when user accepts AI suggestion
- `onEnterCreate?: () => void` - Callback when user presses Enter to create task
- `debounceMs?: number` - Debounce delay in milliseconds (default: 800)
- `disabled?: boolean` - Disable input
- `placeholder?: string` - Input placeholder text
- `enableAI?: boolean` - Enable/disable AI parsing (default: true)

### SmartSuggestionsPanel.tsx

Displays AI parsing results and allows user to accept or reject suggestions.

**Features:**
- Shows loading state while AI is processing
- Displays error messages with fallback to manual entry
- Renders AIResultPreview when results are available
- Automatically hidden when no results

**Props:**
- `result?: AiParseResult | null` - AI parsing result
- `error?: string | null` - Error message
- `loading?: boolean` - Loading state
- `onAccept: (result: AiParseResult) => void` - Accept callback
- `onReject: () => void` - Reject callback

### AIResultPreview.tsx

Displays the parsed AI result with accept/reject/edit actions.

**Features:**
- Shows all extracted fields (title, description, priority, tags, recurrence, due date)
- Accept button to apply all suggestions
- Reject button to dismiss suggestions
- Optional edit button for individual field editing
- Formatted display of dates and priority levels
- Color-coded badges for different field types

**Props:**
- `result: AiParseResult` - The AI parsing result to display
- `onAccept: () => void` - Accept callback
- `onReject: () => void` - Reject callback
- `onEdit?: () => void` - Optional edit callback
- `loading?: boolean` - Loading state

## Integration with TaskForm

The TaskForm has been enhanced to support the Smart Task Input feature:

**New Features:**
- Smart input field at the top of the form (only in create mode)
- AI-filled fields are badged with purple "AI" badges
- Badges automatically disappear when user manually edits a field
- Enter key in smart input accepts suggestion and creates task
- Graceful fallback to manual entry when AI is unavailable or offline
- Only enabled when online (uses `isOnline` from `useNetworkStatus`)

**Props:**
- `enableSmartInput?: boolean` - Enable/disable smart input (default: true)

## Usage Example

```typescript
import TaskForm from "@/components/tasks/TaskForm";

// In your page component
export default function NewTaskPage() {
  return (
    <TaskForm 
      mode="create" 
      enableSmartInput={true} 
    />
  );
}
```

## User Flow

1. User types natural language in the Smart Task Input field
   - Example: "Buy groceries tomorrow at 2pm, high priority"

2. After 800ms of no typing, AI automatically parses the input

3. AI suggestions appear in the Smart Suggestions Panel showing:
   - Title: "Buy groceries"
   - Due Date: Tomorrow at 2pm
   - Priority: 5 (High)

4. User can:
   - Click "Accept" to apply all suggestions
   - Click "✕" to reject suggestions
   - Press Enter to accept and immediately create task
   - Manually edit fields (which clears AI badges)

5. Form fields are pre-filled with AI suggestions and marked with "AI" badges

6. User can still manually edit any field or add additional details

7. Click "Create task" to save

## Error Handling

- **Network errors**: Shows error message with fallback to manual entry
- **Parse errors**: Displays error and allows manual entry
- **Offline mode**: AI parsing is automatically disabled
- **Rate limiting**: Shows appropriate error message
- **API configuration errors**: Graceful fallback with error message

## AI Badge Behavior

- Appears next to field labels when AI fills a field
- Purple color to match AI theme
- Automatically removed when user manually edits the field
- Helps users understand which fields were AI-suggested vs. manually entered

## API Integration

The feature uses the existing `/api/ai/parse` endpoint which:
- Requires authentication
- Accepts natural language input
- Returns structured task data
- Supports both Gemini and Ollama AI providers
- Has built-in rate limiting and error handling

## Styling

The components follow the existing design system:
- Purple color scheme for AI-related elements
- Consistent with other UI components
- Responsive design for mobile and desktop
- Dark mode support
- Accessible with proper ARIA labels and titles

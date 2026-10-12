Chatbot

[Attachments](https://elements.ai-sdk.dev/components/attachments) [Chain of Thought](https://elements.ai-sdk.dev/components/chain-of-thought) [Checkpoint](https://elements.ai-sdk.dev/components/checkpoint) [Confirmation](https://elements.ai-sdk.dev/components/confirmation) [Context](https://elements.ai-sdk.dev/components/context) [Conversation](https://elements.ai-sdk.dev/components/conversation) [Inline Citation](https://elements.ai-sdk.dev/components/inline-citation) [Message](https://elements.ai-sdk.dev/components/message) [Model Selector](https://elements.ai-sdk.dev/components/model-selector) [Plan](https://elements.ai-sdk.dev/components/plan) [Prompt Input](https://elements.ai-sdk.dev/components/prompt-input) [Queue](https://elements.ai-sdk.dev/components/queue) [Reasoning](https://elements.ai-sdk.dev/components/reasoning) [Shimmer](https://elements.ai-sdk.dev/components/shimmer) [Sources](https://elements.ai-sdk.dev/components/sources) [Suggestion](https://elements.ai-sdk.dev/components/suggestion) [Task](https://elements.ai-sdk.dev/components/task) [Tool](https://elements.ai-sdk.dev/components/tool)

Code

[Agent](https://elements.ai-sdk.dev/components/agent) [Artifact](https://elements.ai-sdk.dev/components/artifact) [Code Block](https://elements.ai-sdk.dev/components/code-block) [Commit](https://elements.ai-sdk.dev/components/commit) [Environment Variables](https://elements.ai-sdk.dev/components/environment-variables) [File Tree](https://elements.ai-sdk.dev/components/file-tree) [JSX Preview](https://elements.ai-sdk.dev/components/jsx-preview) [Package Info](https://elements.ai-sdk.dev/components/package-info) [Sandbox](https://elements.ai-sdk.dev/components/sandbox) [Schema Display](https://elements.ai-sdk.dev/components/schema-display) [Snippet](https://elements.ai-sdk.dev/components/snippet) [Stack Trace](https://elements.ai-sdk.dev/components/stack-trace) [Terminal](https://elements.ai-sdk.dev/components/terminal) [Test Results](https://elements.ai-sdk.dev/components/test-results) [Web Preview](https://elements.ai-sdk.dev/components/web-preview)

Voice

[Audio Player](https://elements.ai-sdk.dev/components/audio-player) [Mic Selector](https://elements.ai-sdk.dev/components/mic-selector) [Persona](https://elements.ai-sdk.dev/components/persona) [Speech Input](https://elements.ai-sdk.dev/components/speech-input) [Transcription](https://elements.ai-sdk.dev/components/transcription) [Voice Selector](https://elements.ai-sdk.dev/components/voice-selector)

Workflow

[Canvas](https://elements.ai-sdk.dev/components/canvas) [Connection](https://elements.ai-sdk.dev/components/connection) [Controls](https://elements.ai-sdk.dev/components/controls) [Edge](https://elements.ai-sdk.dev/components/edge) [Node](https://elements.ai-sdk.dev/components/node) [Panel](https://elements.ai-sdk.dev/components/panel) [Toolbar](https://elements.ai-sdk.dev/components/toolbar)

Utilities

[Image](https://elements.ai-sdk.dev/components/image) [Open In Chat](https://elements.ai-sdk.dev/components/open-in-chat)

# Tool

A collapsible component for displaying tool invocation details in AI chatbot interfaces.

The `Tool` component displays a collapsible interface for showing/hiding tool details. It is designed to take the `ToolUIPart` type from the AI SDK and display it in a collapsible interface.

Preview

Code

database\_queryPending

#### Parameters

```
{}
```

database\_queryAwaiting Approval

database\_queryResponded

database\_queryRunning

database\_queryCompleted

database\_queryError

database\_queryDenied

## [Installation](https://elements.ai-sdk.dev/components/tool\#installation)

AI Elements

shadcn CLI

Manual

```
npx ai-elements@latest add tool
```

## [Usage in AI SDK](https://elements.ai-sdk.dev/components/tool\#usage-in-ai-sdk)

Build a simple stateful weather app that renders the last message in a tool using [`useChat`](https://elements.ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat).

Add the following component to your frontend:

app/page.tsx

```
"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type ToolUIPart } from "ai";
import { Button } from "@/components/ui/button";
import { MessageResponse } from "@/components/ai-elements/message";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";

type WeatherToolInput = {
  location: string;
  units: "celsius" | "fahrenheit";
};

type WeatherToolOutput = {
  location: string;
  temperature: string;
  conditions: string;
  humidity: string;
  windSpeed: string;
  lastUpdated: string;
};

type WeatherToolUIPart = ToolUIPart<{
  fetch_weather_data: {
    input: WeatherToolInput;
    output: WeatherToolOutput;
  };
}>;

const Example = () => {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/weather",
    }),
  });

  const handleWeatherClick = () => {
    sendMessage({ text: "Get weather data for San Francisco in fahrenheit" });
  };

  const latestMessage = messages[messages.length - 1];
  const weatherTool = latestMessage?.parts?.find(
    (part) => part.type === "tool-fetch_weather_data"
  ) as WeatherToolUIPart | undefined;

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full rounded-lg border h-[600px]">
      <div className="flex flex-col h-full">
        <div className="space-y-4">
          <Button onClick={handleWeatherClick} disabled={status !== "ready"}>
            Get Weather for San Francisco
          </Button>

          {weatherTool && (
            <Tool defaultOpen={true}>
              <ToolHeader
                type="tool-fetch_weather_data"
                state={weatherTool.state}
              />
              <ToolContent>
                <ToolInput input={weatherTool.input} />
                <ToolOutput
                  output={
                    <MessageResponse>
                      {formatWeatherResult(weatherTool.output)}
                    </MessageResponse>
                  }
                  errorText={weatherTool.errorText}
                />
              </ToolContent>
            </Tool>
          )}
        </div>
      </div>
    </div>
  );
};

function formatWeatherResult(result: WeatherToolOutput): string {
  return `**Weather for ${result.location}**

**Temperature:** ${result.temperature}
**Conditions:** ${result.conditions}
**Humidity:** ${result.humidity}
**Wind Speed:** ${result.windSpeed}

*Last updated: ${result.lastUpdated}*`;
}

export default Example;
```

Add the following route to your backend:

app/api/weather/route.tsx

```
import { streamText, UIMessage, convertToModelMessages } from "ai";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: "openai/gpt-4o",
    messages: await convertToModelMessages(messages),
    tools: {
      fetch_weather_data: {
        description: "Fetch weather information for a specific location",
        parameters: z.object({
          location: z
            .string()
            .describe("The city or location to get weather for"),
          units: z
            .enum(["celsius", "fahrenheit"])
            .default("celsius")
            .describe("Temperature units"),
        }),
        inputSchema: z.object({
          location: z.string(),
          units: z.enum(["celsius", "fahrenheit"]).default("celsius"),
        }),
        execute: async ({ location, units }) => {
          await new Promise((resolve) => setTimeout(resolve, 1500));

          const temp =
            units === "celsius"
              ? Math.floor(Math.random() * 35) + 5
              : Math.floor(Math.random() * 63) + 41;

          return {
            location,
            temperature: `${temp}°${units === "celsius" ? "C" : "F"}`,
            conditions: "Sunny",
            humidity: `12%`,
            windSpeed: `35 ${units === "celsius" ? "km/h" : "mph"}`,
            lastUpdated: new Date().toLocaleString(),
          };
        },
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
```

## [Features](https://elements.ai-sdk.dev/components/tool\#features)

- Collapsible interface for showing/hiding tool details
- Visual status indicators with icons and badges
- Support for multiple tool execution states (pending, running, completed, error)
- Formatted parameter display with JSON syntax highlighting
- Result and error handling with appropriate styling
- Composable structure for flexible layouts
- Accessible keyboard navigation and screen reader support
- Consistent styling that matches your design system
- Auto-opens completed tools by default for better UX

## [Examples](https://elements.ai-sdk.dev/components/tool\#examples)

### [Input Streaming (Pending)](https://elements.ai-sdk.dev/components/tool\#input-streaming-pending)

Shows a tool in its initial state while parameters are being processed.

Preview

Code

web\_searchPending

### [Input Available (Running)](https://elements.ai-sdk.dev/components/tool\#input-available-running)

Shows a tool that's actively executing with its parameters.

Preview

Code

image\_generationRunning

### [Output Available (Completed)](https://elements.ai-sdk.dev/components/tool\#output-available-completed)

Shows a completed tool with successful results. Opens by default to show the results. In this instance, the output is a JSON object, so we can use the `CodeBlock` component to display it.

Preview

Code

database\_queryCompleted

### [Output Error](https://elements.ai-sdk.dev/components/tool\#output-error)

Shows a tool that encountered an error during execution. Opens by default to display the error.

Preview

Code

api\_requestError

## [Props](https://elements.ai-sdk.dev/components/tool\#props)

### [`<Tool />`](https://elements.ai-sdk.dev/components/tool\#tool-)

Prop

Type

`...props?`React.ComponentProps<typeof Collapsible>

### [`<ToolHeader />`](https://elements.ai-sdk.dev/components/tool\#toolheader-)

Prop

Type

`title?`string

`type`ToolUIPart\["type"\] \| DynamicToolUIPart\["type"\]

`state`ToolUIPart\["state"\] \| DynamicToolUIPart\["state"\]

`toolName?`string

`className?`string

`...props?`React.ComponentProps<typeof CollapsibleTrigger>

### [`<ToolContent />`](https://elements.ai-sdk.dev/components/tool\#toolcontent-)

Prop

Type

`...props?`React.ComponentProps<typeof CollapsibleContent>

### [`<ToolInput />`](https://elements.ai-sdk.dev/components/tool\#toolinput-)

Prop

Type

`input?`ToolUIPart\["input"\]

`...props?`React.ComponentProps<"div">

### [`<ToolOutput />`](https://elements.ai-sdk.dev/components/tool\#tooloutput-)

Prop

Type

`output?`React.ReactNode

`errorText?`ToolUIPart\["errorText"\]

`...props?`React.ComponentProps<"div">

## [Type Exports](https://elements.ai-sdk.dev/components/tool\#type-exports)

### [`ToolPart`](https://elements.ai-sdk.dev/components/tool\#toolpart)

Union type representing both static and dynamic tool UI parts.

```
type ToolPart = ToolUIPart | DynamicToolUIPart;
```

## [Utilities](https://elements.ai-sdk.dev/components/tool\#utilities)

### [`getStatusBadge`](https://elements.ai-sdk.dev/components/tool\#getstatusbadge)

Returns a Badge component with icon and label based on tool state.

```
import { getStatusBadge } from "@/components/ai-elements/tool";

// Returns a Badge with appropriate icon and label
const badge = getStatusBadge("output-available");
```

Supported states:

- `input-streaming` \- "Pending"
- `input-available` \- "Running"
- `approval-requested` \- "Awaiting Approval"
- `approval-responded` \- "Responded"
- `output-available` \- "Completed"
- `output-error` \- "Error"
- `output-denied` \- "Denied"

[Task\\
\\
A collapsible task list component for displaying AI workflow progress, with status indicators and optional descriptions.](https://elements.ai-sdk.dev/components/task) [Agent\\
\\
A composable component for displaying AI agent configuration with model, instructions, tools, and output schema.](https://elements.ai-sdk.dev/components/agent)

### On this page

[Installation](https://elements.ai-sdk.dev/components/tool#installation) [Usage in AI SDK](https://elements.ai-sdk.dev/components/tool#usage-in-ai-sdk) [Features](https://elements.ai-sdk.dev/components/tool#features) [Examples](https://elements.ai-sdk.dev/components/tool#examples) [Input Streaming (Pending)](https://elements.ai-sdk.dev/components/tool#input-streaming-pending) [Input Available (Running)](https://elements.ai-sdk.dev/components/tool#input-available-running) [Output Available (Completed)](https://elements.ai-sdk.dev/components/tool#output-available-completed) [Output Error](https://elements.ai-sdk.dev/components/tool#output-error) [Props](https://elements.ai-sdk.dev/components/tool#props) [`<Tool />`](https://elements.ai-sdk.dev/components/tool#tool-) [`<ToolHeader />`](https://elements.ai-sdk.dev/components/tool#toolheader-) [`<ToolContent />`](https://elements.ai-sdk.dev/components/tool#toolcontent-) [`<ToolInput />`](https://elements.ai-sdk.dev/components/tool#toolinput-) [`<ToolOutput />`](https://elements.ai-sdk.dev/components/tool#tooloutput-) [Type Exports](https://elements.ai-sdk.dev/components/tool#type-exports) [`ToolPart`](https://elements.ai-sdk.dev/components/tool#toolpart) [Utilities](https://elements.ai-sdk.dev/components/tool#utilities) [`getStatusBadge`](https://elements.ai-sdk.dev/components/tool#getstatusbadge)

[GitHubEdit this page on GitHub](https://github.com/vercel/ai-elements/edit/main/apps/docs/content/components/(chatbot)/tool.mdx) Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

## Chat

What is AI Elements?What can I build with AI Elements?How do I install AI Elements?How do I use AI Elements?

Tip: You can open and close chat with `⌘I`

0 / 1000
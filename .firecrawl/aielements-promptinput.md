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

# Prompt Input

Allows a user to send a message with file attachments to a large language model. It includes a textarea, file upload capabilities, a submit button, and a dropdown for selecting the model.

The `PromptInput` component allows a user to send a message with file attachments to a large language model. It includes a textarea, file upload capabilities, a submit button, and a dropdown for selecting the model.

Preview

Code

Search![openai logo](https://models.dev/logos/openai.svg)GPT-4o

## [Installation](https://elements.ai-sdk.dev/components/prompt-input\#installation)

AI Elements

shadcn CLI

Manual

```
npx ai-elements@latest add prompt-input
```

## [Usage with AI SDK](https://elements.ai-sdk.dev/components/prompt-input\#usage-with-ai-sdk)

Build a fully functional chat app using `PromptInput`, [`Conversation`](https://elements.ai-sdk.dev/components/conversation) with a model picker:

Add the following component to your frontend:

app/page.tsx

```
"use client";

import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionAddScreenshot,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import { GlobeIcon } from "lucide-react";
import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";

const PromptInputAttachmentsDisplay = () => {
  const attachments = usePromptInputAttachments();

  if (attachments.files.length === 0) {
    return null;
  }

  return (
    <Attachments variant="inline">
      {attachments.files.map((attachment) => (
        <Attachment
          data={attachment}
          key={attachment.id}
          onRemove={() => attachments.remove(attachment.id)}
        >
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
};

const models = [\
  { id: "gpt-4o", name: "GPT-4o" },\
  { id: "claude-opus-4-20250514", name: "Claude 4 Opus" },\
];

const InputDemo = () => {
  const [text, setText] = useState<string>("");
  const [model, setModel] = useState<string>(models[0].id);
  const [useWebSearch, setUseWebSearch] = useState<boolean>(false);

  const { messages, status, sendMessage } = useChat();

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    sendMessage(
      {
        text: message.text || "Sent with attachments",
        files: message.files,
      },
      {
        body: {
          model: model,
          webSearch: useWebSearch,
        },
      }
    );
    setText("");
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full rounded-lg border h-[600px]">
      <div className="flex flex-col h-full">
        <Conversation>
          <ConversationContent>
            {messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case "text":
                        return (
                          <MessageResponse key={`${message.id}-${i}`}>
                            {part.text}
                          </MessageResponse>
                        );
                      default:
                        return null;
                    }
                  })}
                </MessageContent>
              </Message>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput
          onSubmit={handleSubmit}
          className="mt-4"
          globalDrop
          multiple
        >
          <PromptInputHeader>
            <PromptInputAttachmentsDisplay />
          </PromptInputHeader>
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(e) => setText(e.target.value)}
              value={text}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                  <PromptInputActionAddScreenshot />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
              <PromptInputButton
                onClick={() => setUseWebSearch(!useWebSearch)}
                tooltip={{ content: "Search the web", shortcut: "⌘K" }}
                variant={useWebSearch ? "default" : "ghost"}
              >
                <GlobeIcon size={16} />
                <span>Search</span>
              </PromptInputButton>
              <PromptInputSelect
                onValueChange={(value) => {
                  setModel(value);
                }}
                value={model}
              >
                <PromptInputSelectTrigger>
                  <PromptInputSelectValue />
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {models.map((model) => (
                    <PromptInputSelectItem key={model.id} value={model.id}>
                      {model.name}
                    </PromptInputSelectItem>
                  ))}
                </PromptInputSelectContent>
              </PromptInputSelect>
            </PromptInputTools>
            <PromptInputSubmit disabled={!text && !status} status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
};

export default InputDemo;
```

Add the following route to your backend:

app/api/chat/route.ts

```
import { streamText, UIMessage, convertToModelMessages } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const {
    model,
    messages,
    webSearch,
  }: {
    messages: UIMessage[];
    model: string;
    webSearch?: boolean;
  } = await req.json();

  const result = streamText({
    model: webSearch ? "perplexity/sonar" : model,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
```

## [Features](https://elements.ai-sdk.dev/components/prompt-input\#features)

- Auto-resizing textarea that adjusts height based on content
- File attachment support with drag-and-drop
- Built-in screenshot capture action
- Image preview for image attachments
- Configurable file constraints (max files, max size, accepted types)
- Automatic submit button icons based on status
- Support for keyboard shortcuts (Enter to submit, Shift+Enter for new line)
- Customizable min/max height for the textarea
- Flexible toolbar with support for custom actions and tools
- Built-in model selection dropdown
- Built-in native speech recognition button (Web Speech API)
- Optional provider for lifted state management
- Form automatically resets on submit
- Responsive design with mobile-friendly controls
- Clean, modern styling with customizable themes
- Form-based submission handling
- Hidden file input sync for native form posts
- Global document drop support (opt-in)

## [Examples](https://elements.ai-sdk.dev/components/prompt-input\#examples)

### [Cursor style](https://elements.ai-sdk.dev/components/prompt-input\#cursor-style)

Preview

Code

11 Tab

![openai logo](https://models.dev/logos/openai.svg)GPT-4o

### [Button tooltips](https://elements.ai-sdk.dev/components/prompt-input\#button-tooltips)

Buttons can display tooltips with optional keyboard shortcut hints. Hover over the buttons below to see the tooltips.

Preview

Code

## [Props](https://elements.ai-sdk.dev/components/prompt-input\#props)

### [`<PromptInput />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinput-)

Prop

Type

`onSubmit?`(message: PromptInputMessage, event: FormEvent) => void

`accept?`string

`multiple?`boolean

`globalDrop?`boolean

`syncHiddenInput?`boolean

`maxFiles?`number

`maxFileSize?`number

`onError?`(err: { code: "max\_files" \| "max\_file\_size" \| "accept", message: string }) => void

`...props?`React.HTMLAttributes<HTMLFormElement>

### [`<PromptInputTextarea />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputtextarea-)

Prop

Type

`...props?`React.ComponentProps<typeof Textarea>

### [`<PromptInputFooter />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputfooter-)

Prop

Type

`...props?`React.HTMLAttributes<HTMLDivElement>

### [`<PromptInputTools />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputtools-)

Prop

Type

`...props?`React.HTMLAttributes<HTMLDivElement>

### [`<PromptInputButton />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputbutton-)

Prop

Type

`tooltip?`string \| { content: ReactNode; shortcut?: string; side?: "top" \| "right" \| "bottom" \| "left" }

`...props?`React.ComponentProps<typeof Button>

#### [Tooltip Examples](https://elements.ai-sdk.dev/components/prompt-input\#tooltip-examples)

```
// Simple string tooltip
<PromptInputButton tooltip="Search the web">
  <GlobeIcon size={16} />
</PromptInputButton>

// Tooltip with keyboard shortcut hint
<PromptInputButton tooltip={{ content: "Search", shortcut: "⌘K" }}>
  <GlobeIcon size={16} />
</PromptInputButton>

// Tooltip with custom position
<PromptInputButton tooltip={{ content: "Search", side: "bottom" }}>
  <GlobeIcon size={16} />
</PromptInputButton>
```

### [`<PromptInputSubmit />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputsubmit-)

Prop

Type

`status?`ChatStatus

`...props?`React.ComponentProps<typeof Button>

### [`<PromptInputSelect />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputselect-)

Prop

Type

`...props?`React.ComponentProps<typeof Select>

### [`<PromptInputSelectTrigger />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputselecttrigger-)

Prop

Type

`...props?`React.ComponentProps<typeof SelectTrigger>

### [`<PromptInputSelectContent />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputselectcontent-)

Prop

Type

`...props?`React.ComponentProps<typeof SelectContent>

### [`<PromptInputSelectItem />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputselectitem-)

Prop

Type

`...props?`React.ComponentProps<typeof SelectItem>

### [`<PromptInputSelectValue />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputselectvalue-)

Prop

Type

`...props?`React.ComponentProps<typeof SelectValue>

### [`<PromptInputBody />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputbody-)

Prop

Type

`...props?`React.HTMLAttributes<HTMLDivElement>

### [Attachments](https://elements.ai-sdk.dev/components/prompt-input\#attachments)

Attachment components have been moved to a separate module. See the [Attachment](https://elements.ai-sdk.dev/components/attachment) component documentation for details on `<Attachments />`, `<Attachment />`, `<AttachmentPreview />`, `<AttachmentInfo />`, and `<AttachmentRemove />`.

### [`<PromptInputActionMenu />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputactionmenu-)

Prop

Type

`...props?`React.ComponentProps<typeof DropdownMenu>

### [`<PromptInputActionMenuTrigger />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputactionmenutrigger-)

Prop

Type

`...props?`React.ComponentProps<typeof Button>

### [`<PromptInputActionMenuContent />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputactionmenucontent-)

Prop

Type

`...props?`React.ComponentProps<typeof DropdownMenuContent>

### [`<PromptInputActionMenuItem />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputactionmenuitem-)

Prop

Type

`...props?`React.ComponentProps<typeof DropdownMenuItem>

### [`<PromptInputActionAddAttachments />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputactionaddattachments-)

Prop

Type

`label?`string

`...props?`React.ComponentProps<typeof DropdownMenuItem>

### [`<PromptInputActionAddScreenshot />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputactionaddscreenshot-)

Prop

Type

`label?`string

`...props?`React.ComponentProps<typeof DropdownMenuItem>

### [`<PromptInputProvider />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputprovider-)

Prop

Type

`initialInput?`string

`children?`React.ReactNode

Optional global provider that lifts PromptInput state outside of PromptInput. When used, it allows you to access and control the input state from anywhere within the provider tree. If not used, PromptInput stays fully self-managed.

### [`<PromptInputHeader />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputheader-)

Prop

Type

`...props?`Omit<React.ComponentProps<typeof InputGroupAddon>, "align">

### [`<PromptInputHoverCard />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputhovercard-)

Prop

Type

`openDelay?`number

`closeDelay?`number

`...props?`React.ComponentProps<typeof HoverCard>

### [`<PromptInputHoverCardTrigger />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputhovercardtrigger-)

Prop

Type

`...props?`React.ComponentProps<typeof HoverCardTrigger>

### [`<PromptInputHoverCardContent />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputhovercardcontent-)

Prop

Type

`align?`"start" \| "center" \| "end"

`...props?`React.ComponentProps<typeof HoverCardContent>

### [`<PromptInputTabsList />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputtabslist-)

Prop

Type

`...props?`React.HTMLAttributes<HTMLDivElement>

### [`<PromptInputTab />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputtab-)

Prop

Type

`...props?`React.HTMLAttributes<HTMLDivElement>

### [`<PromptInputTabLabel />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputtablabel-)

Prop

Type

`...props?`React.HTMLAttributes<HTMLHeadingElement>

### [`<PromptInputTabBody />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputtabbody-)

Prop

Type

`...props?`React.HTMLAttributes<HTMLDivElement>

### [`<PromptInputTabItem />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputtabitem-)

Prop

Type

`...props?`React.HTMLAttributes<HTMLDivElement>

### [`<PromptInputCommand />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputcommand-)

Prop

Type

`...props?`React.ComponentProps<typeof Command>

### [`<PromptInputCommandInput />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputcommandinput-)

Prop

Type

`...props?`React.ComponentProps<typeof CommandInput>

### [`<PromptInputCommandList />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputcommandlist-)

Prop

Type

`...props?`React.ComponentProps<typeof CommandList>

### [`<PromptInputCommandEmpty />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputcommandempty-)

Prop

Type

`...props?`React.ComponentProps<typeof CommandEmpty>

### [`<PromptInputCommandGroup />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputcommandgroup-)

Prop

Type

`...props?`React.ComponentProps<typeof CommandGroup>

### [`<PromptInputCommandItem />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputcommanditem-)

Prop

Type

`...props?`React.ComponentProps<typeof CommandItem>

### [`<PromptInputCommandSeparator />`](https://elements.ai-sdk.dev/components/prompt-input\#promptinputcommandseparator-)

Prop

Type

`...props?`React.ComponentProps<typeof CommandSeparator>

## [Hooks](https://elements.ai-sdk.dev/components/prompt-input\#hooks)

### [`usePromptInputAttachments`](https://elements.ai-sdk.dev/components/prompt-input\#usepromptinputattachments)

Access and manage file attachments within a PromptInput context.

```
const attachments = usePromptInputAttachments();

// Available methods:
attachments.files; // Array of current attachments
attachments.add(files); // Add new files
attachments.remove(id); // Remove an attachment by ID
attachments.clear(); // Clear all attachments
attachments.openFileDialog(); // Open file selection dialog
```

### [`usePromptInputController`](https://elements.ai-sdk.dev/components/prompt-input\#usepromptinputcontroller)

Access the full PromptInput controller from a PromptInputProvider. Only available when using the provider.

```
const controller = usePromptInputController();

// Available methods:
controller.textInput.value; // Current text input value
controller.textInput.setInput(value); // Set text input value
controller.textInput.clear(); // Clear text input
controller.attachments; // Same as usePromptInputAttachments
```

### [`useProviderAttachments`](https://elements.ai-sdk.dev/components/prompt-input\#useproviderattachments)

Access attachments context from a PromptInputProvider. Only available when using the provider.

```
const attachments = useProviderAttachments();

// Same interface as usePromptInputAttachments
```

### [`usePromptInputReferencedSources`](https://elements.ai-sdk.dev/components/prompt-input\#usepromptinputreferencedsources)

Access referenced sources context within a PromptInput.

```
const sources = usePromptInputReferencedSources();

// Available methods:
sources.sources; // Array of current referenced sources
sources.add(sources); // Add new source(s)
sources.remove(id); // Remove a source by ID
sources.clear(); // Clear all sources
```

[Plan\\
\\
A collapsible plan component for displaying AI-generated execution plans with streaming support and shimmer animations.](https://elements.ai-sdk.dev/components/plan) [Queue\\
\\
A comprehensive queue component system for displaying message lists, todos, and collapsible task sections in AI applications.](https://elements.ai-sdk.dev/components/queue)

### On this page

[Installation](https://elements.ai-sdk.dev/components/prompt-input#installation) [Usage with AI SDK](https://elements.ai-sdk.dev/components/prompt-input#usage-with-ai-sdk) [Features](https://elements.ai-sdk.dev/components/prompt-input#features) [Examples](https://elements.ai-sdk.dev/components/prompt-input#examples) [Cursor style](https://elements.ai-sdk.dev/components/prompt-input#cursor-style) [Button tooltips](https://elements.ai-sdk.dev/components/prompt-input#button-tooltips) [Props](https://elements.ai-sdk.dev/components/prompt-input#props) [`<PromptInput />`](https://elements.ai-sdk.dev/components/prompt-input#promptinput-) [`<PromptInputTextarea />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputtextarea-) [`<PromptInputFooter />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputfooter-) [`<PromptInputTools />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputtools-) [`<PromptInputButton />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputbutton-) [Tooltip Examples](https://elements.ai-sdk.dev/components/prompt-input#tooltip-examples) [`<PromptInputSubmit />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputsubmit-) [`<PromptInputSelect />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputselect-) [`<PromptInputSelectTrigger />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputselecttrigger-) [`<PromptInputSelectContent />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputselectcontent-) [`<PromptInputSelectItem />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputselectitem-) [`<PromptInputSelectValue />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputselectvalue-) [`<PromptInputBody />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputbody-) [Attachments](https://elements.ai-sdk.dev/components/prompt-input#attachments) [`<PromptInputActionMenu />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputactionmenu-) [`<PromptInputActionMenuTrigger />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputactionmenutrigger-) [`<PromptInputActionMenuContent />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputactionmenucontent-) [`<PromptInputActionMenuItem />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputactionmenuitem-) [`<PromptInputActionAddAttachments />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputactionaddattachments-) [`<PromptInputActionAddScreenshot />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputactionaddscreenshot-) [`<PromptInputProvider />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputprovider-) [`<PromptInputHeader />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputheader-) [`<PromptInputHoverCard />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputhovercard-) [`<PromptInputHoverCardTrigger />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputhovercardtrigger-) [`<PromptInputHoverCardContent />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputhovercardcontent-) [`<PromptInputTabsList />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputtabslist-) [`<PromptInputTab />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputtab-) [`<PromptInputTabLabel />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputtablabel-) [`<PromptInputTabBody />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputtabbody-) [`<PromptInputTabItem />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputtabitem-) [`<PromptInputCommand />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputcommand-) [`<PromptInputCommandInput />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputcommandinput-) [`<PromptInputCommandList />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputcommandlist-) [`<PromptInputCommandEmpty />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputcommandempty-) [`<PromptInputCommandGroup />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputcommandgroup-) [`<PromptInputCommandItem />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputcommanditem-) [`<PromptInputCommandSeparator />`](https://elements.ai-sdk.dev/components/prompt-input#promptinputcommandseparator-) [Hooks](https://elements.ai-sdk.dev/components/prompt-input#hooks) [`usePromptInputAttachments`](https://elements.ai-sdk.dev/components/prompt-input#usepromptinputattachments) [`usePromptInputController`](https://elements.ai-sdk.dev/components/prompt-input#usepromptinputcontroller) [`useProviderAttachments`](https://elements.ai-sdk.dev/components/prompt-input#useproviderattachments) [`usePromptInputReferencedSources`](https://elements.ai-sdk.dev/components/prompt-input#usepromptinputreferencedsources)

[GitHubEdit this page on GitHub](https://github.com/vercel/ai-elements/edit/main/apps/docs/content/components/(chatbot)/prompt-input.mdx) Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

## Chat

What is AI Elements?What can I build with AI Elements?How do I install AI Elements?How do I use AI Elements?

Tip: You can open and close chat with `⌘I`

0 / 1000
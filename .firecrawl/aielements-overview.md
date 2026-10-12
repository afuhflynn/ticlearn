Overview

[Introduction](https://elements.ai-sdk.dev/docs) [Benefits](https://elements.ai-sdk.dev/docs/benefits) [Community](https://elements.ai-sdk.dev/docs/community) [The Vercel AI Frontend Stack](https://elements.ai-sdk.dev/docs/vercel-ai-frontend)

Usage

[Setup](https://elements.ai-sdk.dev/docs/setup) [Usage](https://elements.ai-sdk.dev/docs/usage) [Skill](https://elements.ai-sdk.dev/docs/skill) [Troubleshooting](https://elements.ai-sdk.dev/docs/troubleshooting)

Contributing

[How to Contribute](https://elements.ai-sdk.dev/docs/how-to-contribute) [New Components](https://elements.ai-sdk.dev/docs/new-components) [Philosophy](https://elements.ai-sdk.dev/docs/philosophy)

Chatbot

[Attachments](https://elements.ai-sdk.dev/components/attachments) [Chain of Thought](https://elements.ai-sdk.dev/components/chain-of-thought) [Checkpoint](https://elements.ai-sdk.dev/components/checkpoint) [Confirmation](https://elements.ai-sdk.dev/components/confirmation) [Context](https://elements.ai-sdk.dev/components/context) [Conversation](https://elements.ai-sdk.dev/components/conversation) [Inline Citation](https://elements.ai-sdk.dev/components/inline-citation) [Message](https://elements.ai-sdk.dev/components/message) [Model Selector](https://elements.ai-sdk.dev/components/model-selector) [Plan](https://elements.ai-sdk.dev/components/plan) [Prompt Input](https://elements.ai-sdk.dev/components/prompt-input) [Queue](https://elements.ai-sdk.dev/components/queue) [Reasoning](https://elements.ai-sdk.dev/components/reasoning) [Shimmer](https://elements.ai-sdk.dev/components/shimmer) [Sources](https://elements.ai-sdk.dev/components/sources) [Suggestion](https://elements.ai-sdk.dev/components/suggestion) [Task](https://elements.ai-sdk.dev/components/task) [Tool](https://elements.ai-sdk.dev/components/tool)

Code

[Agent](https://elements.ai-sdk.dev/components/agent) [Artifact](https://elements.ai-sdk.dev/components/artifact) [Code Block](https://elements.ai-sdk.dev/components/code-block) [Commit](https://elements.ai-sdk.dev/components/commit) [Environment Variables](https://elements.ai-sdk.dev/components/environment-variables) [File Tree](https://elements.ai-sdk.dev/components/file-tree) [JSX Preview](https://elements.ai-sdk.dev/components/jsx-preview) [Package Info](https://elements.ai-sdk.dev/components/package-info) [Sandbox](https://elements.ai-sdk.dev/components/sandbox) [Schema Display](https://elements.ai-sdk.dev/components/schema-display) [Snippet](https://elements.ai-sdk.dev/components/snippet) [Stack Trace](https://elements.ai-sdk.dev/components/stack-trace) [Terminal](https://elements.ai-sdk.dev/components/terminal) [Test Results](https://elements.ai-sdk.dev/components/test-results) [Web Preview](https://elements.ai-sdk.dev/components/web-preview)

Voice

[Audio Player](https://elements.ai-sdk.dev/components/audio-player) [Mic Selector](https://elements.ai-sdk.dev/components/mic-selector) [Persona](https://elements.ai-sdk.dev/components/persona) [Speech Input](https://elements.ai-sdk.dev/components/speech-input) [Transcription](https://elements.ai-sdk.dev/components/transcription) [Voice Selector](https://elements.ai-sdk.dev/components/voice-selector)

Workflow

[Canvas](https://elements.ai-sdk.dev/components/canvas) [Connection](https://elements.ai-sdk.dev/components/connection) [Controls](https://elements.ai-sdk.dev/components/controls) [Edge](https://elements.ai-sdk.dev/components/edge) [Node](https://elements.ai-sdk.dev/components/node) [Panel](https://elements.ai-sdk.dev/components/panel) [Toolbar](https://elements.ai-sdk.dev/components/toolbar)

Utilities

[Image](https://elements.ai-sdk.dev/components/image) [Open In Chat](https://elements.ai-sdk.dev/components/open-in-chat) [Chatbot](https://elements.ai-sdk.dev/examples/chatbot) [IDE](https://elements.ai-sdk.dev/examples/ide) [v0 clone](https://elements.ai-sdk.dev/examples/v0) [Workflow](https://elements.ai-sdk.dev/examples/workflow)

# AI Elements

A component library and custom registry built on top of shadcn/ui to help you build AI-native applications faster.

[Explore Components](https://elements.ai-sdk.dev/en/components)

$

### Fully Composable

Every component is a building block. Combine small, focused pieces to create exactly the UI you need.

### AI SDK Integration

Deep integration with the AI SDK. Streaming, status states and type safety built-in.

### shadcn/ui Foundation

Built on shadcn/ui conventions. Your existing theme and setup apply automatically.

## Components to build anything

Mix and match components to build chat experiences, workflows, IDEs, voice agents and more.

7 Queued

- How do I set up the project?

- What is the roadmap for Q4?

- Update the default logo to this png.





![setup-guide.png](https://github.com/haydenbleasel.png)

- Please generate a changelog.

- Add dark mode support.

- Optimize database queries.

- Set up CI/CD pipeline.


5 Todo

- Write project documentation





Complete the README and API docs

- Implement authentication

- Fix bug #42





Resolve crash on settings page

- Refactor queue logic





Unify queue and todo state management

- Add unit tests





Increase test coverage for hooks


11 Tab

![openai logo](https://models.dev/logos/openai.svg)GPT-4o

Rewrite AI Elements to SolidJS

Rewrite the AI Elements component library from React to SolidJS while maintaining compatibility with existing React-based shadcn/ui components using solid-js/compat, updating all 29 components and their test suite.

Toggle plan

Build `⌘↩`

Research Assistantopenai/gpt-5.2-pro

Instructions

You are a helpful research assistant. Your job is to search the web for information and summarize findings for the user. Always cite your sources and provide accurate, up-to-date information.

Tools

### Search the web for information

### Read and parse a URL

### Summarize text into key points

Output Schema

```
z.object({  sentiment: z.enum(['positive', 'negative', 'neutral']),  score: z.number(),  summary: z.string(),})
```

Chain of Thought

Searching for profiles for Hayden Bleasel

www.x.comwww.instagram.comwww.github.com

Found the profile photo for Hayden Bleasel

![Example generated image](<Base64-Image-Removed>)

Hayden Bleasel's profile photo from x.com, showing a Ghibli-style man.

Hayden Bleasel is an Australian product designer, software engineer, and founder. He is currently based in the United States working for Vercel, an American cloud application company.

Searching for recent work...

www.github.comwww.dribbble.com

Found project files

Searching "app/page.tsx, components structure"

Read
Reactpage.tsx

Scanning 52 files

Scanning 2 files

Reading files
Reactlayout.tsx

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

greet.ts

TypeScript

```
function greet(name: string): string {  return `Hello, ${name}!`;}
console.log(greet("World"));
```

### Environment Variables

DATABASE\_URLRequired

••••••••••••••••••••

API\_KEYRequired

•••••••••••••••••••

NODE\_ENV

••••••••••

PORT

••••

## Fast, Flexible Installation

Install only what you need. The CLI adds components directly to your codebase with full source code access. No hidden dependencies, tree-shaking friendly.

$npx ai-elements@latest add conversation

✔ Checking registry.

✔ Installing dependencies.

✔ Created 1 file:

\- components/ai-elements/conversation.tsx

ℹ Skipped 1 files: (files might be identical, use --overwrite to overwrite)

\- components/ui/button.tsx

## Get started quickly

See AI Elements in action with one of our examples.

[**Chatbot** \\
A full-featured chat interface with streaming, markdown and file attachments.\\
\\
```\\
"use client";\\
import {  Conversation,  ConversationContent,  ConversationScrollButton,} from "@repo/elements/conversation";import {  Message,  MessageBranch,  MessageBranchContent,  MessageBranchNext,  MessageBranchPage,  MessageBranchPrevious,  MessageBranchSelector,  MessageContent,  MessageResponse,} from "@repo/elements/message";import type { PromptInputMessage } from "@repo/elements/prompt-input";import {  PromptInput,  PromptInputButton,  PromptInputFooter,  PromptInputTextarea,  PromptInputTools,} from "@repo/elements/prompt-input";import {  Reasoning,  ReasoningContent,  ReasoningTrigger,} from "@repo/elements/reasoning";import {  Source,  Sources,  SourcesContent,  SourcesTrigger,} from "@repo/elements/sources";import { Suggestion, Suggestions } from "@repo/elements/suggestion";import {  DropdownMenu,  DropdownMenuContent,  DropdownMenuItem,  DropdownMenuTrigger,} from "@repo/shadcn-ui/components/ui/dropdown-menu";import { cn } from "@repo/shadcn-ui/lib/utils";import type { ToolUIPart } from "ai";import {  AudioWaveformIcon,  BarChartIcon,  BoxIcon,  CameraIcon,  CodeSquareIcon,  FileIcon,  GlobeIcon,  GraduationCapIcon,  ImageIcon,  NotepadTextIcon,  PaperclipIcon,  ScreenShareIcon,} from "lucide-react";import { nanoid } from "nanoid";import { memo, useCallback, useEffect, useState } from "react";import { toast } from "sonner";\\
interface MessageType {  key: string;  from: "user" | "assistant";  sources?: { href: string; title: string }[];  versions: {    id: string;    content: string;  }[];  reasoning?: {    content: string;    duration: number;  };  tools?: {    name: string;    description: string;    status: ToolUIPart["state"];    parameters: Record<string, unknown>;    result: string | undefined;    error: string | undefined;  }[];  isReasoningComplete?: boolean;  isContentComplete?: boolean;  isReasoningStreaming?: boolean;}\\
const mockMessages: MessageType[] = [  {    from: "user",    key: nanoid(),    versions: [      {        content: "Can you explain how to use React hooks effectively?",        id: nanoid(),      },    ],  },  {    from: "assistant",    key: nanoid(),    sources: [      {        href: "https://react.dev/reference/react",        title: "React Documentation",      },      {        href: "https://react.dev/reference/react-dom",        title: "React DOM Documentation",      },    ],    tools: [      {        description: "Searching React documentation",        error: undefined,        name: "mcp",        parameters: {          query: "React hooks best practices",          source: "react.dev",        },        result: `{  "query": "React hooks best practices",  "results": [    {      "title": "Rules of Hooks",      "url": "https://react.dev/warnings/invalid-hook-call-warning",      "snippet": "Hooks must be called at the top level of your React function components or custom hooks. Don't call hooks inside loops, conditions, or nested functions."    },    {      "title": "useState Hook",      "url": "https://react.dev/reference/react/useState",      "snippet": "useState is a React Hook that lets you add state to your function components. It returns an array with two values: the current state and a function to update it."    },    {      "title": "useEffect Hook",      "url": "https://react.dev/reference/react/useEffect",      "snippet": "useEffect lets you synchronize a component with external systems. It runs after render and can be used to perform side effects like data fetching."    }  ]}`,        status: "input-available",      },    ],    versions: [      {        content: `# React Hooks Best Practices\\
React hooks are a powerful feature that let you use state and other React features without writing classes. Here are some tips for using them effectively:\\
## Rules of Hooks\\
1. **Only call hooks at the top level** of your component or custom hooks2. **Don't call hooks inside loops, conditions, or nested functions**\\
## Common Hooks\\
- **useState**: For local component state- **useEffect**: For side effects like data fetching- **useContext**: For consuming context- **useReducer**: For complex state logic- **useCallback**: For memoizing functions- **useMemo**: For memoizing values\\
## Example of useState and useEffect\\
\`\`\`jsxfunction ProfilePage({ userId }) {  const [user, setUser] = useState(null);    useEffect(() => {    // This runs after render and when userId changes    fetchUser(userId).then(userData => {      setUser(userData);    });  }, [userId]);    return user ? <Profile user={user} /> : <Loading />;}\`\`\`\\
Would you like me to explain any specific hook in more detail?`,        id: nanoid(),      },    ],  },  {    from: "user",    key: nanoid(),    versions: [      {        content:          "Yes, could you explain useCallback and useMemo in more detail? When should I use one over the other?",        id: nanoid(),      },      {        content:          "I'm particularly interested in understanding the performance implications of useCallback and useMemo. Could you break down when each is most appropriate?",        id: nanoid(),      },      {        content:          "Thanks for the overview! Could you dive deeper into the specific use cases where useCallback and useMemo make the biggest difference in React applications?",        id: nanoid(),      },    ],  },  {    from: "assistant",    key: nanoid(),    reasoning: {      content: `The user is asking for a detailed explanation of useCallback and useMemo. I should provide a clear and concise explanation of each hook's purpose and how they differ.      The useCallback hook is used to memoize functions to prevent unnecessary re-renders of child components that receive functions as props.\\
The useMemo hook is used to memoize values to avoid expensive recalculations on every render.\\
Both hooks help with performance optimization, but they serve different purposes.`,      duration: 10,    },    versions: [      {        content: `## useCallback vs useMemo\\
Both hooks help with *performance optimization*, but they serve different purposes:\\
### useCallback\\
\`useCallback\` memoizes **functions** to prevent unnecessary re-renders of child components that receive functions as props.\\
\`\`\`jsx// Without useCallback - a new function is created on every renderconst handleClick = () => {  console.log(count);};\\
// With useCallback - the function is only recreated when dependencies changeconst handleClick = useCallback(() => {  console.log(count);}, [count]);\`\`\`\\
### useMemo\\
\`useMemo\` memoizes **values** to avoid expensive recalculations on every render.\\
\`\`\`jsx// Without useMemo - expensive calculation runs on every renderconst sortedList = expensiveSort(items);\\
// With useMemo - calculation only runs when items changeconst sortedList = useMemo(() => expensiveSort(items), [items]);\`\`\`\\
### When to use which?\\
- Use **useCallback** when:  - Passing callbacks to optimized child components that rely on reference equality  - Working with event handlers that you pass to child components\\
- Use **useMemo** when:  - You have computationally expensive calculations  - You want to avoid recreating objects that are used as dependencies for other hooks\\
### Performance Note\\
Don't overuse these hooks! They come with their own overhead. Only use them when you have identified a genuine performance issue.\\
### ~~Deprecated Methods~~\\
Note that ~~class-based lifecycle methods~~ like \`componentDidMount\` are now replaced by the \`useEffect\` hook in modern React development.`,        id: nanoid(),      },    ],  },];\\
const suggestions = [  { color: "#76d0eb", icon: BarChartIcon, text: "Analyze data" },  { color: "#76d0eb", icon: BoxIcon, text: "Surprise me" },  { color: "#ea8444", icon: NotepadTextIcon, text: "Summarize text" },  { color: "#6c71ff", icon: CodeSquareIcon, text: "Code" },  { color: "#76d0eb", icon: GraduationCapIcon, text: "Get advice" },  { text: "More" },];\\
const mockMessageResponses = [  "That's a great question! Let me help you understand this concept better. The key thing to remember is that proper implementation requires careful consideration of the underlying principles and best practices in the field.",  "I'd be happy to explain this topic in detail. From my understanding, there are several important factors to consider when approaching this problem. Let me break it down step by step for you.",  "This is an interesting topic that comes up frequently. The solution typically involves understanding the core concepts and applying them in the right context. Here's what I recommend...",  "Great choice of topic! This is something that many developers encounter. The approach I'd suggest is to start with the fundamentals and then build up to more complex scenarios.",  "That's definitely worth exploring. From what I can see, the best way to handle this is to consider both the theoretical aspects and practical implementation details.",];\\
interface SuggestionItemProps {  icon?: React.ComponentType<{ size: number; style?: React.CSSProperties }>;  text: string;  color?: string;  onSuggestionClick: (text: string) => void;}\\
const SuggestionItem = memo(  ({ icon: Icon, text, color, onSuggestionClick }: SuggestionItemProps) => {    const handleClick = useCallback(      () => onSuggestionClick(text),      [onSuggestionClick, text]    );\\
    return (      <Suggestion        className="font-normal text-foreground"        onClick={handleClick}        suggestion={text}      >        {Icon && <Icon size={16} style={{ color }} />}        {text}      </Suggestion>    );  });\\
SuggestionItem.displayName = "SuggestionItem";\\
const Example = () => {  const [text, setText] = useState<string>("");  const [_useWebSearch, setUseWebSearch] = useState<boolean>(false);  const [_useMicrophone, setUseMicrophone] = useState<boolean>(false);  const [_status, setStatus] = useState<    "submitted" | "streaming" | "ready" | "error"  >("ready");  const [messages, setMessages] = useState<MessageType[]>([]);  const [_streamingMessageId, setStreamingMessageId] = useState<string | null>(    null  );\\
  const streamReasoning = async (    messageKey: string,    _versionId: string,    reasoningContent: string  ) => {    const words = reasoningContent.split(" ");    let currentContent = "";\\
    for (let i = 0; i < words.length; i += 1) {      currentContent += (i > 0 ? " " : "") + words[i];\\
      // Intentionally capture currentContent at each iteration for streaming effect      // oxlint-disable-next-line eslint(no-loop-func)      setMessages((prev) =>        prev.map((msg) => {          if (msg.key === messageKey) {            return {              ...msg,              reasoning: msg.reasoning                ? { ...msg.reasoning, content: currentContent }                : undefined,            };          }          return msg;        })      );\\
      // oxlint-disable-next-line eslint-plugin-promise(avoid-new)      await new Promise((resolve) => {        setTimeout(resolve, Math.random() * 30 + 20);      });    }\\
    // Mark reasoning as complete    setMessages((prev) =>      prev.map((msg) => {        if (msg.key === messageKey) {          return {            ...msg,            isReasoningComplete: true,            isReasoningStreaming: false,          };        }        return msg;      })    );  };\\
  const streamContent = async (    messageKey: string,    versionId: string,    content: string  ) => {    const words = content.split(" ");    let currentContent = "";\\
    for (let i = 0; i < words.length; i += 1) {      currentContent += (i > 0 ? " " : "") + words[i];\\
      // Intentionally capture currentContent at each iteration for streaming effect      // oxlint-disable-next-line eslint(no-loop-func)      setMessages((prev) =>        prev.map((msg) => {          if (msg.key === messageKey) {            return {              ...msg,              versions: msg.versions.map((v) =>                v.id === versionId ? { ...v, content: currentContent } : v              ),            };          }          return msg;        })      );\\
      // oxlint-disable-next-line eslint-plugin-promise(avoid-new)      await new Promise((resolve) => {        setTimeout(resolve, Math.random() * 50 + 25);      });    }\\
    // Mark content as complete    setMessages((prev) =>      prev.map((msg) => {        if (msg.key === messageKey) {          return { ...msg, isContentComplete: true };        }        return msg;      })    );  };\\
  // biome-ignore lint/correctness/useExhaustiveDependencies: streamContent and streamReasoning only use stable setMessages  const streamMessageResponse = useCallback(    async (      messageKey: string,      versionId: string,      content: string,      reasoning?: { content: string; duration: number }    ) => {      setStatus("streaming");      setStreamingMessageId(versionId);\\
      // First stream the reasoning if it exists      if (reasoning) {        await streamReasoning(messageKey, versionId, reasoning.content);        // Pause between reasoning and content        // oxlint-disable-next-line eslint-plugin-promise(avoid-new)        await new Promise((resolve) => {          setTimeout(resolve, 500);        });      }\\
      // Then stream the content      await streamContent(messageKey, versionId, content);\\
      setStatus("ready");      setStreamingMessageId(null);    },    []  );\\
  const streamMessage = useCallback(    async (message: MessageType) => {      if (message.from === "user") {        setMessages((prev) => [...prev, message]);        return;      }\\
      // Add empty assistant message with reasoning structure      const newMessage = {        ...message,        isContentComplete: false,        isReasoningComplete: false,        isReasoningStreaming: !!message.reasoning,        reasoning: message.reasoning          ? { ...message.reasoning, content: "" }          : undefined,        versions: message.versions.map((v) => ({ ...v, content: "" })),      };\\
      setMessages((prev) => [...prev, newMessage]);\\
      // Get the first version for streaming      const [firstVersion] = message.versions;      if (!firstVersion) {        return;      }\\
      // Stream the response      await streamMessageResponse(        newMessage.key,        firstVersion.id,        firstVersion.content,        message.reasoning      );    },    [streamMessageResponse]  );\\
  const addUserMessage = useCallback(    (content: string) => {      const userMessage: MessageType = {        from: "user",        key: `user-${Date.now()}`,        versions: [          {            content,            id: `user-${Date.now()}`,          },        ],      };\\
      setMessages((prev) => [...prev, userMessage]);\\
      setTimeout(() => {        const assistantMessageKey = `assistant-${Date.now()}`;        const assistantMessageId = `version-${Date.now()}`;        const randomMessageResponse =          mockMessageResponses[            Math.floor(Math.random() * mockMessageResponses.length)          ];\\
        // Create reasoning for some responses        const shouldHaveReasoning = Math.random() > 0.5;        const reasoning = shouldHaveReasoning          ? {              content:                "Let me think about this question carefully. I need to provide a comprehensive and helpful response that addresses the user's needs while being clear and concise.",              duration: 3,            }          : undefined;\\
        const assistantMessage: MessageType = {          from: "assistant",          isContentComplete: false,          isReasoningComplete: false,          isReasoningStreaming: !!reasoning,          key: assistantMessageKey,          reasoning: reasoning ? { ...reasoning, content: "" } : undefined,          versions: [            {              content: "",              id: assistantMessageId,            },          ],        };\\
        setMessages((prev) => [...prev, assistantMessage]);        streamMessageResponse(          assistantMessageKey,          assistantMessageId,          randomMessageResponse,          reasoning        );      }, 500);    },    [streamMessageResponse]  );\\
  useEffect(() => {    // Reset state on mount to ensure fresh component    setMessages([]);\\
    const processMessages = async () => {      for (let i = 0; i < mockMessages.length; i += 1) {        await streamMessage(mockMessages[i]);\\
        if (i < mockMessages.length - 1) {          // oxlint-disable-next-line eslint-plugin-promise(avoid-new)          await new Promise((resolve) => {            setTimeout(resolve, 1000);          });        }      }    };\\
    // Small delay to ensure state is reset before starting    const timer = setTimeout(() => {      processMessages();    }, 100);\\
    // Cleanup function to cancel any ongoing operations    return () => {      clearTimeout(timer);      setMessages([]);    };  }, [streamMessage]);\\
  const handleSubmit = useCallback(    (message: PromptInputMessage) => {      const hasText = Boolean(message.text);      const hasAttachments = Boolean(message.files?.length);\\
      if (!(hasText || hasAttachments)) {        return;      }\\
      setStatus("submitted");      addUserMessage(message.text || "Sent with attachments");      setText("");    },    [addUserMessage]  );\\
  const handleTextChange = useCallback(    (event: React.ChangeEvent<HTMLTextAreaElement>) =>      setText(event.target.value),    []  );\\
  const handleFileAction = (action: string) => {    toast.success("File action", {      description: action,    });  };\\
  const handleUploadFile = useCallback(    () => handleFileAction("upload-file"),    []  );  const handleUploadPhoto = useCallback(    () => handleFileAction("upload-photo"),    []  );  const handleTakeScreenshot = useCallback(    () => handleFileAction("take-screenshot"),    []  );  const handleTakePhoto = useCallback(() => handleFileAction("take-photo"), []);  const handleToggleWebSearch = useCallback(    () => setUseWebSearch((prev) => !prev),    []  );  const handleToggleMicrophone = useCallback(    () => setUseMicrophone((prev) => !prev),    []  );\\
  const handleSuggestionClick = useCallback(    (suggestion: string) => {      setStatus("submitted");      addUserMessage(suggestion);    },    [addUserMessage]  );\\
  return (    <div className="relative flex size-full flex-col divide-y overflow-hidden">      <Conversation>        <ConversationContent>          {messages.map(({ versions, ...message }) => (            <MessageBranch defaultBranch={0} key={message.key}>              <MessageBranchContent>                {versions.map((version) => (                  <Message                    from={message.from}                    key={`${message.key}-${version.id}`}                  >                    <div>                      {message.sources?.length && (                        <Sources>                          <SourcesTrigger count={message.sources.length} />                          <SourcesContent>                            {message.sources.map((source) => (                              <Source                                href={source.href}                                key={source.href}                                title={source.title}                              />                            ))}                          </SourcesContent>                        </Sources>                      )}                      {message.reasoning && (                        <Reasoning                          duration={message.reasoning.duration}                          isStreaming={message.isReasoningStreaming}                        >                          <ReasoningTrigger />                          <ReasoningContent>                            {message.reasoning.content}                          </ReasoningContent>                        </Reasoning>                      )}                      {(message.from === "user" ||                        message.isReasoningComplete ||                        !message.reasoning) && (                        <MessageContent                          className={cn(                            "group-[.is-user]:rounded-[24px] group-[.is-user]:bg-secondary group-[.is-user]:text-foreground",                            "group-[.is-assistant]:bg-transparent group-[.is-assistant]:p-0 group-[.is-assistant]:text-foreground"                          )}                        >                          <MessageResponse>{version.content}</MessageResponse>                        </MessageContent>                      )}                    </div>                  </Message>                ))}              </MessageBranchContent>              {versions.length > 1 && (                <MessageBranchSelector className="px-0">                  <MessageBranchPrevious />                  <MessageBranchPage />                  <MessageBranchNext />                </MessageBranchSelector>              )}            </MessageBranch>          ))}        </ConversationContent>        <ConversationScrollButton />      </Conversation>      <div className="grid shrink-0 gap-4 p-4">        <PromptInput          className="divide-y-0 rounded-[28px]"          onSubmit={handleSubmit}        >          <PromptInputTextarea            className="px-5 md:text-base"            onChange={handleTextChange}            placeholder="Ask anything"            value={text}          />          <PromptInputFooter className="p-2.5">            <PromptInputTools>              <DropdownMenu>                <DropdownMenuTrigger asChild>                  <PromptInputButton                    className="!rounded-full border font-medium"                    variant="outline"                  >                    <PaperclipIcon size={16} />                    <span>Attach</span>                  </PromptInputButton>                </DropdownMenuTrigger>                <DropdownMenuContent align="start">                  <DropdownMenuItem onClick={handleUploadFile}>                    <FileIcon className="mr-2" size={16} />                    Upload file                  </DropdownMenuItem>                  <DropdownMenuItem onClick={handleUploadPhoto}>                    <ImageIcon className="mr-2" size={16} />                    Upload photo                  </DropdownMenuItem>                  <DropdownMenuItem onClick={handleTakeScreenshot}>                    <ScreenShareIcon className="mr-2" size={16} />                    Take screenshot                  </DropdownMenuItem>                  <DropdownMenuItem onClick={handleTakePhoto}>                    <CameraIcon className="mr-2" size={16} />                    Take photo                  </DropdownMenuItem>                </DropdownMenuContent>              </DropdownMenu>              <PromptInputButton                className="rounded-full border font-medium"                onClick={handleToggleWebSearch}                variant="outline"              >                <GlobeIcon size={16} />                <span>Search</span>              </PromptInputButton>            </PromptInputTools>            <PromptInputButton              className="rounded-full font-medium text-foreground"              onClick={handleToggleMicrophone}              variant="secondary"            >              <AudioWaveformIcon size={16} />              <span>Voice</span>            </PromptInputButton>          </PromptInputFooter>        </PromptInput>        <Suggestions className="px-4">          {suggestions.map(({ icon, text: label, color }) => (            <SuggestionItem              color={color}              icon={icon}              key={label}              onSuggestionClick={handleSuggestionClick}              text={label}            />          ))}        </Suggestions>      </div>    </div>  );};\\
export default Example;\\
```](https://elements.ai-sdk.dev/examples/chatbot) [**IDE** \\
IDE-style interface with syntax highlighting, terminal output and file trees.\\
\\
```\\
"use client";\\
import {  Checkpoint,  CheckpointIcon,  CheckpointTrigger,} from "@repo/elements/checkpoint";import { CodeBlock } from "@repo/elements/code-block";import { Conversation, ConversationContent } from "@repo/elements/conversation";import {  FileTree,  FileTreeFile,  FileTreeFolder,} from "@repo/elements/file-tree";import {  Message,  MessageContent,  MessageResponse,} from "@repo/elements/message";import {  Plan,  PlanAction,  PlanContent,  PlanDescription,  PlanHeader,  PlanTitle,  PlanTrigger,} from "@repo/elements/plan";import type { PromptInputMessage } from "@repo/elements/prompt-input";import {  PromptInput,  PromptInputFooter,  PromptInputSubmit,  PromptInputTextarea,} from "@repo/elements/prompt-input";import {  Queue,  QueueItem,  QueueItemContent,  QueueItemIndicator,  QueueList,  QueueSection,  QueueSectionContent,  QueueSectionLabel,  QueueSectionTrigger,} from "@repo/elements/queue";import {  Task,  TaskContent,  TaskItemFile,  TaskTrigger,} from "@repo/elements/task";import { Terminal, TerminalContent } from "@repo/elements/terminal";import { cn } from "@repo/shadcn-ui/lib/utils";import { CheckCircle2Icon, ListTodoIcon } from "lucide-react";import { nanoid } from "nanoid";import { useCallback, useEffect, useState } from "react";import type { BundledLanguage } from "shiki";\\
// Typesinterface MockFile {  path: string;  name: string;  language: BundledLanguage;  content: string;}\\
interface MessageType {  key: string;  from: "user" | "assistant";  content: string;}\\
interface TaskItem {  id: string;  title: string;  status: "pending" | "in_progress" | "completed";}\\
// Mock file contentsconst mockFiles: MockFile[] = [  {    content: `import { useState } from "react";import { Button } from "./components/button";import { Input } from "./components/input";import { validateForm } from "./utils/helpers";\\
export function App() {  const [name, setName] = useState("");  const [email, setEmail] = useState("");  const [errors, setErrors] = useState<string[]>([]);\\
  const handleSubmit = () => {    const validation = validateForm({ name, email });    if (!validation.isValid) {      setErrors(validation.errors);      return;    }    console.log("Form submitted:", { name, email });  };\\
  return (    <div className="container mx-auto p-4">      <h1 className="text-2xl font-bold mb-4">Contact Form</h1>      <Input        placeholder="Name"        value={name}        onChange={(e) => setName(e.target.value)}      />      <Input        placeholder="Email"        value={email}        onChange={(e) => setEmail(e.target.value)}      />      {errors.map((error) => (        <p key={error} className="text-red-500">{error}</p>      ))}      <Button onClick={handleSubmit}>Submit</Button>    </div>  );}`,    language: "tsx",    name: "app.tsx",    path: "src/app.tsx",  },  {    content: `import { forwardRef, type ButtonHTMLAttributes } from "react";import { cn } from "../utils/helpers";\\
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {  variant?: "primary" | "secondary" | "ghost";  size?: "sm" | "md" | "lg";}\\
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(  ({ className, variant = "primary", size = "md", ...props }, ref) => {    return (      <button        ref={ref}        className={cn(          "inline-flex items-center justify-center rounded-md font-medium",          "transition-colors focus-visible:outline-none focus-visible:ring-2",          variant === "primary" && "bg-blue-500 text-white hover:bg-blue-600",          variant === "secondary" && "bg-gray-200 text-gray-900 hover:bg-gray-300",          variant === "ghost" && "hover:bg-gray-100",          size === "sm" && "h-8 px-3 text-sm",          size === "md" && "h-10 px-4",          size === "lg" && "h-12 px-6 text-lg",          className        )}        {...props}      />    );  });\\
Button.displayName = "Button";`,    language: "tsx",    name: "button.tsx",    path: "src/components/button.tsx",  },  {    content: `import { forwardRef, type InputHTMLAttributes } from "react";import { cn } from "../utils/helpers";\\
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {  error?: boolean;}\\
export const Input = forwardRef<HTMLInputElement, InputProps>(  ({ className, error, ...props }, ref) => {    return (      <input        ref={ref}        className={cn(          "flex h-10 w-full rounded-md border px-3 py-2 text-sm",          "focus-visible:outline-none focus-visible:ring-2",          error ? "border-red-500" : "border-gray-300",          className        )}        {...props}      />    );  });\\
Input.displayName = "Input";`,    language: "tsx",    name: "input.tsx",    path: "src/components/input.tsx",  },  {    content: `export function cn(...classes: (string | boolean | undefined)[]) {  return classes.filter(Boolean).join(" ");}\\
interface FormData {  name: string;  email: string;}\\
interface ValidationResult {  isValid: boolean;  errors: string[];}\\
export function validateForm(data: FormData): ValidationResult {  const errors: string[] = [];\\
  if (!data.name.trim()) {    errors.push("Name is required");  }\\
  if (!data.email.trim()) {    errors.push("Email is required");  } else if (!isValidEmail(data.email)) {    errors.push("Invalid email format");  }\\
  return {    isValid: errors.length === 0,    errors,  };}\\
function isValidEmail(email: string): boolean {  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);}`,    language: "typescript",    name: "helpers.ts",    path: "src/utils/helpers.ts",  },  {    content: `{  "name": "my-app",  "version": "1.0.0",  "private": true,  "scripts": {    "dev": "vite",    "build": "tsc && vite build",    "test": "vitest",    "lint": "eslint src"  },  "dependencies": {    "react": "^18.2.0",    "react-dom": "^18.2.0"  },  "devDependencies": {    "@types/react": "^18.2.0",    "typescript": "^5.0.0",    "vite": "^5.0.0",    "vitest": "^1.0.0"  }}`,    language: "json",    name: "package.json",    path: "package.json",  },  {    content: `# My App\\
A simple React application with form validation.\\
## Getting Started\\
\`\`\`bashnpm installnpm run dev\`\`\`\\
## Features\\
- Contact form with validation- Reusable Button and Input components- TypeScript support`,    language: "markdown",    name: "README.md",    path: "README.md",  },];\\
// Mock tasksconst initialTasks: TaskItem[] = [  { id: "1", status: "completed", title: "Refactor Button component" },  { id: "2", status: "in_progress", title: "Add form validation" },  { id: "3", status: "pending", title: "Write unit tests" },];\\
// Mock chat messagesconst mockMessages: MessageType[] = [  {    content: "Can you help me add email validation to the form?",    from: "user",    key: nanoid(),  },  {    content: `I can help you add email validation. Looking at your code in \`src/utils/helpers.ts\`, I see you already have a \`validateForm\` function.\\
Here's what I'll do:\\
1. Add an \`isValidEmail\` helper function2. Update \`validateForm\` to check email format3. Show validation errors in the UI\\
The email validation uses a regex pattern to check for valid email format. The form will now show "Invalid email format" if the user enters an incorrectly formatted email address.`,    from: "assistant",    key: nanoid(),  },];\\
// Mock terminal outputconst mockTerminalLines = [  "\u001B[32m✓\u001B[0m Building application...",  "\u001B[36m  src/app.tsx\u001B[0m → \u001B[33mdist/app.js\u001B[0m",  "\u001B[36m  src/components/button.tsx\u001B[0m → \u001B[33mdist/button.js\u001B[0m",  "\u001B[36m  src/components/input.tsx\u001B[0m → \u001B[33mdist/input.js\u001B[0m",  "\u001B[36m  src/utils/helpers.ts\u001B[0m → \u001B[33mdist/helpers.js\u001B[0m",  "",  "\u001B[32m✓\u001B[0m Build completed in \u001B[33m1.2s\u001B[0m",  "",  "\u001B[34mRunning tests...\u001B[0m",  "",  " \u001B[32m✓\u001B[0m validateForm › returns errors for empty fields",  " \u001B[32m✓\u001B[0m validateForm › returns error for invalid email",  " \u001B[32m✓\u001B[0m validateForm › passes for valid input",  " \u001B[32m✓\u001B[0m Button › renders with correct variant",  " \u001B[32m✓\u001B[0m Input › shows error state",  "",  "\u001B[32mAll tests passed!\u001B[0m (5/5)",];\\
const Example = () => {  // File tree state  const [selectedPath, setSelectedPath] = useState<string>("src/app.tsx");  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(    new Set(["src", "src/components", "src/utils"])  );\\
  // Code editor state  const [currentFile, setCurrentFile] = useState<MockFile>(mockFiles[0]);\\
  // Terminal state  const [terminalOutput, setTerminalOutput] = useState<string>("");  const [isTerminalStreaming, setIsTerminalStreaming] =    useState<boolean>(false);\\
  // Chat state  const [messages, setMessages] = useState<MessageType[]>([]);  const [chatText, setChatText] = useState<string>("");  const [status, setStatus] = useState<"ready" | "streaming" | "submitted">(    "ready"  );\\
  // Tasks state  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);\\
  // Checkpoint state  const [showCheckpoint, setShowCheckpoint] = useState<boolean>(false);\\
  // Find file by path  const findFileByPath = (path: string): MockFile | undefined =>    mockFiles.find((f) => f.path === path);\\
  // Handle file selection  const handleFileSelect = useCallback((path: string) => {    setSelectedPath(path);    const file = findFileByPath(path);    if (file) {      setCurrentFile(file);    }  }, []);\\
  // Stream message content word by word  const streamContent = useCallback(    async (messageKey: string, content: string) => {      const words = content.split(" ");      let currentContent = "";\\
      for (let i = 0; i < words.length; i += 1) {        currentContent += (i > 0 ? " " : "") + words[i];        const finalContent = currentContent;\\
        setMessages((prev) =>          prev.map((msg) =>            msg.key === messageKey ? { ...msg, content: finalContent } : msg          )        );\\
        // oxlint-disable-next-line eslint-plugin-promise(avoid-new)        await new Promise((resolve) => {          setTimeout(resolve, Math.random() * 40 + 20);        });      }    },    []  );\\
  // Stream message  const streamMessage = useCallback(    async (message: MessageType) => {      // Generate fresh key to avoid duplicates      const newKey = nanoid();      if (message.from === "user") {        setMessages((prev) => [...prev, { ...message, key: newKey }]);        return;      }\\
      // Add empty assistant message      const newMessage = { ...message, content: "", key: newKey };      setMessages((prev) => [...prev, newMessage]);\\
      setStatus("streaming");      await streamContent(message.key, message.content);      setStatus("ready");    },    [streamContent]  );\\
  // Stream terminal output line by line  const streamTerminal = useCallback(async () => {    setIsTerminalStreaming(true);    let output = "";\\
    for (const line of mockTerminalLines) {      output += `${line}\n`;      setTerminalOutput(output);      // oxlint-disable-next-line eslint-plugin-promise(avoid-new)      await new Promise((resolve) => {        setTimeout(resolve, 100);      });    }\\
    setIsTerminalStreaming(false);  }, []);\\
  // Animation sequence on mount  useEffect(() => {    const runAnimation = async () => {      // Wait a bit before starting      // oxlint-disable-next-line eslint-plugin-promise(avoid-new)      await new Promise((resolve) => {        setTimeout(resolve, 500);      });\\
      // Stream first message (user)      await streamMessage(mockMessages[0]);      // oxlint-disable-next-line eslint-plugin-promise(avoid-new)      await new Promise((resolve) => {        setTimeout(resolve, 800);      });\\
      // Stream second message (assistant)      await streamMessage(mockMessages[1]);      // oxlint-disable-next-line eslint-plugin-promise(avoid-new)      await new Promise((resolve) => {        setTimeout(resolve, 500);      });\\
      // Update task status      setTasks((prev) =>        prev.map((task) =>          task.id === "2" ? { ...task, status: "completed" as const } : task        )      );\\
      // Stream terminal output      await streamTerminal();\\
      // Show checkpoint      // oxlint-disable-next-line eslint-plugin-promise(avoid-new)      await new Promise((resolve) => {        setTimeout(resolve, 300);      });      setShowCheckpoint(true);    };\\
    runAnimation();  }, [streamMessage, streamTerminal]);\\
  const handleChatTextChange = useCallback(    (e: React.ChangeEvent<HTMLTextAreaElement>) => setChatText(e.target.value),    []  );\\
  // Handle chat submit  const handleSubmit = useCallback(    (message: PromptInputMessage) => {      if (!message.text.trim()) {        return;      }\\
      const userMessage: MessageType = {        content: message.text,        from: "user",        key: nanoid(),      };\\
      setMessages((prev) => [...prev, userMessage]);      setChatText("");      setStatus("submitted");\\
      // Simulate AI response      setTimeout(() => {        const assistantMessage: MessageType = {          content:            "I'll look into that for you. Let me analyze the codebase and suggest some improvements.",          from: "assistant",          key: nanoid(),        };        streamMessage(assistantMessage);      }, 500);    },    [streamMessage]  );\\
  const completedTasks = tasks.filter((t) => t.status === "completed");  const pendingTasks = tasks.filter((t) => t.status !== "completed");\\
  return (    <div className="flex h-full w-full bg-background">      {/* Left Sidebar - File Tree */}      <div className="flex w-64 flex-col border-r">        <div className="flex-1 overflow-auto p-1">          <FileTree            className="border-none"            expanded={expandedPaths}            onExpandedChange={setExpandedPaths}            onSelect={handleFileSelect}            selectedPath={selectedPath}          >            <FileTreeFolder name="src" path="src">              <FileTreeFolder name="components" path="src/components">                <FileTreeFile                  name="button.tsx"                  path="src/components/button.tsx"                />                <FileTreeFile                  name="input.tsx"                  path="src/components/input.tsx"                />              </FileTreeFolder>              <FileTreeFolder name="utils" path="src/utils">                <FileTreeFile name="helpers.ts" path="src/utils/helpers.ts" />              </FileTreeFolder>              <FileTreeFile name="app.tsx" path="src/app.tsx" />            </FileTreeFolder>            <FileTreeFile name="package.json" path="package.json" />            <FileTreeFile name="README.md" path="README.md" />          </FileTree>        </div>      </div>\\
      {/* Center Panel - Code + Terminal */}      <div className="flex flex-1 flex-col overflow-hidden">        {/* Code Block */}        <CodeBlock          className="rounded-none border-0"          code={currentFile.content}          language={currentFile.language}          showLineNumbers        />\\
        <Terminal          className="h-64 rounded-none border-0"          isStreaming={isTerminalStreaming}          output={terminalOutput}        >          <TerminalContent className="max-h-full" />        </Terminal>      </div>\\
      {/* Right Sidebar - AI Chat */}      <div className="flex w-80 flex-col border-l">        {/* Plan Section */}        <div className="border-b p-3">          <Plan defaultOpen>            <PlanHeader>              <div>                <PlanTitle>Implementation Plan</PlanTitle>                <PlanDescription>Adding form validation</PlanDescription>              </div>              <PlanAction>                <PlanTrigger />              </PlanAction>            </PlanHeader>            <PlanContent className="pt-0">              <Task defaultOpen>                <TaskTrigger title="Search for validation patterns" />                <TaskContent>                  <TaskItemFile>src/utils/helpers.ts</TaskItemFile>                  <TaskItemFile>src/app.tsx</TaskItemFile>                </TaskContent>              </Task>            </PlanContent>          </Plan>        </div>\\
        {/* Task Queue */}        <div className="border-b p-3">          <Queue>            <QueueSection defaultOpen>              <QueueSectionTrigger>                <QueueSectionLabel                  count={pendingTasks.length}                  icon={<ListTodoIcon className="size-4" />}                  label="Pending"                />              </QueueSectionTrigger>              <QueueSectionContent>                <QueueList>                  {pendingTasks.map((task) => (                    <QueueItem key={task.id}>                      <div className="flex items-center gap-2">                        <QueueItemIndicator />                        <QueueItemContent>{task.title}</QueueItemContent>                      </div>                    </QueueItem>                  ))}                </QueueList>              </QueueSectionContent>            </QueueSection>            <QueueSection defaultOpen={false}>              <QueueSectionTrigger>                <QueueSectionLabel                  count={completedTasks.length}                  icon={<CheckCircle2Icon className="size-4" />}                  label="Completed"                />              </QueueSectionTrigger>              <QueueSectionContent>                <QueueList>                  {completedTasks.map((task) => (                    <QueueItem key={task.id}>                      <div className="flex items-center gap-2">                        <QueueItemIndicator completed />                        <QueueItemContent completed>                          {task.title}                        </QueueItemContent>                      </div>                    </QueueItem>                  ))}                </QueueList>              </QueueSectionContent>            </QueueSection>          </Queue>        </div>\\
        {/* Chat Messages */}        <div className="flex flex-1 flex-col overflow-hidden">          <Conversation className="flex-1">            <ConversationContent className="gap-4 p-3">              {messages.map((message) => (                <Message from={message.from} key={message.key}>                  <MessageContent                    className={cn(                      message.from === "user"                        ? "rounded-lg bg-secondary px-3 py-2"                        : ""                    )}                  >                    {message.from === "assistant" ? (                      <MessageResponse>{message.content}</MessageResponse>                    ) : (                      message.content                    )}                  </MessageContent>                </Message>              ))}              {showCheckpoint && (                <Checkpoint>                  <CheckpointIcon />                  <CheckpointTrigger tooltip="Restore to this checkpoint">                    Checkpoint saved                  </CheckpointTrigger>                </Checkpoint>              )}            </ConversationContent>          </Conversation>\\
          {/* Chat Input */}          <div className="border-t p-3">            <PromptInput className="rounded-lg border" onSubmit={handleSubmit}>              <PromptInputTextarea                className="min-h-10"                onChange={handleChatTextChange}                placeholder="Ask about the code..."                value={chatText}              />              <PromptInputFooter className="justify-end p-2">                <PromptInputSubmit                  disabled={status !== "ready" || !chatText.trim()}                  status={status === "streaming" ? "streaming" : undefined}                />              </PromptInputFooter>            </PromptInput>          </div>        </div>      </div>    </div>  );};\\
export default Example;\\
```](https://elements.ai-sdk.dev/examples/ide) [**Workflow** \\
Visualize and interact with your AI workflows.\\
\\
```\\
"use client";\\
import { Canvas } from "@repo/elements/canvas";import { Connection } from "@repo/elements/connection";import { Edge } from "@repo/elements/edge";import {  Node,  NodeContent,  NodeDescription,  NodeFooter,  NodeHeader,  NodeTitle,} from "@repo/elements/node";\\
const nodeIds = {  decision: "decision",  output1: "output1",  output2: "output2",  process1: "process1",  process2: "process2",  start: "start",};\\
const nodes = [  {    data: {      content: "Triggered by user action at 09:30 AM",      description: "Initialize workflow",      footer: "Status: Ready",      handles: { source: true, target: false },      label: "Start",    },    id: nodeIds.start,    position: { x: 0, y: 0 },    type: "workflow",  },  {    data: {      content: "Validating 1,234 records and applying business rules",      description: "Transform input",      footer: "Duration: ~2.5s",      handles: { source: true, target: true },      label: "Process Data",    },    id: nodeIds.process1,    position: { x: 500, y: 0 },    type: "workflow",  },  {    data: {      content: "Evaluating: data.status === 'valid' && data.score > 0.8",      description: "Route based on conditions",      footer: "Confidence: 94%",      handles: { source: true, target: true },      label: "Decision Point",    },    id: nodeIds.decision,    position: { x: 1000, y: 0 },    type: "workflow",  },  {    data: {      content: "1,156 records passed validation (93.7%)",      description: "Handle success case",      footer: "Next: Send to production",      handles: { source: true, target: true },      label: "Success Path",    },    id: nodeIds.output1,    position: { x: 1500, y: -300 },    type: "workflow",  },  {    data: {      content: "78 records failed validation (6.3%)",      description: "Handle error case",      footer: "Next: Queue for review",      handles: { source: true, target: true },      label: "Error Path",    },    id: nodeIds.output2,    position: { x: 1500, y: 300 },    type: "workflow",  },  {    data: {      content: "All records processed and routed successfully",      description: "Finalize workflow",      footer: "Total time: 4.2s",      handles: { source: false, target: true },      label: "Complete",    },    id: nodeIds.process2,    position: { x: 2000, y: 0 },    type: "workflow",  },];\\
const edges = [  {    id: "edge1",    source: nodeIds.start,    target: nodeIds.process1,    type: "animated",  },  {    id: "edge2",    source: nodeIds.process1,    target: nodeIds.decision,    type: "animated",  },  {    id: "edge3",    source: nodeIds.decision,    target: nodeIds.output1,    type: "animated",  },  {    id: "edge4",    source: nodeIds.decision,    target: nodeIds.output2,    type: "temporary",  },  {    id: "edge5",    source: nodeIds.output1,    target: nodeIds.process2,    type: "animated",  },  {    id: "edge6",    source: nodeIds.output2,    target: nodeIds.process2,    type: "temporary",  },];\\
const nodeTypes = {  workflow: ({    data,  }: {    data: {      label: string;      description: string;      handles: { target: boolean; source: boolean };      content: string;      footer: string;    };  }) => (    <Node handles={data.handles}>      <NodeHeader>        <NodeTitle>{data.label}</NodeTitle>        <NodeDescription>{data.description}</NodeDescription>      </NodeHeader>      <NodeContent>        <p className="text-sm">{data.content}</p>      </NodeContent>      <NodeFooter>        <p className="text-muted-foreground text-xs">{data.footer}</p>      </NodeFooter>    </Node>  ),};\\
const edgeTypes = {  animated: Edge.Animated,  temporary: Edge.Temporary,};\\
const Example = () => (  <div style={{ height: "100%", width: "100%" }}>    <Canvas      connectionLineComponent={Connection}      edges={edges}      edgeTypes={edgeTypes}      fitView      nodes={nodes}      nodeTypes={nodeTypes}    />  </div>);\\
export default Example;\\
```](https://elements.ai-sdk.dev/examples/workflow)\
\
## Start building AI interfaces today\
\
[Get started](https://elements.ai-sdk.dev/en/docs)\
\
## Chat\
\
What is AI Elements?What can I build with AI Elements?How do I install AI Elements?How do I use AI Elements?\
\
Tip: You can open and close chat with `⌘I`\
\
0 / 1000
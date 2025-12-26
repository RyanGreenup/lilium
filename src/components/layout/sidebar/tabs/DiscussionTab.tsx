import { createSignal, For, createEffect } from "solid-js";
import X from "lucide-solid/icons/x";
import Clock from "lucide-solid/icons/clock";
import CheckCircle from "lucide-solid/icons/check-circle";
import { useKeybinding } from "~/solid-daisy-components/utilities/useKeybinding";

interface DiscussionMessage {
  id: string;
  content: string;
  timestamp: Date;
  status: "pending" | "in_progress" | "resolved";
}

interface DiscussionMessageProps {
  message: DiscussionMessage;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: DiscussionMessage["status"]) => void;
  isFocused?: boolean;
  onFocus?: () => void;
}

const DiscussionMessageComponent = (props: DiscussionMessageProps) => {
  const getStatusIcon = () => {
    switch (props.message.status) {
      case "resolved":
        return <CheckCircle class="w-4 h-4 text-success" />;
      case "in_progress":
        return <Clock class="w-4 h-4 text-warning" />;
      default:
        return <div class="w-4 h-4 rounded-full bg-base-content/30" />;
    }
  };

  const getStatusColor = () => {
    switch (props.message.status) {
      case "resolved":
        return "border-l-success";
      case "in_progress":
        return "border-l-warning";
      default:
        return "border-l-base-content/30";
    }
  };

  const classList = () => {
    const classes = [
      `p-3`,
      `bg-base-200`,
      `rounded-lg`,
      `border-l-4`,
      getStatusColor(),
    ];
    if (props.isFocused) {
      classes.push("ring-2", "ring-primary", "ring-inset");
    }
    return classes.join(" ");
  };

  return (
    <div
      class={classList()}
      onClick={props.onFocus}
      tabIndex={props.isFocused ? 0 : -1}
    >
      <div class="flex items-start justify-between gap-2 mb-2">
        <div class="flex items-center gap-2">
          {getStatusIcon()}
          <span class="text-xs text-base-content/60">
            {props.message.timestamp.toLocaleDateString()}{" "}
            {props.message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <button
          class="btn btn-ghost btn-xs"
          onClick={() => props.onDelete(props.message.id)}
        >
          <X class="w-3 h-3" />
        </button>
      </div>
      <p class="text-sm text-base-content mb-2">{props.message.content}</p>
      <div class="flex gap-1">
        <button
          class={`btn btn-xs ${props.message.status === "pending" ? "btn-neutral" : "btn-ghost"}`}
          onClick={() => props.onStatusChange(props.message.id, "pending")}
          title="Press 1 to set as Todo"
        >
          <span class={props.isFocused ? "underline" : ""}>1</span> Todo
        </button>
        <button
          class={`btn btn-xs ${props.message.status === "in_progress" ? "btn-warning" : "btn-ghost"}`}
          onClick={() => props.onStatusChange(props.message.id, "in_progress")}
          title="Press 2 to set as Working"
        >
          <span class={props.isFocused ? "underline" : ""}>2</span> Working
        </button>
        <button
          class={`btn btn-xs ${props.message.status === "resolved" ? "btn-success" : "btn-ghost"}`}
          onClick={() => props.onStatusChange(props.message.id, "resolved")}
          title="Press 3 to set as Done"
        >
          <span class={props.isFocused ? "underline" : ""}>3</span> Done
        </button>
      </div>
    </div>
  );
};

interface DiscussionTabProps {
  focusTrigger?: () => string | null;
}

export default function DiscussionTab(props: DiscussionTabProps = {}) {
  const [messages, setMessages] = createSignal<DiscussionMessage[]>([
    {
      id: "1",
      content:
        "Need to add more citations for the machine learning section. The claims about neural network efficiency need peer-reviewed sources.",
      timestamp: new Date("2024-01-15T14:30:00"),
      status: "pending",
    },
    {
      id: "2",
      content:
        "Review the algorithm complexity analysis in section 3. The Big O notation explanation might be confusing for beginners.",
      timestamp: new Date("2024-01-14T09:15:00"),
      status: "in_progress",
    },
    {
      id: "3",
      content:
        "Add practical Python examples for the data structures section. Code snippets would make the concepts clearer.",
      timestamp: new Date("2024-01-13T16:45:00"),
      status: "resolved",
    },
    {
      id: "4",
      content:
        "Consider adding a glossary section for technical terms. Some readers might need definitions for specialized vocabulary.",
      timestamp: new Date("2024-01-12T11:20:00"),
      status: "pending",
    },
  ]);

  const [newMessage, setNewMessage] = createSignal("");
  const [focusedMessageIndex, setFocusedMessageIndex] = createSignal(-1);
  let textareaRef: HTMLTextAreaElement | undefined;
  let containerRef: HTMLDivElement | undefined;

  const addMessage = () => {
    if (newMessage().trim()) {
      const message: DiscussionMessage = {
        id: Date.now().toString(),
        content: newMessage().trim(),
        timestamp: new Date(),
        status: "pending",
      };
      setMessages([message, ...messages()]);
      setNewMessage("");
    }
  };

  const deleteMessage = (id: string) => {
    setMessages(messages().filter((m) => m.id !== id));
  };

  const changeStatus = (id: string, status: DiscussionMessage["status"]) => {
    setMessages(messages().map((m) => (m.id === id ? { ...m, status } : m)));
  };

  // Handle external focus requests
  createEffect(() => {
    const trigger = props.focusTrigger?.();
    if (trigger && textareaRef) {
      // Focus textarea on next tick after render
      setTimeout(() => {
        textareaRef.focus();
      }, 0);
    }
  });

  // Handle keyboard navigation through messages
  useKeybinding(
    { key: "ArrowDown" },
    () => {
      const currentIndex = focusedMessageIndex();
      const maxIndex = messages().length - 1;
      if (currentIndex < maxIndex) {
        setFocusedMessageIndex(currentIndex + 1);
      }
    },
    { ref: () => containerRef },
  );

  useKeybinding(
    { key: "ArrowUp" },
    () => {
      const currentIndex = focusedMessageIndex();
      if (currentIndex > 0) {
        setFocusedMessageIndex(currentIndex - 1);
      } else if (currentIndex === 0) {
        // Return to textarea
        setFocusedMessageIndex(-1);
        if (textareaRef) {
          textareaRef.focus();
        }
      }
    },
    { ref: () => containerRef },
  );

  useKeybinding(
    { key: "Escape" },
    () => {
      setFocusedMessageIndex(-1);
      if (textareaRef) {
        textareaRef.focus();
      }
    },
    { ref: () => containerRef },
  );

  // Status toggle keybindings for focused message
  useKeybinding(
    { key: "1" },
    () => {
      const currentIndex = focusedMessageIndex();
      if (currentIndex >= 0) {
        const message = messages()[currentIndex];
        if (message) {
          changeStatus(message.id, "pending");
        }
      }
    },
    { ref: () => containerRef },
  );

  useKeybinding(
    { key: "2" },
    () => {
      const currentIndex = focusedMessageIndex();
      if (currentIndex >= 0) {
        const message = messages()[currentIndex];
        if (message) {
          changeStatus(message.id, "in_progress");
        }
      }
    },
    { ref: () => containerRef },
  );

  useKeybinding(
    { key: "3" },
    () => {
      const currentIndex = focusedMessageIndex();
      if (currentIndex >= 0) {
        const message = messages()[currentIndex];
        if (message) {
          changeStatus(message.id, "resolved");
        }
      }
    },
    { ref: () => containerRef },
  );

  // Delete focused message
  useKeybinding(
    { key: "Delete" },
    () => {
      const currentIndex = focusedMessageIndex();
      if (currentIndex >= 0) {
        const message = messages()[currentIndex];
        if (message) {
          deleteMessage(message.id);
          // Adjust focus after deletion
          const newMessages = messages().filter((m) => m.id !== message.id);
          if (newMessages.length === 0) {
            setFocusedMessageIndex(-1);
            if (textareaRef) {
              textareaRef.focus();
            }
          } else if (currentIndex >= newMessages.length) {
            setFocusedMessageIndex(newMessages.length - 1);
          }
          // else keep current index (next message moves into position)
        }
      }
    },
    { ref: () => containerRef },
  );

  // Handle Tab key from textarea to first message
  const handleTextareaKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Tab" && !e.shiftKey && messages().length > 0) {
      e.preventDefault();
      setFocusedMessageIndex(0);
      if (containerRef) {
        containerRef.focus();
      }
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      addMessage();
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      class="p-4 space-y-4 outline-none focus:outline-none"
    >
      {/* Add new message form */}
      <div class="space-y-2">
        <h3 class="text-sm font-medium text-base-content/70">
          Improvement Notes
        </h3>
        <div class="space-y-2">
          <textarea
            ref={textareaRef}
            class="textarea textarea-bordered w-full text-sm"
            placeholder="Add a note about improvements needed for this note..."
            rows="3"
            value={newMessage()}
            onInput={(e) => setNewMessage(e.currentTarget.value)}
            onKeyDown={handleTextareaKeyDown}
          />
          <div class="flex justify-between items-center">
            <span class="text-xs text-base-content/60">
              Ctrl+Enter to add • Tab to navigate • 1/2/3 to change status • Del
              to delete
            </span>
            <button
              class="btn btn-primary btn-sm"
              onClick={addMessage}
              disabled={!newMessage().trim()}
            >
              Add Note
            </button>
          </div>
        </div>
      </div>

      {/* Messages list */}
      <div class="space-y-3">
        {messages().length === 0 ? (
          <div class="text-center text-base-content/60 text-sm py-8">
            No improvement notes yet. Add one above to get started.
          </div>
        ) : (
          <For each={messages()}>
            {(message, index) => (
              <DiscussionMessageComponent
                message={message}
                onDelete={deleteMessage}
                onStatusChange={changeStatus}
                isFocused={focusedMessageIndex() === index()}
                onFocus={() => setFocusedMessageIndex(index())}
              />
            )}
          </For>
        )}
      </div>
    </div>
  );
}

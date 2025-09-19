import { createSignal, For } from "solid-js";
import X from "lucide-solid/icons/x";
import Clock from "lucide-solid/icons/clock";
import CheckCircle from "lucide-solid/icons/check-circle";

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

  return (
    <div class={`p-3 bg-base-200 rounded-lg border-l-4 ${getStatusColor()}`}>
      <div class="flex items-start justify-between gap-2 mb-2">
        <div class="flex items-center gap-2">
          {getStatusIcon()}
          <span class="text-xs text-base-content/60">
            {props.message.timestamp.toLocaleDateString()} {props.message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
        >
          Todo
        </button>
        <button
          class={`btn btn-xs ${props.message.status === "in_progress" ? "btn-warning" : "btn-ghost"}`}
          onClick={() => props.onStatusChange(props.message.id, "in_progress")}
        >
          Working
        </button>
        <button
          class={`btn btn-xs ${props.message.status === "resolved" ? "btn-success" : "btn-ghost"}`}
          onClick={() => props.onStatusChange(props.message.id, "resolved")}
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default function DiscussionTab() {
  const [messages, setMessages] = createSignal<DiscussionMessage[]>([
    {
      id: "1",
      content: "Need to add more citations for the machine learning section. The claims about neural network efficiency need peer-reviewed sources.",
      timestamp: new Date("2024-01-15T14:30:00"),
      status: "pending"
    },
    {
      id: "2",
      content: "Review the algorithm complexity analysis in section 3. The Big O notation explanation might be confusing for beginners.",
      timestamp: new Date("2024-01-14T09:15:00"),
      status: "in_progress"
    },
    {
      id: "3",
      content: "Add practical Python examples for the data structures section. Code snippets would make the concepts clearer.",
      timestamp: new Date("2024-01-13T16:45:00"),
      status: "resolved"
    },
    {
      id: "4",
      content: "Consider adding a glossary section for technical terms. Some readers might need definitions for specialized vocabulary.",
      timestamp: new Date("2024-01-12T11:20:00"),
      status: "pending"
    }
  ]);

  const [newMessage, setNewMessage] = createSignal("");

  const addMessage = () => {
    if (newMessage().trim()) {
      const message: DiscussionMessage = {
        id: Date.now().toString(),
        content: newMessage().trim(),
        timestamp: new Date(),
        status: "pending"
      };
      setMessages([message, ...messages()]);
      setNewMessage("");
    }
  };

  const deleteMessage = (id: string) => {
    setMessages(messages().filter(m => m.id !== id));
  };

  const changeStatus = (id: string, status: DiscussionMessage["status"]) => {
    setMessages(messages().map(m =>
      m.id === id ? { ...m, status } : m
    ));
  };

  return (
    <div class="p-4 space-y-4">
      {/* Add new message form */}
      <div class="space-y-2">
        <h3 class="text-sm font-medium text-base-content/70">Improvement Notes</h3>
        <div class="space-y-2">
          <textarea
            class="textarea textarea-bordered w-full text-sm"
            placeholder="Add a note about improvements needed for this note..."
            rows="3"
            value={newMessage()}
            onInput={(e) => setNewMessage(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                addMessage();
              }
            }}
          />
          <div class="flex justify-between items-center">
            <span class="text-xs text-base-content/60">
              Ctrl+Enter to add
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
            {(message) => (
              <DiscussionMessageComponent
                message={message}
                onDelete={deleteMessage}
                onStatusChange={changeStatus}
              />
            )}
          </For>
        )}
      </div>
    </div>
  );
}

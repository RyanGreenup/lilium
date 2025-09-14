import {
  Apple,
  Candy,
  DollarSign,
  Heart,
  Pill,
  PillBottle,
} from "lucide-solid";
import { Component, JSXElement, Show } from "solid-js";

interface FirstLetterAvatarProps {
  name: string;
  class?: string;
  showIcon?: boolean;
}

export const FirstLetterAvatar: Component<FirstLetterAvatarProps> = (props) => {
  const getFirstLetter = () => props.name.charAt(0).toUpperCase();

  // Get appropriate icon based on food name
  const getIcon = (): JSXElement => {
    const name = props.name.toLowerCase();
    const iconProps = { size: 16, class: "text-primary" };

    if (name.includes("lemon") || name.includes("citrus"))
      return <Candy {...iconProps} />;
    if (
      name.includes("meat") ||
      name.includes("beef") ||
      name.includes("chicken")
    )
      return <Heart {...iconProps} />;
    if (name.includes("candy") || name.includes("sweet"))
      return <DollarSign {...iconProps} />;
    if (
      name.includes("kale") ||
      name.includes("lettuce") ||
      name.includes("salad")
    )
      return <PillBottle {...iconProps} />;
    if (name.includes("turmeric") || name.includes("supplement"))
      return <Pill {...iconProps} />;

    // Default icon for unknown foods
    return <Apple {...iconProps} />;
  };

  // Generate consistent colors based on first letter
  const getAvatarColor = () => {
    const letter = getFirstLetter();
    const colors = [
      "bg-red-500",
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500",
      "bg-orange-500",
      "bg-cyan-500",
      "bg-emerald-500",
      "bg-rose-500",
      "bg-violet-500",
      "bg-amber-500",
      "bg-lime-500",
      "bg-sky-500",
      "bg-fuchsia-500",
      "bg-slate-500",
    ];

    // Use char code to get consistent color for same letter
    const index = letter.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div
      class={`avatar placeholder relative ${props.class || ""}`}
      title={props.name}
    >
      <div
        class={`${getAvatarColor()} text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold text-center`}
      >
        <span>{getFirstLetter()}</span>
      </div>
      <Show when={props.showIcon}>
        <div class="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
          {getIcon()}
        </div>
      </Show>
    </div>
  );
};

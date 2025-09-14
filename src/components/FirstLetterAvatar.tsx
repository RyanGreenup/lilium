import { Component } from "solid-js";

interface FirstLetterAvatarProps {
  name: string;
  class?: string;
}

export const FirstLetterAvatar: Component<FirstLetterAvatarProps> = (props) => {
  const getFirstLetter = () => props.name.charAt(0).toUpperCase();
  
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
      class={`avatar placeholder ${props.class || ""}`}
      title={props.name}
    >
      <div class={`${getAvatarColor()} text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold text-center`}>
        <span>{getFirstLetter()}</span>
      </div>
    </div>
  );
};
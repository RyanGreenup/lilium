import { VoidComponent } from "solid-js";

interface LogoProps {
  class?: string;
}

export const Logo: VoidComponent<LogoProps> = (props) => {
  return (
    <svg
      viewBox="0 0 40 40"
      class={props.class}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Main parent node */}
      <circle cx="20" cy="8" r="3" fill="currentColor" opacity="0.9" />

      {/* Second level nodes */}
      <circle cx="12" cy="16" r="2.5" fill="currentColor" opacity="0.8" />
      <circle cx="28" cy="16" r="2.5" fill="currentColor" opacity="0.8" />

      {/* Third level nodes */}
      <circle cx="8" cy="24" r="2" fill="currentColor" opacity="0.7" />
      <circle cx="16" cy="24" r="2" fill="currentColor" opacity="0.7" />
      <circle cx="24" cy="24" r="2" fill="currentColor" opacity="0.7" />
      <circle cx="32" cy="24" r="2" fill="currentColor" opacity="0.7" />

      {/* Fourth level nodes */}
      <circle cx="6" cy="32" r="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="10" cy="32" r="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="14" cy="32" r="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="18" cy="32" r="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="22" cy="32" r="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="26" cy="32" r="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="30" cy="32" r="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="34" cy="32" r="1.5" fill="currentColor" opacity="0.6" />

      {/* Connecting lines */}
      <line
        x1="20"
        y1="11"
        x2="12"
        y2="13"
        stroke="currentColor"
        stroke-width="1.5"
        opacity="0.4"
      />
      <line
        x1="20"
        y1="11"
        x2="28"
        y2="13"
        stroke="currentColor"
        stroke-width="1.5"
        opacity="0.4"
      />

      <line
        x1="12"
        y1="19"
        x2="8"
        y2="22"
        stroke="currentColor"
        stroke-width="1"
        opacity="0.3"
      />
      <line
        x1="12"
        y1="19"
        x2="16"
        y2="22"
        stroke="currentColor"
        stroke-width="1"
        opacity="0.3"
      />
      <line
        x1="28"
        y1="19"
        x2="24"
        y2="22"
        stroke="currentColor"
        stroke-width="1"
        opacity="0.3"
      />
      <line
        x1="28"
        y1="19"
        x2="32"
        y2="22"
        stroke="currentColor"
        stroke-width="1"
        opacity="0.3"
      />

      <line
        x1="8"
        y1="26"
        x2="6"
        y2="30"
        stroke="currentColor"
        stroke-width="0.8"
        opacity="0.2"
      />
      <line
        x1="8"
        y1="26"
        x2="10"
        y2="30"
        stroke="currentColor"
        stroke-width="0.8"
        opacity="0.2"
      />
      <line
        x1="16"
        y1="26"
        x2="14"
        y2="30"
        stroke="currentColor"
        stroke-width="0.8"
        opacity="0.2"
      />
      <line
        x1="16"
        y1="26"
        x2="18"
        y2="30"
        stroke="currentColor"
        stroke-width="0.8"
        opacity="0.2"
      />
      <line
        x1="24"
        y1="26"
        x2="22"
        y2="30"
        stroke="currentColor"
        stroke-width="0.8"
        opacity="0.2"
      />
      <line
        x1="24"
        y1="26"
        x2="26"
        y2="30"
        stroke="currentColor"
        stroke-width="0.8"
        opacity="0.2"
      />
      <line
        x1="32"
        y1="26"
        x2="30"
        y2="30"
        stroke="currentColor"
        stroke-width="0.8"
        opacity="0.2"
      />
      <line
        x1="32"
        y1="26"
        x2="34"
        y2="30"
        stroke="currentColor"
        stroke-width="0.8"
        opacity="0.2"
      />
    </svg>
  );
};

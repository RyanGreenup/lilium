import { onMount } from "solid-js";

/**
 * Drop `<MaskWithSkeleton />` inside any element to overlay a skeleton and
 * copy a Tailwind skeleton snippet on click.
 *
 * Use this as a **refactoring probe**: if the copied dimensions don't match
 * the visual size of the element, the element derives its size from a parent
 * layout context (grid col-span, flex-grow, etc.) and is NOT a good candidate
 * for extraction into a self-contained component. Move deeper into the tree
 * until the skeleton matches — that's your extraction boundary.
 */
export const MaskWithSkeleton = () => {
  let ref!: HTMLDivElement;

  onMount(() => {
    const parent = ref.parentElement;
    if (!parent) return;

    if (getComputedStyle(parent).position === "static") {
      parent.style.position = "relative";
    }

    for (const child of parent.children) {
      if (child !== ref) {
        (child as HTMLElement).style.visibility = "hidden";
      }
    }
  });

  const handleClick = async () => {
    const parent = ref.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);

    const wRem = (w / 16).toFixed(2).replace(/\.?0+$/, "");
    const hRem = (h / 16).toFixed(2).replace(/\.?0+$/, "");

    const skeleton = `<div class="skeleton animate-pulse rounded w-[${wRem}rem] h-[${hRem}rem]" />`;

    await navigator.clipboard.writeText(skeleton);
    console.log({ w, h, wRem, hRem, skeleton });
  };

  return (
    <div
      ref={ref}
      class="absolute inset-0 z-50 skeleton animate-pulse rounded cursor-pointer"
      onclick={handleClick}
    />
  );
};
<div class="skeleton animate-pulse rounded w-[20.31rem] h-[100.94rem]" />

import { onMount, type JSXElement } from "solid-js";

export const CodeBlockEnhancer = (props: { children: JSXElement }) => {
  let containerRef: HTMLDivElement | undefined;

  const addCopyButton = (pre: HTMLElement) => {
    if (pre.querySelector(".copy-button")) return;
    
    const btn = document.createElement("button");
    btn.className = "copy-button btn btn-ghost btn-xs absolute top-2 right-2 opacity-60 hover:opacity-100";
    btn.textContent = "Copy";
    btn.title = "Copy code";
    
    btn.onclick = async () => {
      const text = (pre.querySelector("code") || pre).textContent || "";
      await navigator.clipboard.writeText(text);
      btn.textContent = "✓";
      btn.className = btn.className.replace("opacity-60", "text-success opacity-100");
      setTimeout(() => {
        btn.textContent = "Copy";
        btn.className = btn.className.replace("text-success opacity-100", "opacity-60");
      }, 2000);
    };
    
    pre.style.position = "relative";
    pre.appendChild(btn);
  };

  onMount(() => {
    const observer = new MutationObserver(() => {
      containerRef?.querySelectorAll("pre").forEach(addCopyButton);
    });
    
    if (containerRef) {
      containerRef.querySelectorAll("pre").forEach(addCopyButton);
      observer.observe(containerRef, { childList: true, subtree: true });
    }
    
    return () => observer.disconnect();
  });

  return <div ref={containerRef}>{props.children}</div>;
};
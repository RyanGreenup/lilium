import { onMount, onCleanup } from "solid-js";

export const GlobalMermaidRenderer = () => {
  let mermaidModule: typeof import("mermaid") | null = null;

  const isDarkMode = () =>
    window.matchMedia?.("(prefers-color-scheme: dark)").matches;

  const getMermaidTheme = () => (isDarkMode() ? "dark" : "default");

  const initMermaid = async () => {
    if (!mermaidModule) {
      mermaidModule = await import("mermaid");
    }
    mermaidModule.default.initialize({
      startOnLoad: false,
      theme: getMermaidTheme(),
    });
  };

  const renderMermaid = async () => {
    try {
      await initMermaid();

      // Find all code blocks with language-mermaid class
      const mermaidBlocks = document.querySelectorAll(
        "pre code.language-mermaid, pre code.hljs.language-mermaid"
      );

      for (const block of mermaidBlocks) {
        const pre = block.parentElement;
        if (!pre || pre.dataset.mermaidProcessed) continue;

        const code = block.textContent || "";
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

        try {
          const { svg } = await mermaidModule!.default.render(id, code);

          // Create container div and replace pre element
          const container = document.createElement("div");
          container.className = "mermaid-diagram";
          container.innerHTML = svg;
          pre.replaceWith(container);
        } catch (err) {
          console.warn("Mermaid render failed:", err);
          pre.dataset.mermaidProcessed = "error";
        }
      }
    } catch (error) {
      console.warn("Mermaid initialization failed:", error);
    }
  };

  onMount(() => {
    renderMermaid();

    // Watch for DOM changes (new markdown content)
    const mutationObserver = new MutationObserver(() => {
      setTimeout(renderMermaid, 100);
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Watch for theme changes
    const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleThemeChange = () => {
      // Re-initialize mermaid with new theme for future renders
      if (mermaidModule) {
        mermaidModule.default.initialize({
          startOnLoad: false,
          theme: getMermaidTheme(),
        });
      }
    };
    darkModeQuery.addEventListener("change", handleThemeChange);

    onCleanup(() => {
      mutationObserver.disconnect();
      darkModeQuery.removeEventListener("change", handleThemeChange);
    });
  });

  return null;
};

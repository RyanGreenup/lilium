import { onMount } from "solid-js";

export const GlobalMathRenderer = () => {
  const renderMath = async () => {
    try {
      const [katex, renderMathInElement] = await Promise.all([
        import("katex"),
        import("katex/dist/contrib/auto-render.min.js"),
      ]);
      
      await import("katex/dist/katex.min.css");

      renderMathInElement.default(document.body, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
        ],
        throwOnError: false,
      });
    } catch (error) {
      console.warn("KaTeX auto-render failed:", error);
    }
  };

  onMount(() => {
    // Initial render
    renderMath();
    
    // Set up observer for dynamic content
    const observer = new MutationObserver(() => {
      setTimeout(renderMath, 100);
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    
    return () => observer.disconnect();
  });

  return null;
};
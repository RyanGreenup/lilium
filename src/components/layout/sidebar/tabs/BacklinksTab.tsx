import { ContentList, ContentItemData } from "../shared/ContentItem";
import { createEffect } from "solid-js";

interface BacklinksTabProps {
  focusTrigger?: () => string | null;
}

export default function BacklinksTab(props: BacklinksTabProps = {}) {
  let containerRef: HTMLDivElement | undefined;
  const backlinks: ContentItemData[] = [
    {
      id: "1",
      title: "Machine Learning Fundamentals",
      abstract:
        "Comprehensive overview of machine learning concepts, algorithms, and applications. Covers supervised and unsupervised learning approaches with practical examples.",
      path: "/notes/computer-science/ai/ml-fundamentals.md",
    },
    {
      id: "2",
      title: "Data Structures and Algorithms",
      abstract:
        "Essential data structures including arrays, linked lists, trees, and graphs. Analysis of time and space complexity for common algorithms.",
      path: "/notes/computer-science/algorithms/data-structures.md",
    },
    {
      id: "3",
      title: "Linear Algebra Applications",
      abstract:
        "Mathematical foundations for computer graphics, machine learning, and data analysis. Covers vector spaces, matrices, and eigenvalues.",
      path: "/notes/mathematics/linear-algebra/applications.md",
    },
    {
      id: "4",
      title: "Python Programming Best Practices",
      abstract:
        "Guidelines for writing clean, maintainable Python code. Includes design patterns, testing strategies, and performance optimization techniques.",
      path: "/notes/programming/python/best-practices.md",
    },
  ];

  // Handle external focus requests
  createEffect(() => {
    const trigger = props.focusTrigger?.();
    if (trigger && containerRef) {
      // Focus on next tick after render
      setTimeout(() => {
        containerRef.focus();
      }, 0);
    }
  });

  return (
    <ContentList
      items={backlinks}
      showPath={true}
      emptyMessage="No backlinks found for this note"
      enableKeyboardNav={true}
      showFollowMode={true}
      ref={(el) => containerRef = el}
    />
  );
}

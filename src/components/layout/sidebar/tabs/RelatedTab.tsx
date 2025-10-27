import { ContentList, ContentItemData } from "../shared/ContentItem";
import { createEffect, Suspense } from "solid-js";

interface RelatedTabProps {
  focusTrigger?: () => string | null;
}

export default function RelatedTab(props: RelatedTabProps = {}) {
  let containerRef: HTMLDivElement | undefined;
  const relatedContent: ContentItemData[] = [
    {
      id: "1",
      title: "Mathematical Foundations of Machine Learning",
      abstract:
        "Essential mathematical concepts for understanding machine learning algorithms including calculus, linear algebra, and probability theory.",
      path: "/notes/mathematics/ml-foundations.md",
    },
    {
      id: "2",
      title: "Algorithm Complexity Analysis",
      abstract:
        "Big O notation, time and space complexity analysis for algorithms. Includes asymptotic analysis and practical performance considerations.",
      path: "/notes/computer-science/complexity-analysis.md",
    },
    {
      id: "3",
      title: "Scientific Computing with Python",
      abstract:
        "NumPy, SciPy, and Matplotlib for scientific computing applications. Covers numerical methods and data visualization techniques.",
      path: "/notes/programming/scientific-computing.md",
    },
    {
      id: "4",
      title: "Experimental Design Principles",
      abstract:
        "Statistical principles for designing experiments including control groups, randomization, and bias reduction strategies.",
      path: "/notes/research/experimental-design.md",
    },
    {
      id: "5",
      title: "Information Theory Basics",
      abstract:
        "Entropy, mutual information, and compression theory. Applications in machine learning and data analysis.",
      path: "/notes/mathematics/information-theory.md",
    },
    {
      id: "6",
      title: "Version Control for Research",
      abstract:
        "Git workflows for managing research projects, data versioning, and collaborative scientific computing environments.",
      path: "/notes/tools/version-control-research.md",
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
    <Suspense
      fallback={
        <div class="w-full h-full bg-base-200 rounded flex items-center justify-center">
          <div class="loading loading-spinner loading-md"></div>
        </div>
      }
    >
      <ContentList
        items={relatedContent}
        showPath={true}
        emptyMessage="No related content found"
        enableKeyboardNav={true}
        showFollowMode={true}
        ref={(el) => (containerRef = el)}
      />
    </Suspense>
  );
}

import { ContentList, ContentItemData } from "../shared/ContentItem";
import { createEffect } from "solid-js";

interface ForwardLinksTabProps {
  focusTrigger?: () => string | null;
}

export default function ForwardLinks(props: ForwardLinksTabProps = {}) {
  let containerRef: HTMLDivElement | undefined;
  const forwardLinks: ContentItemData[] = [
    {
      id: "1",
      title: "Quantum Computing Implementation",
      abstract:
        "Practical implementation of quantum algorithms using Qiskit and IBM Quantum computers. Includes circuit design and quantum error correction.",
      path: "/notes/physics/quantum/implementation.md",
    },
    {
      id: "2",
      title: "Advanced Statistical Analysis",
      abstract:
        "Deep dive into statistical methods for data analysis including hypothesis testing, regression analysis, and Bayesian statistics.",
      path: "/notes/mathematics/statistics/advanced-analysis.md",
    },
    {
      id: "3",
      title: "Neural Network Architectures",
      abstract:
        "Comprehensive guide to different neural network architectures including CNNs, RNNs, and Transformers with implementation examples.",
      path: "/notes/computer-science/ai/neural-networks.md",
    },
    {
      id: "4",
      title: "Research Methodology",
      abstract:
        "Systematic approach to conducting scientific research including experimental design, data collection, and analysis techniques.",
      path: "/notes/research/methodology/systematic-approach.md",
    },
    {
      id: "5",
      title: "Computational Physics Simulations",
      abstract:
        "Monte Carlo methods and molecular dynamics simulations for complex physical systems. Includes performance optimization strategies.",
      path: "/notes/physics/computational/simulations.md",
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
      items={forwardLinks}
      showPath={true}
      emptyMessage="No forward links found for this note"
      enableKeyboardNav={true}
      ref={(el) => containerRef = el}
    />
  );
}

import { ContentList, ContentItemData } from "../shared/ContentItem";

export default function RecentNotesTab() {
  const recentNotes: ContentItemData[] = [
    {
      id: "1",
      title: "Machine Learning Pipeline Design",
      abstract: "Comprehensive guide to building robust machine learning pipelines including data preprocessing, feature engineering, and model deployment strategies.",
      path: "/notes/computer-science/ai/ml-pipeline.md",
      onClick: () => window.location.href = "/note/1"
    },
    {
      id: "2", 
      title: "Statistical Hypothesis Testing",
      abstract: "Methods for testing statistical hypotheses including t-tests, ANOVA, and non-parametric tests. Covers p-values and effect sizes.",
      path: "/notes/mathematics/statistics/hypothesis-testing.md",
      onClick: () => window.location.href = "/note/2"
    },
    {
      id: "3",
      title: "Python Data Analysis Tools", 
      abstract: "Pandas, NumPy, and Matplotlib for data manipulation and visualization. Includes best practices for exploratory data analysis.",
      path: "/notes/programming/python/data-analysis.md",
      onClick: () => window.location.href = "/note/3"
    },
    {
      id: "4",
      title: "Quantum Computing Basics",
      abstract: "Introduction to quantum computing principles including qubits, superposition, entanglement, and quantum gates.",
      path: "/notes/physics/quantum/basics.org", 
      onClick: () => window.location.href = "/note/4"
    },
    {
      id: "5",
      title: "Research Methodology Framework",
      abstract: "Systematic approach to conducting scientific research including experimental design, data collection, and analysis techniques.",
      path: "/notes/research/methodology/framework.md",
      onClick: () => window.location.href = "/note/5"
    },
    {
      id: "6",
      title: "Linear Algebra Fundamentals",
      abstract: "Essential linear algebra concepts for machine learning and data science including vector spaces, matrices, and transformations.",
      path: "/notes/mathematics/linear-algebra/fundamentals.md",
      onClick: () => window.location.href = "/note/6"
    },
    {
      id: "7",
      title: "JavaScript Modern Features",
      abstract: "ES6+ features including arrow functions, destructuring, async/await, and modules for modern JavaScript development.",
      path: "/notes/programming/javascript/modern-features.md",
      onClick: () => window.location.href = "/note/7"
    }
  ];

  return (
    <ContentList 
      items={recentNotes}
      showPath={true}
      emptyMessage="No recent notes found"
    />
  );
}
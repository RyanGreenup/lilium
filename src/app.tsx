import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import "./app.css";
import { GlobalMathRenderer } from "./components/GlobalMathRenderer";
import { GlobalMermaidRenderer } from "./components/GlobalMermaidRenderer";

export default function App() {
  return (
    <Router
      root={(props) => (
        <>
          <GlobalMathRenderer />
          <GlobalMermaidRenderer />
          <Suspense>{props.children}</Suspense>
        </>
      )}
    >
      <FileRoutes />
    </Router>
  );
}

import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import "./app.css";
import { GlobalMathRenderer } from "./components/GlobalMathRenderer";

export default function App() {
  return (
    <Router
      root={(props) => (
        <>
          <GlobalMathRenderer />
          <Suspense>{props.children}</Suspense>
        </>
      )}
    >
      <FileRoutes />
    </Router>
  );
}

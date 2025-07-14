import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import "./app.css";
import MyLayout from "~/components/Layout";
import NavTree from "./components/Tree";

export default function App() {
  return (
    <Router
      root={(props) => (
        <MyLayout sidebarContent={<NavTree/>}>
          <Suspense>{props.children}</Suspense>
        </MyLayout>
      )}
    >
      <FileRoutes />
    </Router>
  );
}

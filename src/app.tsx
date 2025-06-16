import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import Nav from "~/components/Nav";
import "./app.css";
import MyLayout from "~/components/Layout";

export default function App() {
  return (
    <Router
      root={(props) => (
        <>
        <MyLayout sidebarContent={"TODO"}>
          <Suspense>{props.children}</Suspense>
         </MyLayout>
        </>
      )}
    >
      <FileRoutes />
    </Router>
  );
}

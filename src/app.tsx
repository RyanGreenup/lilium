import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import Nav from "~/components/Nav";
import "./app.css";
import MyLayout from "~/components/Layout";
import { SQLiteTreeViewWithHoisting } from "./views/NavTree";
import { SidebarTabs } from "~/components/SidebarTabs";

export default function App() {
  return (
    <Router
      root={(props) => (
        <>
        <MyLayout sidebarContent={
          <SidebarTabs 
            filesContent={<SQLiteTreeViewWithHoisting/>}
          />
        }>
          <Suspense>{props.children}</Suspense>
         </MyLayout>
        </>
      )}
    >
      <FileRoutes />
    </Router>
  );
}

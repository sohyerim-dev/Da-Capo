import { Outlet, ScrollRestoration } from "react-router";
import Header from "./Header";
import Footer from "./Footer";
import "./Layout.scss";

export default function Layout() {
  return (
    <>
      <Header />
      <ScrollRestoration />
      <main className="layout-main">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

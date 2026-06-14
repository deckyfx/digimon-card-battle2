import { render } from "solid-js/web";
import { createSignal, createEffect, onCleanup } from "solid-js";
import { App } from "./ui/App";
import { DebugRoute } from "./ui/debug/DebugRoute";
import "./ui/styles.css";

function Root() {
  const [route, setRoute] = createSignal(window.location.pathname);
  const [hash, setHash] = createSignal(window.location.hash);

  createEffect(() => {
    const handleLocationChange = () => {
      setRoute(window.location.pathname);
      setHash(window.location.hash);
    };

    window.addEventListener("popstate", handleLocationChange);
    window.addEventListener("hashchange", handleLocationChange);

    onCleanup(() => {
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("hashchange", handleLocationChange);
    });
  });

  const isDebug = () =>
    route() === "/debug" ||
    hash() === "#/debug" ||
    hash() === "#debug";

  return (
    <>
      {isDebug() ? <DebugRoute /> : <App />}
    </>
  );
}

const root = document.getElementById("root");
if (root) {
  render(() => <Root />, root);
}



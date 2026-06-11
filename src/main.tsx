import { render } from "solid-js/web";
import { App } from "./ui/App";
import "./ui/styles.css";

const root = document.getElementById("root");
if (root) {
  render(() => <App />, root);
}

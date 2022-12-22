import context, { helper2, helper1 } from "./Component/context";
import ChildComponent, { globalExport } from "Component/ChildComponent";
import Component from "./Component";
import globalState from "./Component/ChildComponent/globalState";

import "./Component/ChildComponent/listeners";

import("./Component/ChildComponent/index").then(console.log);

console.log(context, helper2, helper1, Component, ChildComponent, globalExport, globalState);

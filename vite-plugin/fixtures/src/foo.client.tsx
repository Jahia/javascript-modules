import { useEffect } from "react";
import classes from "./foo.module.css";

export default function Foo() {
  useEffect(() => {
    console.log("Foo component mounted");
  });

  return <pre className={classes.pre}>Hello World!</pre>;
}

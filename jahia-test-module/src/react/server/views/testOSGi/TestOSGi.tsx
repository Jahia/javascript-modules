import { jahiaComponent, server } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    nodeType: "javascriptExample:testOSGi",
    name: "default",
    componentType: "view",
  },
  () => {
    return (
      <div>
        <p data-testid="hello">
          {server.osgi.getService("org.example.services.SimpleService").sayHello("World")}
        </p>
        <p data-testid="numbers">
          {server.osgi
            .getService("org.example.services.SimpleService")
            .sortNumbers([4, 3, 2, 1])
            .join(", ")}
        </p>
      </div>
    );
  },
);

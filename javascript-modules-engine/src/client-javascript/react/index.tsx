import * as devalue from "devalue";
import i18next from "i18next";
import type { ComponentType } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import * as v from "valibot";

/**
 * Basic runtime validation for hydration nodes. This will prevent cryptic errors for the end user
 * in case something goes wrong.
 */
const schema = v.object({
  /** Bundle key; module name */
  bundle: v.string(),
  /** JS entry point, import it to get the load function */
  entry: v.string(),
  /** Current language */
  lang: v.string(),
  /** Initial props */
  props: v.looseObject({}),
});

/** Ensures the component is hydrated with the right i18next context */
const ComponentWrapper = ({
  ns,
  lang,
  Component,
  props,
}: {
  /** Namespace string */
  ns: string;
  /** Language string */
  lang: string;
  /** React component */
  Component: ComponentType<{ children?: React.ReactNode }>;
  /** Props object for the app component */
  props: Record<string, unknown>;
}) => {
  i18next.setDefaultNamespace(ns);
  i18next.changeLanguage(lang);

  return (
    <Component {...props}>
      {/* This div is an hydration border: hydration will stop here */}
      <div dangerouslySetInnerHTML={{ __html: "" }} suppressHydrationWarning />
    </Component>
  );
};

/**
 * Turns a hydration data (as a script element) into a ready to insert React component. It takes
 * care of importing the component from the module bundle.
 */
const load = async (element: HTMLElement) => {
  const { entry, bundle, lang, props } = v.parse(schema, devalue.parse(element.textContent));
  const hydrate = element.dataset.hydrationMode === "hydrate";

  const { default: Component } = await import(entry);

  return {
    hydrate,
    component: <ComponentWrapper ns={bundle} lang={lang} Component={Component} props={props} />,
  };
};

/** Hydrates a single React component. */
const hydrateReactComponent = async (script: HTMLScriptElement) => {
  if (script.dataset.hydrated) return;

  try {
    const { hydrate, component } = await load(script);
    if (hydrate) {
      hydrateRoot(script.parentElement, component);
    } else {
      const root = createRoot(script.parentElement);
      root.render(component);
    }
    script.dataset.hydrated = "true";
    console.log(
      "javascript-modules-engine: React component",
      hydrate ? "hydrated" : "rendered",
      // Script is only kept when hydrating, not rendering
      hydrate ? script.nextElementSibling : script.parentElement,
    );
  } catch (error) {
    console.error("Hydration failed for element", script, error);
  }
};

/** Hydrates all React components of `root`. */
export const hydrateReactComponents = (root: HTMLElement) => {
  for (const element of root.querySelectorAll("script[data-hydration-mode]")) {
    hydrateReactComponent(element as HTMLScriptElement);
  }
};

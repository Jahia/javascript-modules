import * as devalue from "devalue";
import i18next from "i18next";
import type { ComponentType } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";

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
      {/* @ts-expect-error This is an hydration border: hydration will stop here */}
      <jsm-children dangerouslySetInnerHTML={{ __html: "" }} suppressHydrationWarning />
    </Component>
  );
};

/**
 * Turns a hydration data (as a script element) into a ready to insert React component. It takes
 * care of importing the component from the module bundle.
 */
const load = async (element: HTMLElement) => {
  const entry = element.dataset.src;
  const lang = element.dataset.lang;
  const bundle = element.dataset.bundle;

  if (!entry || !lang || !bundle) {
    throw new Error("Missing required data attributes on the hydration element.");
  }

  const rawProps = element.querySelector("script[type='application/json']")?.textContent;
  const props = rawProps ? devalue.parse(rawProps) : {};
  const hydrate = !element.dataset.clientOnly;

  const { default: Component } = await import(entry);

  return {
    hydrate,
    component: <ComponentWrapper ns={bundle} lang={lang} Component={Component} props={props} />,
  };
};

/** Hydrates a single React component. */
const hydrateReactComponent = async (root: HTMLElement) => {
  if (root.dataset.hydrated) return;

  try {
    const { hydrate, component } = await load(root);
    if (hydrate) {
      hydrateRoot(root, component);
    } else {
      createRoot(root).render(component);
    }
    root.dataset.hydrated = "true";
  } catch (error) {
    console.error("Hydration failed for element", root, error);
  }
};

/** Hydrates all React components on the page. */
for (const element of document.querySelectorAll("jsm-island")) {
  hydrateReactComponent(element as HTMLElement);
}

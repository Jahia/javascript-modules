import * as devalue from "devalue";
import i18n from "i18next";
import { createElement, useCallback, type ComponentType, type ReactNode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";

/**
 * Children of client-only islands: the server-rendered `holder` content is moved (not copied) into
 * the rendered `jsm-children` element, preserving DOM state and nested islands. It is moved back to
 * `holder` on unmount, to be re-attached on the next mount.
 */
const AdoptedChildren = ({ holder }: { holder: HTMLElement }) => {
  const ref = useCallback(
    (element: HTMLElement) => {
      element.append(...holder.childNodes);
      return () => {
        holder.append(...element.childNodes);
      };
    },
    [holder],
  );
  return createElement("jsm-children", { style: { display: "contents" }, ref });
};

/** Ensures the component is hydrated with the right i18next context */
const ComponentWrapper = ({
  ns,
  lang,
  Component,
  props,
  children,
}: {
  /** Namespace string */
  ns: string;
  /** Language string */
  lang: string;
  /** React component */
  Component: ComponentType<{ children?: React.ReactNode }>;
  /** Props object for the app component */
  props: Record<string, unknown>;
  /** Server-rendered children */
  children: ReactNode;
}) => {
  // Not thread-safe if multiple hydrated components use different languages on the same page.
  // But assumes a single language per page, so i18n.changeLanguage(lang) is safe in this context.
  i18n.changeLanguage(lang);
  return (
    <I18nextProvider i18n={i18n} defaultNS={ns}>
      <Component {...props}>{children}</Component>
    </I18nextProvider>
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

  const rawProps = element.querySelector(":scope > script[type='application/json']")?.textContent;
  const props = rawProps ? devalue.parse(rawProps) : {};
  // React renders `data-client-only={true}` as `data-client-only=""` on custom elements
  const hydrate = !element.hasAttribute("data-client-only");

  const { default: Component } = await import(entry);

  let children: ReactNode;
  if (hydrate) {
    children = createElement("jsm-children", {
      dangerouslySetInnerHTML: { __html: "" },
      suppressHydrationWarning: true,
    });
  } else {
    // Keep a reference to the server-rendered children: React will detach them when clearing the
    // island, and they will be moved into the component in the same commit (no flash of content)
    const holder =
      element.querySelector<HTMLElement>(":scope > jsm-children") ??
      document.createElement("jsm-children");
    children = <AdoptedChildren holder={holder} />;
  }

  return {
    hydrate,
    component: (
      <ComponentWrapper ns={bundle} lang={lang} Component={Component} props={props}>
        {children}
      </ComponentWrapper>
    ),
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
    console.error("<Island> failed to load", root, error);
  }
};

/** Hydrates all React components on the page. */
for (const element of document.querySelectorAll("jsm-island")) {
  hydrateReactComponent(element as HTMLElement);
}

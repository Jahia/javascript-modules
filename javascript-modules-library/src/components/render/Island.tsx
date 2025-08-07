import * as devalue from "devalue";
import i18n from "i18next";
import { createElement, type ComponentType, type ReactNode, type JSX } from "react";
import { I18nextProvider } from "react-i18next";
import sharedLibFiles from "virtual:shared-lib-files";
import { useServerContext } from "../../hooks/useServerContext.js";
import { buildModuleFileUrl } from "../../utils/urlBuilder/urlBuilder.js";
import { AddResources } from "../AddResources.js";

/**
 * This component creates an island of interactivity on the page, following the [Island
 * Architecture](https://www.jahia.com/blog/leveraging-the-island-architecture-in-jahia-cms)
 * paradigm.
 *
 * ```tsx
 * <Island component={MyComponent} props={{ foo: "bar" }}>
 *   <div>If MyComponent takes children, it will receive them here.</div>
 * </Island>;
 * ```
 *
 * It takes an optional `clientOnly` prop:
 *
 * - By default or when set to `false`, the component will be rendered on the server and hydrated in
 *   the browser. In this case, children are passed to the component.
 * - When set to `true`, the component will be rendered only in the browser, skipping the server-side
 *   rendering step. This is useful for components that cannot be rendered on the server. In this
 *   case, children are used as a placeholder until the component is hydrated.
 */
// @ts-expect-error TS complains that the signature does not match the implementation, but it does
export function Island<Props>({}: {
  /** The React component to render. */
  component: ComponentType<Props>;
} & (keyof Omit<Props, "children"> extends never
  ? {
      props?: never; // If the component has no properties (other than children), none can be passed
    }
  : Omit<Props, "children"> extends Required<Omit<Props, "children">>
    ? {
        // If at least one property of component are mandatory, they must be passed
        /** Props to forward to the component. */
        props: Omit<Props, "children">;
      }
    : {
        // If all properties of component are optional, they may be passed or not
        /** Props to forward to the component. */
        props?: Omit<Props, "children">;
      }) &
  (Props extends { children: infer Children }
    ? // If the component has mandatory children, it cannot be client-only
      {
        /**
         * If false or undefined, the component will be rendered on the server. If true, server-side
         * rendering will be skipped.
         */
        clientOnly?: false;
        /** The children to render inside the component. */
        children: Children;
      }
    : Props extends { children?: infer Children }
      ? // If the component has optional children, it may be client-only or not
        | {
              // In SSR mode, the children are passed to the component and must be of the correct type
              /**
               * If false or undefined, the component will be rendered on the server. If true,
               * server-side rendering will be skipped.
               */
              clientOnly?: false;
              /** The children to render inside the component. */
              children?: Children;
            }
          | {
              // In CSR mode, the children are used as a placeholder and may be of any type
              /**
               * If false or undefined, the component will be rendered on the server. If true,
               * server-side rendering will be skipped.
               */
              clientOnly: true;
              /** Placeholder content until the component is rendered on the client. */
              children?: ReactNode;
            }
      : // If the component has no children, it may be client-only or not
        | {
              // In SSR mode, the component cannot have children
              /**
               * If false or undefined, the component will be rendered on the server. If true,
               * server-side rendering will be skipped.
               */
              clientOnly?: false;
              // Prevent children from being passed to the component
              children?: never;
            }
          | {
              // In CSR mode, the children are used as a placeholder and may be of any type
              /**
               * If false or undefined, the component will be rendered on the server. If true,
               * server-side rendering will be skipped.
               */
              clientOnly: true;
              /** Placeholder content until the component is rendered on the client. */
              children?: ReactNode;
            })): ReactNode;

// We use an overload rather than a single function because some props (e.g. children) are not always defined
export function Island({
  component: Component,
  props,
  clientOnly,
  children,
}: Readonly<{
  component: ComponentType;
  props?: any;
  clientOnly?: boolean;
  children?: ReactNode;
}>): ReactNode {
  const { bundleKey, currentResource } = useServerContext();
  const language = currentResource.getLocale().getLanguage();

  /** Base path to all javascript-modules-engine resources. */
  const base = buildModuleFileUrl("javascript", { moduleName: "javascript-modules-engine" });

  /** JS entry point to the client bundle loader. */
  // @ts-expect-error __filename is added by the vite plugin
  const entry = buildModuleFileUrl(`${Component.__filename}.js`);

  /**
   * All translations that can be used by the component on the client side. (only ship the current
   * language)
   */
  const i18nResourceBundle = i18n.getResourceBundle(language, bundleKey);

  return (
    <>
      <AddResources
        key="jsm-island-head"
        insert
        targetTag="head"
        inlineResource={
          /* HTML */ `${
              /**
               * Module preload hints for shared libraries, deep in the dependency tree
               *
               * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/modulepreload
               */
              sharedLibFiles
                .map((file) => `<link rel="modulepreload" href="${base}/shared-libs/${file}" />`)
                .join("")
            }
            <script type="importmap">
              ${JSON.stringify({
                /**
                 * Import map to allow bare identifiers (e.g. `import { useState } from "react"`) to
                 * be imported from our bundle in the browser.
                 *
                 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap
                 */
                imports: {
                  // Explicitly exposed:
                  "react": `${base}/shared-libs/react.js`,
                  "i18next": `${base}/shared-libs/i18next.js`,
                  "react-i18next": `${base}/shared-libs/react-i18next.js`,
                  // Implicitly exposed, referenced after compilation:
                  "react/jsx-runtime": `${base}/shared-libs/react/jsx-runtime.js`,
                  // For internal use:
                  "react-dom/client": `${base}/shared-libs/react-dom/client.js`,
                },
              })}
            </script>`
        }
      />
      <AddResources
        key={`jsm-preload-${entry}`}
        insert
        targetTag="head"
        inlineResource={`<link rel="modulepreload" href="${entry}" />`}
      />
      {i18nResourceBundle && (
        <AddResources
          key={`jsm-i18n-${bundleKey}`}
          insert
          targetTag="head"
          inlineResource={
            /* HTML */ `<script type="application/json" data-i18n-store="${bundleKey}">
              ${devalue.stringify({ [language]: i18nResourceBundle })}
            </script>`
          }
        />
      )}
      <AddResources
        key="jsm-bootstrap"
        insert
        targetTag="body"
        inlineResource={`<script type="module" src="${base}/index.js"></script>`}
      />

      {
        // We use a custom element to create the hydration marker, rather than a div or a span,
        // to prevent a broken DOM structure in the browser. (e.g. a `<div>` inside a `<p>`)
        createElement("jsm-island", {
          "style": { display: "contents" },
          "data-client-only": clientOnly ? true : undefined,
          "data-src": entry,
          "data-lang": language,
          "data-bundle": bundleKey,
          "children": [
            props !== undefined && (
              <script type="application/json">{devalue.stringify(props)}</script>
            ),
            clientOnly ? (
              children
            ) : (
              <I18nextProvider i18n={i18n}>
                <Component {...props}>
                  {createElement("jsm-children", { style: { display: "contents" }, children })}
                </Component>
              </I18nextProvider>
            ),
          ],
        })
      }
    </>
  );
}

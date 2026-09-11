/// <reference types="vite/client" />
import {
  jahiaComponent,
  server,
  buildEndpointUrl,
  buildModuleFileUrl,
  buildNodeUrl,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import goat from "./goat.png";

jahiaComponent(
  {
    nodeType: "javascriptExample:testUrl",
    name: "default",
    displayName: "test buildUrl",
    componentType: "view",
  },
  (_, { currentResource, renderContext, jcrSession }) => {
    const imageNodeRef = currentResource.getNode().hasProperty("image")
      ? currentResource.getNode().getProperty("image").getValue().getNode()
      : undefined;
    if (imageNodeRef) {
      server.render.addCacheDependency({ path: imageNodeRef.getPath() }, renderContext);
    }

    const linkNodeRef = currentResource.getNode().hasProperty("linknode")
      ? currentResource.getNode().getProperty("linknode").getValue().getNode()
      : undefined;
    if (linkNodeRef) {
      server.render.addCacheDependency({ path: linkNodeRef.getPath() }, renderContext);
    }

    // An external provider (Keepeek, for one) answers getUrl() with a URL on the DAM's own host.
    // No such provider is mounted here, so this stands in for one: it is the only part of the node
    // buildNodeUrl reads once autocollectDependency is off.
    const externalProviderNode = {
      getUrl: () => "https://media.keepeek.test/asset/1234.jpg",
    } as unknown as JCRNodeWrapper;

    return (
      <>
        <h3>Url helper testing component</h3>

        {imageNodeRef && (
          <div data-testid="image_reference">
            <img height="150" src={buildNodeUrl(imageNodeRef)} alt="image" />
          </div>
        )}

        <div data-testid="image_static_resource">
          <img height="150" src={buildModuleFileUrl("static/images/goat.jpg")} alt="goat" />
        </div>

        <div data-testid="image_static_resource_with_module_name">
          <img
            height="150"
            src={buildModuleFileUrl("static/images/goat.jpg", {
              moduleName: "javascript-modules-engine-test-module",
            })}
            alt="goat_module_name"
          />
        </div>

        <div data-testid="image_static_resource_endpoint">
          <img
            height="150"
            src={buildEndpointUrl(
              "/modules/javascript-modules-engine-test-module/static/images/goat.jpg",
            )}
            alt="goat_endpoint"
          />
        </div>

        <div data-testid="image_static_resource_absolute">
          {/* We use data-url to avoid Jahia from stripping the host in href/src */}
          <span data-url={buildModuleFileUrl("static/images/goat.jpg", { absolute: true })}>
            goat - absolute
          </span>
        </div>

        <div data-testid="endpoint_absolute">
          <span data-url={buildEndpointUrl("/graphql", { absolute: true })}>
            endpoint - absolute
          </span>
        </div>

        <div data-testid="endpoint_absolute_origin">
          <span data-url={buildEndpointUrl("/graphql", { absolute: "https://origin.test/" })}>
            endpoint - absolute with an explicit origin
          </span>
        </div>

        <div data-testid="external_provider_absolute">
          <span
            data-url={buildNodeUrl(externalProviderNode, {
              absolute: true,
              autocollectDependency: false,
            })}
          >
            external provider - absolute must not double the origin
          </span>
        </div>

        <div data-testid="image_base64">
          <img height="32" src={buildModuleFileUrl(goat)} alt="goat_base64" />
        </div>

        {linkNodeRef && (
          <>
            <div data-testid="content_link">
              <a href={buildNodeUrl(linkNodeRef)}>content link - current context</a>
            </div>
            <div data-testid="content_link_mode_edit">
              <a
                href={buildNodeUrl(linkNodeRef, {
                  mode: "edit",
                })}
              >
                content link - edit
              </a>
            </div>
            <div data-testid="content_link_mode_preview">
              <a
                href={buildNodeUrl(linkNodeRef, {
                  mode: "preview",
                })}
              >
                content link - preview
              </a>
            </div>
            <div data-testid="content_link_mode_live">
              <a
                href={buildNodeUrl(linkNodeRef, {
                  mode: "live",
                })}
              >
                content link - live
              </a>
            </div>
            <div data-testid="content_link_language_fr">
              <a
                href={buildNodeUrl(linkNodeRef, {
                  language: "fr",
                })}
              >
                content link - FR
              </a>
            </div>
            <div data-testid="content_link_parameters">
              <a
                href={buildNodeUrl(linkNodeRef, {
                  parameters: { param1: "value1", param2: "value2" },
                })}
              >
                content link - parameters
              </a>
            </div>
            <div data-testid="content_link_absolute">
              <span data-url={buildNodeUrl(linkNodeRef, { absolute: true })}>absolute</span>
            </div>
            <div data-testid="content_link_absolute_origin">
              <span data-url={buildNodeUrl(linkNodeRef, { absolute: "https://origin.test/" })}>
                absolute with an explicit origin
              </span>
            </div>
            <div data-testid="content_link_absolute_language_fr">
              <span data-url={buildNodeUrl(linkNodeRef, { absolute: true, language: "fr" })}>
                absolute FR
              </span>
            </div>
            <div data-testid="og_url_absolute">
              <meta property="og:url" content={buildNodeUrl(linkNodeRef, { absolute: true })} />
            </div>
            <div data-testid="action_url">
              <a
                href={buildNodeUrl(linkNodeRef, {
                  extension: ".myAction.do",
                })}
              >
                action link
              </a>
            </div>
          </>
        )}
        <div data-testid="fragment_link">
          <a
            href={buildNodeUrl(
              jcrSession.getNode("/sites/javascriptTestSite/home/testUrl/pagecontent/test"),
              {
                extension: ".html.ajax",
              },
            )}
          >
            fragment link
          </a>
        </div>
      </>
    );
  },
);

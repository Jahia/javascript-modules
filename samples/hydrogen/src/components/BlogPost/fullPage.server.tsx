import { AbsoluteArea, jahiaComponent } from "@jahia/javascript-modules-library";
import type { Props } from "./types.js";
import classes from "./component.module.css";
import { SmallHeroSection } from "../Hero/Section/small.server.jsx";
import { buildNodeUrl } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "hydrogen:blogPost",
    displayName: "Blog Post",
    name: "fullPage",
  },
  (
    { "jcr:title": title, subtitle, authors, publicationDate, cover, body }: Props,
    { currentResource, renderContext },
  ) => (
    <>
      <SmallHeroSection title={title} subtitle={subtitle} background={cover} />
      <main className={classes.main}>
        <header>
          <p>
            Written {authors && authors.length > 0 && <>by {authors.join(", ")} </>}
            {publicationDate && (
              <>
                on{" "}
                {new Date(publicationDate).toLocaleDateString(
                  currentResource.getLocale().toString(),
                  { dateStyle: "long" },
                )}
              </>
            )}
          </p>
        </header>
        <article dangerouslySetInnerHTML={{ __html: body }} />
        <footer>
          <p>
            <a href={buildNodeUrl(renderContext.getSite().getNode("blog"))}>Back to blog home</a>
          </p>
        </footer>
      </main>
      <AbsoluteArea name="footer" parent={renderContext.getSite()} nodeType="hydrogen:footer" />
    </>
  ),
);

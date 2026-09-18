import { buildNodeUrl, jahiaComponent, JImage } from "@jahia/javascript-modules-library";
import type { Props } from "./types.js";
import classes from "./component.module.css";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "hydrogen:blogPost",
    displayName: "Blog Post",
  },
  (
    { "jcr:title": title, subtitle, authors, cover, publicationDate }: Props,
    { currentNode, currentResource },
  ) => {
    return (
      <article className={classes.card}>
        {/* cover's `jcr:title` property will be used as alt text */}
        <JImage src={cover} />
        <h3>
          <a href={buildNodeUrl(currentNode)}>{title}</a>
        </h3>
        <p>{subtitle}</p>
        <p>
          Written {authors && authors.length > 0 && <>by {authors.join(", ")} </>}
          {publicationDate && (
            <>
              on{" "}
              {new Date(publicationDate).toLocaleDateString(
                currentResource.getLocale().toString(),
                {
                  dateStyle: "long",
                },
              )}
            </>
          )}
        </p>
      </article>
    );
  },
);

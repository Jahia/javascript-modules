import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
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
        <img src={buildNodeUrl(cover)} alt="" />
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

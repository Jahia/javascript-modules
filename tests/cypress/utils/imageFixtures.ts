/**
 * The image fixtures the image suite uploads, and the intrinsic dimensions Jahia stores for each as
 * `j:width` / `j:height`. The srcset logic branches on where a width falls relative to
 * `defaultSrcSet` ([2048, 1680, 1366, 724, 424, 376]), so each fixture sits on a different side of
 * it — the limit values are the point.
 */
export const IMAGES = {
  /** Wider than every default width: the candidate set is capped and the original never offered. */
  large: { file: "image.jpg", width: 2832, height: 4240 },
  /** Exactly the largest default width: the boundary the filter must keep, not drop. */
  exact: { file: "image-2048.jpg", width: 2048, height: 3066 },
  /** Narrower than every default width: only one candidate survives, so none is offered. */
  small: { file: "image-small.jpg", width: 300, height: 200 },
} as const;

/** The widths `getImageProps` offers when the caller asks for none. */
export const DEFAULT_SRCSET = [2048, 1680, 1366, 724, 424, 376];

/**
 * An SVG is an image like any other to Jahia; its mime type is what routes it to the vector branch,
 * where the resize channel has nothing to offer.
 */
export const VECTOR_FILE = "image.svg";

export const uploadImage = (parentPath: string, name: string, fixture: string) => {
  cy.fixture(`testData/${fixture}`, "binary").then((binary) => {
    const blob = Cypress.Blob.binaryStringToBlob(binary, "image/jpeg");
    cy.apollo({
      mutationFile: "graphql/jcrUploadFile.graphql",
      variables: {
        path: parentPath,
        name,
        mimeType: "image/jpeg",
        file: new File([blob], name, { type: blob.type }),
      },
    });
  });
};

export const uploadText = (
  parentPath: string,
  name: string,
  contents: string,
  mimeType: string,
) => {
  const blob = new Blob([contents], { type: mimeType });
  cy.apollo({
    mutationFile: "graphql/jcrUploadFile.graphql",
    variables: {
      path: parentPath,
      name,
      mimeType,
      file: new File([blob], name, { type: mimeType }),
    },
  });
};

/** Uploads the SVG fixture as text, which is what it is. */
export const uploadVector = (parentPath: string, name: string) => {
  cy.fixture(`testData/${VECTOR_FILE}`, "utf-8").then((svg: string) => {
    uploadText(parentPath, name, svg, "image/svg+xml");
  });
};

/** The `jcr:title` an omitted `alt` falls back to. */
export const setTitle = (pathOrId: string, title: string) => {
  cy.apollo({
    mutationFile: "graphql/setProperties.graphql",
    variables: {
      pathOrId,
      properties: [{ name: "jcr:title", value: title, language: "en" }],
    },
  });
};

/** The `2048w` / `4x` descriptor of each candidate, in the order the attribute lists them. */
export const descriptors = (srcSet: string | undefined): string[] =>
  srcSet === undefined ? [] : srcSet.split(", ").map((candidate) => candidate.split(" ").pop()!);

/** The URL of each candidate, in the order the attribute lists them. */
export const candidateUrls = (srcSet: string | undefined): string[] =>
  srcSet === undefined ? [] : srcSet.split(", ").map((candidate) => candidate.split(" ")[0]);

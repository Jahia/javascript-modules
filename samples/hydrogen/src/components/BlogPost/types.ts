import type { JCRNodeWrapper } from "org.jahia.services.content";

export type Props = {
  "jcr:title": string;
  "subtitle": string;
  "authors"?: string[];
  "cover": JCRNodeWrapper;
  "body": string;
  "publicationDate": string;
};

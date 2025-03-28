import type { JCRNodeWrapper } from "org.jahia.services.content";

/** Properties defined in ./definition.cnd */
export interface Props {
  title: string;
  subtitle: string;
  background: JCRNodeWrapper;
}

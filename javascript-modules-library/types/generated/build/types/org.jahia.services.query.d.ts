declare module 'org.jahia.services.query' {
import { JCRNodeIteratorWrapper } from 'org.jahia.services.content';
import { Value } from 'javax.jcr';
/**
 * Wrapper for the JCR {@link QueryResult} adding facets and other methods.
 *
 * @author Thomas Draier
*/
export class QueryResultWrapper {
  getApproxCount(): number;
  /**
   * Returns an iterator over all nodes that match the query. The nodes are
   * returned according to the ordering specified in the query.
   *
   * @return a NodeIterator
   * @throws RepositoryException if the query contains more than one selector,
   *                             if this call is the second time either getRows or
   *                             getNodes has been called on the same
   *                             QueryResult object or if another error occurs.
  */
  getNodes(): JCRNodeIteratorWrapper;
}
/**
 * An implementation of the JCR {@link Query} for multiple providers.
 *
 * @author Thomas Draier
*/
export class QueryWrapper {
  execute(): QueryResultWrapper;
  setLimit(limit: number): void;
  setOffset(offset: number): void;
  bindValue(varName: string, value: Value): void;
}

}

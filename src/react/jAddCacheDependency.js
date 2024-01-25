import {useServerContext} from './ServerContext';
import {server} from '@jahia/js-server-engine-private';

/**
 * Add a cache dependency tag to the current rendering
 * @param {Object} props the properties
 * @param {Object} [props.node] the node (JCRNodeWrapper) for which to add a dependency to
 * @param {Object} [props.path] the path for which to add a dependency to
 */
export default ({...props}) => {
    const {renderContext} = useServerContext();
    server.render.addCacheDependencyTag(props, renderContext);
};

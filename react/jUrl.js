import {useServerContext} from './ServerContext';
import {buildUrl} from '../urlBuilder';

/**
 * Build a URL
 * @param {Object} props the properties to use to build the URL
 * @param {string} props.value the value to use to build the URL
 * @param {string} props.path the path of the resource to build the URL for
 * @returns {string} the URL
 */
export default ({...props}) => {
    const {currentResource, renderContext} = useServerContext();
    return buildUrl(props, renderContext, currentResource);
};

import {useServerContext} from './ServerContext';
import {buildUrl} from '../urlBuilder';

/**
 * Generates a URL using a value or a node path to be used in views.
 * @param {Object} props
 * @param {string} props.value the value to use to build the URL
 * @param {string} props.path the path of the resource to build the URL for
 * @param {Object} props.parameters the parameters to append to the URL
 * @param {string} props.mode the mode to use to build the URL
 * @param {string} props.language the language to use to build the URL
 * @param {string} props.extension the extension to use to build the URL
 * @returns {string} - The generated URL, to be used in views.
 */
export default ({...props}) => {
    const {currentResource, renderContext} = useServerContext();
    return buildUrl(props, renderContext, currentResource);
};

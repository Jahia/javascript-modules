import {useServerContext} from './useServerContext';
import {buildUrl as originalBuildUrl} from '../utils/urlBuilder';

/**
 * @typedef {Object} UrlBuilderType
 * @property {function({assetPath: string, moduleName?: string, parameters?: object}): string} buildStaticUrl
 */

/**
 * @returns {UrlBuilderType}
 */
export function useUrlBuilder() {
    const {renderContext, currentResource} = useServerContext();

    /**
     * Builds a static URL for an asset.
     * @param {object} props - The properties for building the URL
     * @param {string} props.moduleName - The name of the module used as prefix for the URL. If not provided, the current module is used.
     * @param {string} props.assetPath - The path of the asset
     * @param {object} [props.parameters] - The parameters to append to the URL
     * @returns {string} The built URL.
     */
    const buildStaticUrl = ({
        assetPath,
        moduleName = renderContext?.getURLGenerator()?.getCurrentModule(),
        parameters = undefined
    }) => {
        let value = moduleName + '/static' + (assetPath?.startsWith('/') ? '' : '/') + assetPath;
        return originalBuildUrl({
            value: value,
            parameters: parameters
        }, renderContext, currentResource);
    };

    return {
        buildStaticUrl
    };
}

import {useServerContext} from './useServerContext';
import {buildUrl as originalBuildUrl} from '../utils/urlBuilder';

/**
 * @typedef {Object} UrlBuilderType
 * @property {function({assetPath: string, moduleName?: string, parameters?: object}): string} buildStaticUrl
 * @property {function({nodePath: string, extension?: string, language?:string, mode?:string, parameters?: object}): string} buildNodeUrl
 * @property {function({nodePath: string, extension?: string, language?:string, mode?:string, parameters?: object}): string} buildHtmlFragmentUrl
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

    /**
     * Builds a URL for a JCR node
     * @param {object} props - The properties for building the URL
     * @param {string} props.nodePath - The path of JCR node
     * @param {string} [props.mode] the mode to use to build the URL ('edit', 'preview', 'live')
     * @param {string} [props.language] the language to use to build the URL
     * @param {string} [props.extension] the extension to use to build the URL
     * @param {object} [props.parameters] - The parameters to append to the URL
     * @returns {string} The built URL.
     */
    const buildNodeUrl = ({
        nodePath,
        extension,
        language,
        mode,
        parameters
    }) => {
        return originalBuildUrl({
            path: nodePath,
            extension: extension,
            language: language,
            mode: mode,
            parameters: parameters
        }, renderContext, currentResource);
    };

    /**
     * Builds an HTML fragment URL for a JCR node
     * @param {object} props - The properties for building the URL
     * @param {string} props.nodePath - The path of JCR node
     * @param {string} [props.mode] the mode to use to build the URL ('edit', 'preview', 'live')
     * @param {string} [props.language] the language to use to build the URL
     * @param {string} [props.extension] the extension to use to build the URL
     * @param {object} [props.parameters] - The parameters to append to the URL
     * @returns {string} The built URL.
     */
    const buildHtmlFragmentUrl = ({
        nodePath,
        extension,
        language,
        mode,
        parameters
    }) => {
        return buildNodeUrl({nodePath, extension, language, mode, parameters}) + '.ajax';
    };

    return {
        buildStaticUrl,
        buildNodeUrl,
        buildHtmlFragmentUrl
    };
}

import {useServerContext} from './useServerContext';
import {buildUrl as originalBuildUrl} from '../utils/urlBuilder/urlBuilder';

interface UrlBuilderType {
    /** Builds a static URL for an asset. */
    buildStaticUrl({assetPath, moduleName, parameters}: {assetPath: string; moduleName?: string; parameters?: Record<string, string>; }): string;
    /** Builds a URL for a JCR node. */
    buildNodeUrl({nodePath, extension, language, mode, parameters}: {nodePath: string; extension?: string; language?: string; mode?: string; parameters?: Record<string, string>; }): string;
    /** Builds an HTML fragment URL for a JCR node. */
    buildHtmlFragmentUrl({nodePath, language, mode, parameters}: {nodePath: string; language?: string; mode?: string; parameters?: Record<string, string>; }): string;
}

export function useUrlBuilder(): UrlBuilderType {
    const {renderContext, currentResource} = useServerContext();

    return {
        buildStaticUrl({
            assetPath,
            moduleName = renderContext?.getURLGenerator()?.getCurrentModule(),
            parameters = undefined
        }) {
            return originalBuildUrl({
                value: moduleName + '/static' + (assetPath?.startsWith('/') ? '' : '/') + assetPath,
                parameters
            }, renderContext, currentResource);
        },
        buildNodeUrl({
            nodePath,
            extension,
            language,
            mode,
            parameters
        }) {
            return originalBuildUrl({
                path: nodePath,
                extension,
                language,
                mode,
                parameters
            }, renderContext, currentResource);
        },
        buildHtmlFragmentUrl({
            nodePath,
            language,
            mode,
            parameters
        }) {
            return this.buildNodeUrl({nodePath, extension: '.html.ajax', language, mode, parameters});
        }
    };
}

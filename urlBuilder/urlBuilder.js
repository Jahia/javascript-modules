import getNodeFromPathOrId from '../utils/getNodeFromPathOrId';
import {render, registry} from '@jahia/server-helpers';

const absoluteUrlRegExp = /^(?:[a-z+]+:)?\/\//i;

const finalizeUrl = (url, renderContext) => {
    if (!absoluteUrlRegExp.test(url)) {
        url = url.startsWith('/') ? renderContext.getRequest().getContextPath() + url : url;
        return renderContext.getResponse().encodeURL(url);
    }

    return url;
};

function appendParameters(url, parameters) {
    const separator = url.includes('?') ? '&' : '?';
    const URLParameters = Object.keys(parameters)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(parameters[key])}`)
        .join('&');

    return `${url}${separator}${URLParameters}`;
}

/**
 * Initialize the registry with default url builders
 */
export const initUrlBuilder = () => {
    registry.add('urlBuilder', 'nt:file', {
        priority: 1,
        buildURL: ({jcrNode, mode, currentResource}) => {
            let workspace = mode ?
                ((mode === 'edit' || mode === 'preview') ? 'default' : 'live') :
                currentResource.getWorkspace();
            return '/files/' + workspace + render.escapePath(jcrNode.getCanonicalPath());
        }
    });
    registry.add('urlBuilder', '*', {
        priority: 0,
        buildURL: ({jcrNode, mode, language, extension, renderContext, currentResource}) => {
            let workspace;
            let servletPath;
            if (mode) {
                switch (mode) {
                    case 'edit':
                        servletPath = '/cms/edit';
                        workspace = 'default';
                        break;
                    case 'preview':
                        servletPath = '/cms/render';
                        workspace = 'default';
                        break;
                    default:
                        servletPath = '/cms/render';
                        workspace = 'live';
                        break;
                }
            } else {
                servletPath = renderContext.getServletPath();
                workspace = currentResource.getWorkspace();
            }

            return servletPath + '/' + workspace + '/' + (language ? language : currentResource.getLocale().toString()) +
                render.escapePath(jcrNode.getPath()) + (extension ? extension : '.html');
        }
    });
};

/**
 * Provide URL generation for contents/files
 *
 * @param props props used to build the URL (path, value, mode, language, extension, parameters)
 * @param renderContext the current renderContext
 * @param currentResource the current resource
 * @returns {*} the final URL
 */
export const buildUrl = (props, renderContext, currentResource) => {
    let url;
    if (props.path) {
        let jcrNode;
        try {
            jcrNode = getNodeFromPathOrId({path: props.path}, currentResource.getNode().getSession());
        } catch (_) {
            // Node not found
        }

        if (jcrNode) {
            const urlBuilders = registry.find({type: 'urlBuilder'}, 'priority');
            for (const urlBuilder of urlBuilders) {
                if (urlBuilder.key === '*' || jcrNode.isNodeType(urlBuilder.key)) {
                    url = urlBuilder.buildURL({
                        jcrNode,
                        mode: props.mode,
                        language: props.language,
                        extension: props.extension,
                        renderContext,
                        currentResource
                    });
                    break;
                }
            }
        }
    } else if (props.value) {
        url = props.value;
    } else {
        console.warn('Missing parameter to build url, please provide either a content path using \'path\' parameter, ' +
            'or a prebuild valid url using \'value\' parameter');
    }

    if (url) {
        // Handle parameters
        if (props.parameters && Object.prototype.toString.call(props.parameters) === '[object Object]') {
            url = appendParameters(url, props.parameters);
        }

        // Finalize URL (add context, encodeURL)
        return finalizeUrl(url, renderContext);
    }

    console.warn('Unable to build url for: ' + JSON.stringify(props));
};

import {getNodeFromPathOrId} from '../utils/getNodeFromPathOrId';
import {server} from '@jahia/js-server-core-private';

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
export function initUrlBuilder() {
    server.registry.add('urlBuilder', 'nt:file', {
        priority: 1,
        buildURL: ({jcrNode, mode, currentResource}) => {
            let workspace = mode ?
                ((mode === 'edit' || mode === 'preview') ? 'default' : 'live') :
                currentResource.getWorkspace();
            return '/files/' + workspace + server.render.escapePath(jcrNode.getCanonicalPath());
        }
    });
    server.registry.add('urlBuilder', '*', {
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
                server.render.escapePath(jcrNode.getPath()) + (extension ? extension : '.html');
        }
    });
}

/**
 * Provide URL generation for contents/files
 * @param {Object} props props used to build the URL
 * @param {string} props.value the value to use to build the URL
 * @param {string} props.path the path of the resource to build the URL for
 * @param {Object} props.parameters the parameters to append to the URL
 * @param {string} props.mode the mode to use to build the URL
 * @param {string} props.language the language to use to build the URL
 * @param {string} props.extension the extension to use to build the URL
 * @param {Object} renderContext the current renderContext
 * @param {Object} currentResource the current resource
 * @returns {string} the final URL
 */
export function buildUrl(props, renderContext, currentResource) {
    let url;
    if (props.path) {
        let jcrNode;
        try {
            jcrNode = getNodeFromPathOrId({path: props.path}, currentResource.getNode().getSession());
        } catch (_) {
            console.warn(`Unable to find node for path: ${props.path}\n Replacing by #`);
            return '#';
        }

        if (jcrNode) {
            const urlBuilders = server.registry.find({type: 'urlBuilder'}, 'priority');
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
            'or a prebuild valid url using \'value\' parameter\n replacing by #');
        return '#';
    }

    if (url) {
        // Handle parameters
        if (props.parameters && Object.prototype.toString.call(props.parameters) === '[object Object]') {
            url = appendParameters(url, props.parameters);
        }

        // Finalize URL (add context, encodeURL)
        return finalizeUrl(url, renderContext);
    }

    console.warn(`Unable to build url for: ${JSON.stringify(props)}\n Replacing by #`);
    return '#';
}

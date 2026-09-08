package org.jahia.modules.javascript.modules.engine.jsengine;

import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRSessionWrapper;
import org.jahia.services.content.nodetypes.ExtendedPropertyDefinition;
import org.jahia.services.render.RenderContext;

import javax.jcr.*;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Maps JSON structures into virtual JCR nodes. This is used by userland code
 * through the <code>&lt;Render></code> component:
 * <code>&lt;Render content={{ nodeType: "nt:thing", properties: { foo: "bar" } }} /></code>.
 */
public class JSNodeMapper {
    /**
     * Transform a JS node into a virtual JCR Node
     * "Virtual" because this node is not meant to be saved, it will be used by
     * Jahia rendering system to be rendered only.
     *
     * @param jsonNode      the JS Node
     * @param session       the current session
     * @param renderContext the current renderContext
     * @return the unsaved "Virtual" JCR Node instance
     * @throws RepositoryException in case something bad happens related to JCR
     */
    public static JCRNodeWrapper toVirtualNode(Map<String, ?> jsonNode, JCRSessionWrapper session,
            RenderContext renderContext) throws RepositoryException {
        JCRNodeWrapper parent = jsonNode.containsKey("parent") ? session.getNode((String) jsonNode.get("parent"))
                : session.getNode("/");
        return toVirtualNode(jsonNode, parent, renderContext);
    }

    private static JCRNodeWrapper toVirtualNode(Map<String, ?> jsonNode, JCRNodeWrapper parent,
            RenderContext renderContext) throws RepositoryException {
        JCRSessionWrapper session = parent.getSession();
        Locale locale = renderContext.getMainResource().getLocale();
        // TODO: stop support temp-node name
        String name = jsonNode.containsKey("name") ? (String) jsonNode.get("name") : "temp-node";
        JCRNodeWrapper node = parent.addNode(name, (String) jsonNode.get("nodeType"));

        // handle mixins
        if (jsonNode.containsKey("mixins")) {
            Object mixins = jsonNode.get("mixins");
            if (mixins instanceof String) {
                node.addMixin((String) mixins);
            } else if (mixins instanceof List<?>) {
                for (Object mixinName : (List<?>) mixins) {
                    node.addMixin(mixinName.toString());
                }
            }
        }

        // handle properties
        Map<String, ?> properties = (Map<String, ?>) jsonNode.get("properties");
        if (properties != null) {
            for (Map.Entry<String, ?> entry : properties.entrySet()) {
                toVirtualNodeProperty(node, entry.getKey(), entry.getValue());
            }
        }

        // handle i18n properties
        Map<String, ?> i18nProperties = (Map<String, ?>) jsonNode.get("i18nProperties");
        if (i18nProperties != null) {
            for (Map.Entry<String, ?> entry : i18nProperties.entrySet()) {
                Locale entryLocale = new Locale(entry.getKey());
                if (locale.equals(entryLocale)) {
                    Map<String, ?> localeProperties = (Map<String, ?>) entry.getValue();
                    for (Map.Entry<String, ?> localeProperty : localeProperties.entrySet()) {
                        toVirtualNodeProperty(node, localeProperty.getKey(), localeProperty.getValue());
                    }
                }
            }
        }

        // handle bound component
        try {
            if (node.isNodeType("jmix:bindedComponent") && jsonNode.containsKey("boundComponentRelativePath")) {
                String boundComponentPath = renderContext.getMainResource().getNodePath()
                        .concat((String) jsonNode.get("boundComponentRelativePath"));
                JCRNodeWrapper boundComponent = session.getNode(boundComponentPath);
                renderContext.getMainResource().getDependencies().add(boundComponent.getPath());
                node.setProperty("j:bindedComponent", boundComponent);
            }
        } catch (RepositoryException re) {
            // We handle cases where the bound component cannot be retrieved without causing
            // rendering failure.
            // This situation is rare, occurring when the page is being previewed or render
            // in live, and the associated list hasn't been created or published yet.
            // Lists for specific areas are only generated when the page is rendered in edit
            // mode.
            // If we don't set the property, the mainResource would incorrectly be
            // considered as the boundComponent, which is undesired.
            // In such cases, we intentionally use a fake UUID to ensure that
            // Functions.getBoundJcrNodeWrapper returns null.
            // This workaround allows to have the same behavior as JSP without any errors.
            node.setProperty("j:bindedComponent", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        }

        // handle children
        List<Map<String, Object>> children = (List<Map<String, Object>>) jsonNode.get("children");
        if (children != null) {
            for (Map<String, Object> child : children) {
                toVirtualNode(child, node, renderContext);
            }
        }

        return node;
    }

    private static void toVirtualNodeProperty(JCRNodeWrapper node, String propertyName, Object value)
            throws RepositoryException {
        ExtendedPropertyDefinition epd = node.getApplicablePropertyDefinition(propertyName);
        if (epd != null && epd.isMultiple()) {
            if (value instanceof List && ((List) value).size() > 0) {
                List<?> values = (List<?>) value;
                List<String> stringList = values.stream().map(Object::toString)
                        .collect(Collectors.toUnmodifiableList());
                node.setProperty(propertyName, stringList.toArray(new String[stringList.size()]));
            } else {
                node.setProperty(propertyName, ((String) value).split(" "));
            }
        } else {
            node.setProperty(propertyName, (String) value);
        }
    }
}

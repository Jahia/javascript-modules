package org.jahia.modules.npm.modules.engine.jsengine;

import org.jahia.services.content.JCRNodeIteratorWrapper;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRPropertyWrapperImpl;
import org.jahia.services.content.JCRSessionWrapper;
import org.jahia.services.content.nodetypes.ExtendedNodeType;
import org.jahia.services.content.nodetypes.ExtendedPropertyDefinition;
import org.jahia.services.render.RenderContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import pl.touk.throwing.ThrowingFunction;

import javax.jcr.*;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Mapper able to transform a JCR Node into future JS object to be used in HBS templates for example
 * HBS template does not allow to call functions on JS objects, helpers are required for that.
 * In order to simplify the reading of nodes infos (mixins, properties, etc) we transform the JCR Node into a Map, this way
 * it will be easier to read in HBS templates.
 */
public class JSNodeMapper {
    private static final Logger logger = LoggerFactory.getLogger(JSNodeMapper.class);

    private static final List<String> IGNORED_I18N_PROPERTIES = Arrays.asList("jcr:lastModifiedBy", "jcr:language",
            "jcr:predecessors", "jcr:baseVersion", "jcr:uuid", "jcr:lastModified", "jcr:isCheckedOut",
            "jcr:primaryType", "jcr:versionHistory");
    private static final List<String> IGNORED_PROPERTIES = Arrays.asList("jcr:predecessors", "jcr:baseVersion", "jcr:versionHistory");

    /**
     * Transform a JCR Node into a JS readable data (Map is used on Java side)
     *
     * @param node the node to transform
     * @param includeChildren should we recurse on children ?
     * @param includeDescendants should we recurse on all descendants tree ?
     * @param includeAllTranslations should we generate all i18n properties ?
     *                               true: will generate all i18n properties (stored under i18nProperties)
     *                               false: will generate only i18n properties related to current session locale (stored under properties like non-i18n props)
     * @return the JS Node
     * @throws RepositoryException in case something bad happens related to JCR
     */
    public static Map<String, Object> toJSNode(JCRNodeWrapper node, boolean includeChildren, boolean includeDescendants, boolean includeAllTranslations) throws RepositoryException {
        Map<String, Object> jsNode = new HashMap<>();
        jsNode.put("name", node.getName());
        try {
            jsNode.put("parent", node.getParent().getPath());
        } catch (RepositoryException e) {
            // could happen in case parent is not published for example.
        }

        jsNode.put("path", node.getPath());
        jsNode.put("uuid", node.getIdentifier());
        jsNode.put("nodeType", node.getPrimaryNodeTypeName());

        // handle mixins
        List<String> jsMixins = new ArrayList<>();
        ExtendedNodeType[] mixins = node.getMixinNodeTypes();
        for (int i = 0; i < mixins.length; i++) {
            jsMixins.add(mixins[i].getName());
        }
        jsNode.put("mixins", jsMixins);

        // handle properties
        if (includeAllTranslations) {
            jsNode.put("properties", toJSNodeProperties(node, false, IGNORED_PROPERTIES));

            Map<String, Object> jsI18nProperties = new HashMap<>();
            NodeIterator i18nNodeIterator = node.getI18Ns();
            while (i18nNodeIterator.hasNext()) {
                Node i18nNode = i18nNodeIterator.nextNode();
                jsI18nProperties.put(i18nNode.getProperty("jcr:language").getString(),
                        toJSNodeProperties(i18nNode, false, IGNORED_I18N_PROPERTIES));
            }
            jsNode.put("i18nProperties", jsI18nProperties);
        } else {
            jsNode.put("properties", toJSNodeProperties(node, true, IGNORED_PROPERTIES));
        }

        // handle children
        if (includeChildren || includeDescendants) {
            List<Map<String, Object>> children = new ArrayList<>();
            JCRNodeIteratorWrapper iterator = node.getNodes();
            while (iterator.hasNext()) {
                children.add(toJSNode((JCRNodeWrapper) iterator.next(), includeDescendants, includeDescendants, includeAllTranslations));
            }
            jsNode.put("children", children);
        }

        return jsNode;
    }

    private static Map<String, Object> toJSNodeProperties(Node node, boolean includeI18NProperties, List<String> ignoredProperties)
            throws RepositoryException {
        Map<String, Object> jsProperties = new HashMap<>();
        PropertyIterator propertyIterator = node.getProperties();
        while (propertyIterator.hasNext()) {
            Property property = (Property) propertyIterator.next();

            if (ignoredProperties != null && ignoredProperties.contains(property.getName())) {
                continue;
            }

            if (!includeI18NProperties && property instanceof JCRPropertyWrapperImpl &&
                    ((JCRPropertyWrapperImpl) property).getDefinition().isInternationalized()) {
                continue;
            }

            if (property.isMultiple()) {
                jsProperties.put(property.getName(),
                        Arrays.stream(property.getValues())
                                .map(ThrowingFunction.unchecked(value -> toJSNodePropertyValue(property, value)))
                                .collect(Collectors.toList()));
            } else {
                jsProperties.put(property.getName(), toJSNodePropertyValue(property, property.getValue()));
            }
        }
        return jsProperties;
    }

    private static Object toJSNodePropertyValue(Property property, Value value) throws RepositoryException {
        int type = value.getType();
        switch (type) {
            case PropertyType.REFERENCE:
            case PropertyType.WEAKREFERENCE:
                try {
                    Node ref = property.getSession().getNodeByIdentifier(value.getString());
                    return toJSNode((JCRNodeWrapper) ref, false, false, false);
                } catch (ItemNotFoundException e) {
                    return null;
                }
            default:
                return value.getString();
        }
    }

    /**
     * Transform a JS node into a virtual JCR Node
     * "Virtual" because this node is not means to be saved, it will be used by Jahia rendering system to be rendered only.
     *
     * @param jsonNode the JS Node
     * @param session the current session
     * @param renderContext the current renderContext
     * @return the unsaved "Virtual" JCR Node instance
     * @throws RepositoryException in case something bad happens related to JCR
     */
    public static JCRNodeWrapper toVirtualNode(Map<String, ?> jsonNode, JCRSessionWrapper session, RenderContext renderContext) throws RepositoryException {
        JCRNodeWrapper parent = jsonNode.containsKey("parent") ? session.getNode((String) jsonNode.get("parent")) : session.getNode("/");
        return toVirtualNode(jsonNode, parent, renderContext);
    }

    private static JCRNodeWrapper toVirtualNode(Map<String, ?> jsonNode, JCRNodeWrapper parent, RenderContext renderContext) throws RepositoryException {
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
                String boundComponentPath = renderContext.getMainResource().getNodePath().concat((String) jsonNode.get("boundComponentRelativePath"));
                JCRNodeWrapper boundComponent = session.getNode(boundComponentPath);
                renderContext.getMainResource().getDependencies().add(boundComponent.getPath());
                node.setProperty("j:bindedComponent", boundComponent);
            }
        } catch (RepositoryException re) {
            // We handle cases where the bound component cannot be retrieved without causing rendering failure.
            // This situation is rare, occurring when the page is being previewed or render in live, and the associated list hasn't been created or published yet.
            // Lists for specific areas are only generated when the page is rendered in edit mode.
            // If we don't set the property, the mainResource would incorrectly be considered as the boundComponent, which is undesired.
            // In such cases, we intentionally use a fake UUID to ensure that Functions.getBoundJcrNodeWrapper returns null.
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

    private static void toVirtualNodeProperty(JCRNodeWrapper node, String propertyName, Object value) throws RepositoryException {
        ExtendedPropertyDefinition epd = node.getApplicablePropertyDefinition(propertyName);
        if (epd != null && epd.isMultiple()) {
            if (value instanceof List && ((List) value).size() > 0) {
                List<?> values = (List<?>) value;
                List<String> stringList = values.stream().map(Object::toString).collect(Collectors.toUnmodifiableList());
                node.setProperty(propertyName, stringList.toArray(new String[stringList.size()]));
            } else {
                node.setProperty(propertyName, ((String) value).split(" "));
            }
        } else {
            node.setProperty(propertyName, (String) value);
        }
    }
}

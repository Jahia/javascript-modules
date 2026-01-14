/*
 * Copyright (C) 2002-2023 Jahia Solutions Group SA. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.jahia.modules.javascript.modules.engine.jshandler.parsers.cnd;

import org.apache.commons.io.IOUtils;
import org.slf4j.Logger;

import javax.jcr.RepositoryException;
import javax.jcr.UnsupportedRepositoryOperationException;
import javax.jcr.nodetype.*;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.io.Reader;
import java.util.*;

/**
 * Jahia implementation of the {@link NodeTypeManager}.
 * User: toto
 * Date: 4 janv. 2008
 * Time: 15:08:56
 *
 * TEMPORARY WORKAROUND - DO NOT USE
 * This class duplicates poor legacy code to provide backward compatibility.
 * Marked for immediate replacement and removal.
 *
 * @deprecated since 1.0.0 Technical debt. Will be removed in next major version.
 */
@Deprecated(since = "1.0.0")
public class NodeTypeRegistry implements NodeTypeManager {
    public static final String SYSTEM = "system";
    private static Logger logger = org.slf4j.LoggerFactory.getLogger(NodeTypeRegistry.class);

    private List<ExtendedNodeType> nodeTypesList = new ArrayList<ExtendedNodeType>();
    private Map<Name, ExtendedNodeType> nodetypes = new HashMap<Name, ExtendedNodeType>();

    private Map<String,String> namespaces = new HashMap<String,String>();

    private Map<ExtendedNodeType,Set<ExtendedNodeType>> mixinExtensions = new HashMap<ExtendedNodeType,Set<ExtendedNodeType>>();
    private Map<String,Set<ExtendedItemDefinition>> typedItems = new HashMap<String,Set<ExtendedItemDefinition>>();

    private boolean propertiesLoaded = false;
    private final Properties deploymentProperties = new Properties();

    private static NodeTypeRegistry instance = new NodeTypeRegistry();

    public static NodeTypeRegistry getInstance() {
        return instance;
    }

    public void flushLabels() {
        for (ExtendedNodeType nodeType : nodetypes.values()) {
            nodeType.clearLabels();
        }
        for (Set<ExtendedItemDefinition> itemSet : typedItems.values()) {
            for (ExtendedItemDefinition item : itemSet) {
                item.clearLabels();
                item.getDeclaringNodeType().clearLabels();
            }
        }
    }

    public List<ExtendedNodeType> getDefinitionsFromFile(File resource, String systemId) throws ParseException, IOException {
        String ext = resource.getPath().substring(resource.getPath().lastIndexOf('.'));
        if (ext.equalsIgnoreCase(".cnd")) {
            Reader resourceReader = null;
            try {
                resourceReader = new FileReader(resource);
                JahiaCndReader r = new JahiaCndReader(resourceReader, resource.getPath(), systemId, this);
                r.setDoRegister(false);
                r.parse();
                return r.getNodeTypesList();
            } finally {
                IOUtils.closeQuietly(resourceReader);
            }
        }
        return Collections.emptyList();
    }

    public ExtendedNodeType getNodeType(String name) throws NoSuchNodeTypeException {
        ExtendedNodeType res = nodetypes.get(new Name(name, namespaces));
        if (res == null) {
            throw new NoSuchNodeTypeException(name);
        }
        return res;
    }

    public NodeTypeIterator getAllNodeTypes() {
        return new JahiaNodeTypeIterator(nodeTypesList.iterator(),nodeTypesList.size());
    }

    public NodeTypeIterator getAllNodeTypes(List<String> systemIds) {
        List<ExtendedNodeType> res = new ArrayList<ExtendedNodeType>();
        for (Iterator<ExtendedNodeType> iterator = nodetypes.values().iterator(); iterator.hasNext();) {
            ExtendedNodeType nt = iterator.next();
            if (systemIds == null || systemIds.contains(nt.getSystemId())) {
                res.add(nt);
            }
        }
        return new JahiaNodeTypeIterator(res.iterator(), res.size());
    }

    public NodeTypeIterator getNodeTypes(String systemId) {
        List<ExtendedNodeType> l = new ArrayList<ExtendedNodeType>();
        for (ExtendedNodeType nt : nodeTypesList) {
            if (nt.getSystemId().equals(systemId)) {
                l.add(nt);
            }
        }
        return new JahiaNodeTypeIterator(l.iterator(),l.size());
    }

    public Map<String, String> getNamespaces() {
        return namespaces;
    }
    public NodeTypeIterator getPrimaryNodeTypes() throws RepositoryException {
        return getPrimaryNodeTypes(null);
    }

    public NodeTypeIterator getPrimaryNodeTypes(List<String> systemIds) throws RepositoryException {
        List<ExtendedNodeType> res = new ArrayList<ExtendedNodeType>();
        for (Iterator<ExtendedNodeType> iterator = nodetypes.values().iterator(); iterator.hasNext();) {
            ExtendedNodeType nt = iterator.next();
            if (!nt.isMixin() && (systemIds == null || systemIds.contains(nt.getSystemId()))) {
                res.add(nt);
            }
        }
        return new JahiaNodeTypeIterator(res.iterator(), res.size());
    }

    public NodeTypeIterator getMixinNodeTypes() throws RepositoryException {
        return getMixinNodeTypes(null);
    }

    public NodeTypeIterator getMixinNodeTypes(List<String> systemIds) throws RepositoryException {
        List<ExtendedNodeType> res = new ArrayList<ExtendedNodeType>();
        for (Iterator<ExtendedNodeType> iterator = nodetypes.values().iterator(); iterator.hasNext();) {
            ExtendedNodeType nt = iterator.next();
            if (nt.isMixin() && (systemIds == null || systemIds.contains(nt.getSystemId()))) {
                res.add(nt);
            }
        }
        return new JahiaNodeTypeIterator(res.iterator(), res.size());
    }

    public void addNodeType(Name name, ExtendedNodeType nodeType) {
        if (nodetypes.containsKey(name)) {
            nodeTypesList.remove(nodetypes.get(name));
        }
        nodeTypesList.add(nodeType);
        nodetypes.put(name, nodeType);
    }

    public void addMixinExtension(ExtendedNodeType mixin, ExtendedNodeType baseType) {
        if (!mixinExtensions.containsKey(baseType)) {
            mixinExtensions.put(baseType, new HashSet<ExtendedNodeType>());
        }
        mixinExtensions.get(baseType).add(mixin);
    }

    public Map<ExtendedNodeType, Set<ExtendedNodeType>> getMixinExtensions() {
        return mixinExtensions;
    }

    public void addTypedItem(ExtendedItemDefinition itemDef) {
        final String type = itemDef.getItemType();
        if (!typedItems.containsKey(type)) {
            typedItems.put(type, new HashSet<ExtendedItemDefinition>());
        }
        typedItems.get(type).add(itemDef);
    }

    public Map<String, Set<ExtendedItemDefinition>> getTypedItems() {
        return typedItems;
    }

    public void unregisterNodeType(Name name) {
        ExtendedNodeType nt = nodetypes.remove(name);
        nodeTypesList.remove(nt);
    }

    public void unregisterNodeTypes(String systemId) {
        for (Name n : new HashSet<Name>(nodetypes.keySet())) {
            ExtendedNodeType nt = nodetypes.get(n);
            if (systemId.equals(nt.getSystemId())) {
                unregisterNodeType(n);
            }
        }
    }

    class JahiaNodeTypeIterator implements NodeTypeIterator {
        private long size;
        private long pos=0;
        private Iterator<ExtendedNodeType> iterator;

        JahiaNodeTypeIterator(Iterator<ExtendedNodeType> it, long size) {
            this.iterator = it;
            this.size = size;
        }

        public NodeType nextNodeType() {
            pos += 1;
            return iterator.next();
        }

        public void skip(long l) {
            if ((pos + l + 1) > size) {
                throw new NoSuchElementException("Tried to skip past " + l +
                        " elements, which with current pos (" + pos +
                        ") brings us past total size=" + size);
            }
            for (int i=0; i < l; i++) {
                next();
            }
        }

        public long getSize() {
            return size;
        }

        public long getPosition() {
            return pos;
        }

        public boolean hasNext() {
            return iterator.hasNext();
        }

        public Object next() {
            pos += 1;
            return iterator.next();
        }

        public void remove() {
            iterator.remove();
            size -= 1;
        }
    }

    public boolean hasNodeType(String name) {
        return nodetypes.get(new Name(name, namespaces)) != null;
    }

    public NodeTypeTemplate createNodeTypeTemplate() throws UnsupportedRepositoryOperationException, RepositoryException {
        throw new UnsupportedRepositoryOperationException();
    }

    public NodeTypeTemplate createNodeTypeTemplate(NodeTypeDefinition ntd) throws UnsupportedRepositoryOperationException, RepositoryException {
        throw new UnsupportedRepositoryOperationException();
    }

    public NodeDefinitionTemplate createNodeDefinitionTemplate() throws UnsupportedRepositoryOperationException, RepositoryException {
        throw new UnsupportedRepositoryOperationException();
    }

    public PropertyDefinitionTemplate createPropertyDefinitionTemplate() throws UnsupportedRepositoryOperationException, RepositoryException {
        throw new UnsupportedRepositoryOperationException();
    }

    public NodeType registerNodeType(NodeTypeDefinition ntd, boolean allowUpdate) throws InvalidNodeTypeDefinitionException, NodeTypeExistsException, UnsupportedRepositoryOperationException, RepositoryException {
        throw new UnsupportedRepositoryOperationException();
    }

    public NodeTypeIterator registerNodeTypes(NodeTypeDefinition[] ntds, boolean allowUpdate) throws InvalidNodeTypeDefinitionException, NodeTypeExistsException, UnsupportedRepositoryOperationException, RepositoryException {
        throw new UnsupportedRepositoryOperationException();
    }

    public void unregisterNodeType(String name) throws ConstraintViolationException {
        Name n = new Name(name, namespaces);
        if (nodetypes.containsKey(n)) {
            for (ExtendedNodeType type : nodeTypesList) {
                if (!type.getName().equals(name)) {
                    for (ExtendedNodeType nt : type.getSupertypes()) {
                        if (nt.getName().equals(name)) {
                            throw new ConstraintViolationException("Cannot unregister node type " + name + " because " + type.getName() + " extends it.");
                        }
                    }
                    for (ExtendedNodeDefinition ntd : type.getChildNodeDefinitions()) {
                        if (Arrays.asList(ntd.getRequiredPrimaryTypeNames()).contains(name)) {
                            throw new ConstraintViolationException("Cannot unregister node type " + name + " because a child node definition of " + type.getName() + " requires it.");
                        }
                    }
                    for (ExtendedNodeDefinition ntd : type.getUnstructuredChildNodeDefinitions().values()) {
                        if (Arrays.asList(ntd.getRequiredPrimaryTypeNames()).contains(name)) {
                            throw new ConstraintViolationException("Cannot unregister node type " + name + " because a child node definition of " + type.getName() + " requires it.");
                        }
                    }
                }
            }
            nodeTypesList.remove(nodetypes.remove(n));
        }
    }

    public void unregisterNodeTypes(String[] names) throws ConstraintViolationException {
        for (String name : names) {
            unregisterNodeType(name);
        }
    }
}

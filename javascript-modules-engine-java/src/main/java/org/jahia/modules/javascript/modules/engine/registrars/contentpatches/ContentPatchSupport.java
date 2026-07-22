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
package org.jahia.modules.javascript.modules.engine.registrars.contentpatches;

import org.jahia.services.content.nodetypes.ExtendedNodeType;
import org.jahia.services.content.nodetypes.NodeTypeRegistry;
import org.osgi.framework.Bundle;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.jcr.nodetype.ConstraintViolationException;
import javax.jcr.nodetype.NoSuchNodeTypeException;

/**
 * Java support object handed to a JavaScript content patch when it is executed. It carries the
 * per-content patch logger, the dry-run flag, module metadata, and the sanctioned definition
 * operations a content patch is allowed to perform (restricted to node types owned by the module,
 * i.e. whose {@code systemId} is the module's symbolic name).
 *
 * <p>The JS side (the {@code registerContentPatch} wrapper in the library) builds the idiomatic
 * {@code ContentPatchContext} from this object — keep both shapes in sync.
 */
public class ContentPatchSupport {

    private static final String LOGGER_PREFIX = "org.jahia.modules.javascript.modules.engine.contentpatches.";

    private final Bundle bundle;
    private final boolean dryRun;

    public ContentPatchSupport(Bundle bundle, boolean dryRun) {
        this.bundle = bundle;
        this.dryRun = dryRun;
    }

    /** Logger dedicated to one content patch, named {@code …contentpatches.<module>.<patchName>}. */
    public Logger getLogger(String patchName) {
        return LoggerFactory.getLogger(LOGGER_PREFIX + bundle.getSymbolicName() + "." + patchName);
    }

    public boolean isDryRun() {
        return dryRun;
    }

    public String getModuleName() {
        return bundle.getSymbolicName();
    }

    public String getModuleVersion() {
        return bundle.getVersion().toString();
    }

    /** Whether a node type is currently registered on this instance (fresh installs may not have legacy types). */
    public boolean isNodeTypeRegistered(String name) {
        return NodeTypeRegistry.getInstance().hasNodeType(name);
    }

    /**
     * Unregisters a node type OWNED BY THIS MODULE from the node type registry. Types registered by
     * another module (different {@code systemId}) are refused — cross-module definition surgery is
     * out of scope for JS content patches.
     *
     * @throws IllegalArgumentException if the type belongs to another module
     * @throws IllegalStateException    if the registry refuses the removal (e.g. remaining usages)
     */
    public void unregisterNodeType(String name) {
        NodeTypeRegistry registry = NodeTypeRegistry.getInstance();
        if (!registry.hasNodeType(name)) {
            getLogger(bundle.getSymbolicName()).info(
                    "Node type {} is not registered on this instance, nothing to unregister", name);
            return;
        }
        ExtendedNodeType type;
        try {
            type = registry.getNodeType(name);
        } catch (NoSuchNodeTypeException e) {
            return; // raced away, nothing to do
        }
        if (!bundle.getSymbolicName().equals(type.getSystemId())) {
            throw new IllegalArgumentException("Node type " + name + " is owned by '" + type.getSystemId()
                    + "', not by this module ('" + bundle.getSymbolicName()
                    + "') — content patches may only remove their own definitions");
        }
        if (dryRun) {
            getLogger(bundle.getSymbolicName()).info("[dry-run] would unregister node type {}", name);
            return;
        }
        try {
            registry.unregisterNodeType(name);
        } catch (ConstraintViolationException e) {
            throw new IllegalStateException("Unable to unregister node type " + name + ": " + e.getMessage(), e);
        }
    }
}

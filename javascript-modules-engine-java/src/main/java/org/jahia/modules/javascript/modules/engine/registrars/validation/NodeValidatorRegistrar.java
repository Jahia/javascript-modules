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
package org.jahia.modules.javascript.modules.engine.registrars.validation;

import org.graalvm.polyglot.Value;
import org.graalvm.polyglot.proxy.ProxyObject;
import org.jahia.modules.javascript.modules.engine.jsengine.GraalVMEngine;
import org.jahia.modules.javascript.modules.engine.jsengine.JSPromise;
import org.jahia.modules.javascript.modules.engine.registrars.Registrar;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRStoreService;
import org.osgi.framework.Bundle;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Deactivate;
import org.osgi.service.component.annotations.Reference;
import org.osgi.service.component.annotations.ReferenceCardinality;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.jcr.RepositoryException;
import java.lang.reflect.Constructor;
import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Bridges JavaScript registry entries of type {@code node-validator} to Jahia's JCR save validation.
 *
 * <p>Unlike the OSGi-service-publishing registrars, Jahia consumes node validators through a global
 * {@code nodeType -> validator class} map ({@link JCRStoreService#addValidator}) that allows a single
 * validator class per node type, removed unconditionally by node type. This registrar therefore
 * registers the single {@link JSNodeValidator} bridge class under the sentinel node type
 * {@code nt:base} while any JS validator exists (so core instantiates it exactly once per changed node
 * per save), performs all node-type matching itself, and removes the bridge — after an ownership check —
 * only when the last JS validator is gone.
 */
@Component(service = {Registrar.class, NodeValidatorRegistrar.class}, immediate = true)
public class NodeValidatorRegistrar implements Registrar {

    public static final String REGISTRY_TYPE = "node-validator";
    static final String SENTINEL_NODE_TYPE = "nt:base";

    private static final Logger logger = LoggerFactory.getLogger(NodeValidatorRegistrar.class);

    private GraalVMEngine graalVMEngine;

    /** Declared validators per bundle; guarded by {@code this}. */
    private final Map<Bundle, List<DeclaredValidator>> declaredByBundle = new HashMap<>();
    /** Immutable fast gate read by validation threads without locking. */
    private volatile Map<JSValidation.Mode, Set<String>> declaredNodeTypesByMode = Collections.emptyMap();
    /** Guarded by {@code this}. */
    private boolean bridgeRegistered;

    @Reference(cardinality = ReferenceCardinality.MANDATORY)
    public void setGraalVMEngine(GraalVMEngine graalVMEngine) {
        this.graalVMEngine = graalVMEngine;
    }

    @Override
    public void register(Bundle bundle) {
        List<Map<String, Object>> entries = graalVMEngine.doWithContext(contextProvider -> {
            Map<String, Object> filter = new HashMap<>();
            filter.put("type", REGISTRY_TYPE);
            filter.put("bundleKey", bundle.getSymbolicName());
            return contextProvider.getRegistry().find(filter);
        });
        List<DeclaredValidator> declared = new ArrayList<>();
        for (Map<String, Object> entry : entries) {
            Object nodeType = entry.get("nodeType");
            if (nodeType == null) {
                logger.warn("Ignoring JS node validator '{}' of bundle {}: no nodeType declared",
                        entry.get("key"), bundle.getSymbolicName());
                continue;
            }
            declared.add(new DeclaredValidator(nodeType.toString(), modeOf(entry)));
        }
        synchronized (this) {
            declaredByBundle.put(bundle, declared);
            rebuildSnapshotAndBridge();
        }
    }

    @Override
    public void unregister(Bundle bundle) {
        synchronized (this) {
            declaredByBundle.remove(bundle);
            rebuildSnapshotAndBridge();
        }
    }

    @Deactivate
    public void deactivate() {
        synchronized (this) {
            declaredByBundle.clear();
            rebuildSnapshotAndBridge();
        }
    }

    /** Called under lock. */
    private void rebuildSnapshotAndBridge() {
        Map<JSValidation.Mode, Set<String>> snapshot = new EnumMap<>(JSValidation.Mode.class);
        for (List<DeclaredValidator> declared : declaredByBundle.values()) {
            for (DeclaredValidator validator : declared) {
                snapshot.computeIfAbsent(validator.mode, mode -> new HashSet<>()).add(validator.nodeType);
            }
        }
        declaredNodeTypesByMode = Collections.unmodifiableMap(snapshot);

        boolean needed = !snapshot.isEmpty();
        if (needed && !bridgeRegistered) {
            Constructor<?> existing = getRegisteredPlatformValidator();
            if (existing != null && !JSNodeValidator.class.equals(existing.getDeclaringClass())) {
                logger.warn("A validator ({}) is already registered for node type {}; it will be replaced " +
                        "by the JavaScript modules validator bridge (the platform allows a single validator " +
                        "class per node type)", existing.getDeclaringClass().getName(), SENTINEL_NODE_TYPE);
            }
            addPlatformValidator();
            bridgeRegistered = true;
        } else if (!needed && bridgeRegistered) {
            Constructor<?> current = getRegisteredPlatformValidator();
            if (current != null && JSNodeValidator.class.equals(current.getDeclaringClass())) {
                removePlatformValidator();
            } else if (current != null) {
                logger.warn("Not removing the validator registered for node type {}: it is owned by {}",
                        SENTINEL_NODE_TYPE, current.getDeclaringClass().getName());
            }
            bridgeRegistered = false;
        }
    }

    // JCRStoreService interactions isolated as seams for unit tests

    protected Constructor<?> getRegisteredPlatformValidator() {
        return JCRStoreService.getInstance().getValidators().get(SENTINEL_NODE_TYPE);
    }

    protected void addPlatformValidator() {
        JCRStoreService.getInstance().addValidator(SENTINEL_NODE_TYPE, JSNodeValidator.class);
    }

    protected void removePlatformValidator() {
        JCRStoreService.getInstance().removeValidator(SENTINEL_NODE_TYPE);
    }

    /**
     * Runs the JS validators declared for the given phase against the node and returns their violations.
     * Called by {@link JSValidationConstraintValidator} on every session save of any node; the volatile
     * snapshot gate avoids entering GraalVM when no declared node type matches.
     */
    public List<JSViolation> collectViolations(JCRNodeWrapper node, JSValidation.Mode mode) {
        if (node == null) {
            return Collections.emptyList();
        }
        Set<String> candidateTypes = declaredNodeTypesByMode.getOrDefault(mode, Collections.emptySet());
        if (candidateTypes.isEmpty() || candidateTypes.stream().noneMatch(type -> isNodeTypeSafe(node, type))) {
            return Collections.emptyList();
        }

        return graalVMEngine.doWithContext(contextProvider -> {
            List<JSViolation> violations = new ArrayList<>();
            Map<String, Object> filter = new HashMap<>();
            filter.put("type", REGISTRY_TYPE);
            for (Map<String, Object> entry : contextProvider.getRegistry().find(filter)) {
                if (modeOf(entry) != mode) {
                    continue;
                }
                Object nodeType = entry.get("nodeType");
                if (nodeType == null || !isNodeTypeSafe(node, nodeType.toString())) {
                    continue;
                }
                String key = String.valueOf(entry.get("key"));
                try {
                    Map<String, Object> jsContext = new HashMap<>();
                    jsContext.put("locale", getSessionLocale(node));
                    // settleOrThrow supports async validators; rejections land in the catch below
                    Value result = JSPromise.settleOrThrow(
                            Value.asValue(entry.get("validate")).execute(node, ProxyObject.fromMap(jsContext)),
                            "JS node validator '" + key + "'");
                    appendViolations(violations, result, key);
                } catch (Exception e) {
                    // fail closed: a broken validator must not let invalid content through
                    logger.error("JS node validator '{}' failed to execute", key, e);
                    violations.add(new JSViolation("The content could not be validated (" + key + ")", null, key));
                }
            }
            return violations;
        });
    }

    static JSValidation.Mode modeOf(Map<String, Object> entry) {
        boolean advanced = Boolean.TRUE.equals(entry.get("advanced"));
        boolean skipOnImport = Boolean.TRUE.equals(entry.get("skipOnImport"));
        if (advanced) {
            return skipOnImport ? JSValidation.Mode.ADVANCED_SKIP_ON_IMPORT : JSValidation.Mode.ADVANCED;
        }
        return skipOnImport ? JSValidation.Mode.DEFAULT_SKIP_ON_IMPORT : JSValidation.Mode.DEFAULT;
    }

    /** Accepts undefined/null (no violations), a single violation object, or an array of them. */
    static void appendViolations(List<JSViolation> violations, Value result, String key) {
        if (result == null || result.isNull()) {
            return;
        }
        if (result.hasArrayElements()) {
            for (long i = 0; i < result.getArraySize(); i++) {
                appendViolation(violations, result.getArrayElement(i), key);
            }
        } else {
            appendViolation(violations, result, key);
        }
    }

    private static void appendViolation(List<JSViolation> violations, Value item, String key) {
        Value message = item.hasMembers() ? item.getMember("message") : null;
        if (message == null || message.isNull() || !message.isString()) {
            logger.warn("JS node validator '{}' returned a violation without a string message, skipping it", key);
            return;
        }
        Value propertyName = item.getMember("propertyName");
        violations.add(new JSViolation(message.asString(),
                propertyName != null && propertyName.isString() ? propertyName.asString() : null, key));
    }

    private static Locale getSessionLocale(JCRNodeWrapper node) {
        try {
            return node.getSession().getLocale();
        } catch (RepositoryException e) {
            logger.debug("Unable to read the session locale for validation", e);
            return null;
        }
    }

    private static boolean isNodeTypeSafe(JCRNodeWrapper node, String nodeType) {
        try {
            return node.isNodeType(nodeType);
        } catch (RepositoryException e) {
            logger.warn("Unable to check node type {} during JS validation", nodeType, e);
            return false;
        }
    }

    private static final class DeclaredValidator {
        private final String nodeType;
        private final JSValidation.Mode mode;

        private DeclaredValidator(String nodeType, JSValidation.Mode mode) {
            this.nodeType = nodeType;
            this.mode = mode;
        }
    }
}

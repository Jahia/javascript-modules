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
package org.jahia.modules.javascript.modules.engine.sdk;

import org.graalvm.polyglot.Value;
import org.jahia.modules.javascript.modules.engine.jsengine.GraalVMEngine;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.osgi.service.component.annotations.ReferenceCardinality;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Default {@link JSServerExtensionInvoker}. Runs each {@link #forEach} within one pooled GraalVM context
 * (re-resolving the registry inside the context, as GraalVM contexts are recycled on module (un)deploy),
 * and converts GraalVM {@link Value} results to plain Java so callers never see polyglot types.
 */
@Component(service = JSServerExtensionInvoker.class, immediate = true)
public class JSServerExtensionInvokerImpl implements JSServerExtensionInvoker {

    private GraalVMEngine graalVMEngine;

    @Reference(cardinality = ReferenceCardinality.MANDATORY)
    public void setGraalVMEngine(GraalVMEngine graalVMEngine) {
        this.graalVMEngine = graalVMEngine;
    }

    @Override
    public <T> List<T> forEach(String registryType, ExtensionHandler<T> handler) {
        return graalVMEngine.doWithContext(contextProvider -> {
            List<T> results = new ArrayList<>();
            Invoker invoker = (callable, args) -> convert(Value.asValue(callable).execute(args));
            Map<String, Object> filter = new HashMap<>();
            filter.put("type", registryType);
            for (Map<String, Object> entry : contextProvider.getRegistry().find(filter)) {
                T result = handler.handle(entry, invoker);
                if (result != null) {
                    results.add(result);
                }
            }
            return results;
        });
    }

    /** Recursively converts a GraalVM value to plain Java ({@code null}/Boolean/Long/Double/String/List/Map). */
    static Object convert(Value value) {
        if (value == null || value.isNull()) {
            return null;
        }
        if (value.isBoolean()) {
            return value.asBoolean();
        }
        if (value.isNumber()) {
            return value.fitsInLong() ? (Object) value.asLong() : (Object) value.asDouble();
        }
        if (value.isString()) {
            return value.asString();
        }
        if (value.hasArrayElements()) {
            List<Object> list = new ArrayList<>((int) value.getArraySize());
            for (long i = 0; i < value.getArraySize(); i++) {
                list.add(convert(value.getArrayElement(i)));
            }
            return list;
        }
        if (value.hasMembers()) {
            Map<String, Object> map = new LinkedHashMap<>();
            for (String key : value.getMemberKeys()) {
                map.put(key, convert(value.getMember(key)));
            }
            return map;
        }
        return value.toString();
    }
}

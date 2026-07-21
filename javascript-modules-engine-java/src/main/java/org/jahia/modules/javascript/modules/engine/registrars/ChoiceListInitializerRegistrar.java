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
package org.jahia.modules.javascript.modules.engine.registrars;

import org.apache.jackrabbit.value.StringValue;
import org.graalvm.polyglot.Value;
import org.jahia.modules.javascript.modules.engine.jsengine.ContextProvider;
import org.jahia.modules.javascript.modules.engine.jsengine.GraalVMEngine;
import org.jahia.services.content.nodetypes.ExtendedPropertyDefinition;
import org.jahia.services.content.nodetypes.initializers.ChoiceListInitializerService;
import org.jahia.services.content.nodetypes.initializers.ChoiceListValue;
import org.jahia.services.content.nodetypes.initializers.ModuleChoiceListInitializer;
import org.osgi.framework.Bundle;
import org.osgi.framework.BundleContext;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.osgi.service.component.annotations.ReferenceCardinality;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Exposes JavaScript registry entries of type {@code choicelist-initializer} as
 * {@link ModuleChoiceListInitializer} OSGi services, consumed by Jahia core and usable from CND definitions
 * as {@code choicelist[key]} selector options.
 */
@Component(service = Registrar.class, immediate = true)
public class ChoiceListInitializerRegistrar extends AbstractServiceRegistrar<ModuleChoiceListInitializer> {

    public static final String REGISTRY_TYPE = "choicelist-initializer";

    private static final Logger logger = LoggerFactory.getLogger(ChoiceListInitializerRegistrar.class);

    private ChoiceListInitializerService choiceListInitializerService;

    public ChoiceListInitializerRegistrar() {
        super(ModuleChoiceListInitializer.class, REGISTRY_TYPE);
    }

    @Reference(cardinality = ReferenceCardinality.MANDATORY)
    public void setGraalVMEngine(GraalVMEngine graalVMEngine) {
        this.graalVMEngine = graalVMEngine;
    }

    @Reference
    public void setChoiceListInitializerService(ChoiceListInitializerService choiceListInitializerService) {
        this.choiceListInitializerService = choiceListInitializerService;
    }

    @Activate
    public void activate(BundleContext bundleContext) {
        this.bundleContext = bundleContext;
    }

    @Override
    protected void beforeRegister(Bundle bundle, Map<String, Object> registryEntry) {
        Object key = registryEntry.get("key");
        if (key != null && choiceListInitializerService.getInitializers().containsKey(key.toString())) {
            logger.warn("A choicelist initializer with key '{}' is already registered on this platform; " +
                    "the one declared by bundle {} will take precedence (last registration wins). " +
                    "Consider prefixing initializer keys with the module name.", key, bundle.getSymbolicName());
        }
    }

    @Override
    protected ModuleChoiceListInitializer createBridge(Map<String, Object> registryEntry) {
        return new ChoiceListInitializerBridge(registryEntry, graalVMEngine);
    }

    public static class ChoiceListInitializerBridge implements ModuleChoiceListInitializer {

        private final GraalVMEngine engine;
        private String key;

        public ChoiceListInitializerBridge(Map<String, Object> value, GraalVMEngine engine) {
            this.engine = engine;
            this.key = (String) value.get("key");
        }

        @Override
        public void setKey(String key) {
            this.key = key;
        }

        @Override
        public String getKey() {
            return key;
        }

        @Override
        public List<ChoiceListValue> getChoiceListValues(ExtendedPropertyDefinition epd, String param,
                List<ChoiceListValue> values, Locale locale, Map<String, Object> context) {
            return engine.doWithContext(contextProvider -> {
                Map<String, Object> entry = getJsInitializer(contextProvider);
                if (entry == null || entry.get("getChoiceListValues") == null) {
                    logger.warn("JS choicelist initializer '{}' is no longer available in the registry, " +
                            "returning no values", key);
                    return Collections.emptyList();
                }
                Value result = Value.asValue(entry.get("getChoiceListValues"))
                        .execute(epd, param, values, locale, context);
                return convertValues(result, key);
            });
        }

        private Map<String, Object> getJsInitializer(ContextProvider contextProvider) {
            return contextProvider.getRegistry().get(REGISTRY_TYPE, key);
        }

        /**
         * Converts a JS array of {@code {label, value, properties?}} objects into Jahia
         * {@link ChoiceListValue} instances. Malformed items are logged and skipped.
         */
        static List<ChoiceListValue> convertValues(Value result, String key) {
            if (result == null || result.isNull() || !result.hasArrayElements()) {
                return Collections.emptyList();
            }
            List<ChoiceListValue> choiceListValues = new ArrayList<>();
            for (long i = 0; i < result.getArraySize(); i++) {
                Value item = result.getArrayElement(i);
                Value label = item.getMember("label");
                Value value = item.getMember("value");
                if (label == null || label.isNull() || value == null || value.isNull()) {
                    logger.warn("JS choicelist initializer '{}' returned an item without label or value " +
                            "at index {}, skipping it", key, i);
                    continue;
                }
                Value properties = item.getMember("properties");
                if (properties != null && !properties.isNull() && properties.hasMembers()) {
                    Map<String, Object> propertiesMap = new HashMap<>();
                    for (String memberKey : properties.getMemberKeys()) {
                        propertiesMap.put(memberKey, properties.getMember(memberKey).as(Object.class));
                    }
                    choiceListValues.add(new ChoiceListValue(label.asString(), propertiesMap,
                            new StringValue(value.asString())));
                } else {
                    choiceListValues.add(new ChoiceListValue(label.asString(), value.asString()));
                }
            }
            return choiceListValues;
        }
    }
}

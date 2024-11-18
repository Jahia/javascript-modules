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
package org.jahia.modules.npm.modules.engine.jsengine;

import org.apache.commons.beanutils.BeanUtils;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang.StringUtils;
import org.apache.commons.pool2.BasePooledObjectFactory;
import org.apache.commons.pool2.PooledObject;
import org.apache.commons.pool2.impl.DefaultPooledObject;
import org.apache.commons.pool2.impl.GenericObjectPool;
import org.apache.commons.pool2.impl.GenericObjectPoolConfig;
import org.graalvm.polyglot.*;
import org.osgi.framework.Bundle;
import org.osgi.framework.BundleContext;
import org.osgi.service.component.annotations.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.net.URL;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;
import java.util.function.Function;

import static org.jahia.modules.npm.modules.engine.npmhandler.NpmProtocolConnection.BUNDLE_HEADER_NPM_INIT_SCRIPT;

/**
 * Base JS engine based on GraalVM
 */
@Component(service = GraalVMEngine.class, immediate = true)
public class GraalVMEngine {
    private static final Logger logger = LoggerFactory.getLogger(GraalVMEngine.class);

    public static final String JS = "js";

    private Engine sharedEngine;

    private JSGlobalVariableFactory globals;

    private GenericObjectPool<ContextProvider> pool;
    private final ThreadLocal<Stack<ContextProvider>> currentContext = ThreadLocal.withInitial(Stack::new);

    private final Map<Bundle, Source> initScripts = Collections.synchronizedMap(new LinkedHashMap<>());
    private final AtomicInteger version = new AtomicInteger(0);

    private BundleContext bundleContext;
    public BundleContext getBundleContext() {
        return bundleContext;
    }

    @Reference(service = JSGlobalVariableFactory.class, cardinality = ReferenceCardinality.MANDATORY)
    public void bindVariable(JSGlobalVariableFactory globals) {
        this.globals = globals;
    }

    public void enableNpmModule(Bundle bundle) {
        try {
            initScripts.put(bundle, getGraalSource(bundle, bundle.getHeaders().get(BUNDLE_HEADER_NPM_INIT_SCRIPT)));
            version.incrementAndGet();
            logger.info("Registered bundle {} in GraalVM engine", bundle.getSymbolicName());
        } catch (IOException ioe) {
            logger.error("Error enabling bundle {}", bundle.getSymbolicName(), ioe);
        }
    }

    public void disableNpmModule(Bundle bundle) {
        if (initScripts.remove(bundle) != null) {
            version.incrementAndGet();
            logger.info("Unregistered bundle {} from GraalVM engine", bundle.getSymbolicName());
        }
    }

    @Activate
    public void activate(BundleContext bundleContext, Map<String, ?> props) {
        logger.debug("GraalVMEngine.activate");
        this.bundleContext = bundleContext;

        initialEngineCheckup();
        try {
            initScripts.put(bundleContext.getBundle(), getGraalSource(bundleContext.getBundle(), "META-INF/js/main.js"));
        } catch (IOException e) {
            logger.error("Cannot execute main init script", e);
        }
        Engine.Builder builder = Engine.newBuilder();
        Map<String,String> poolOptions = new HashMap<>();
        boolean experimental = props.containsKey("experimental") && Boolean.parseBoolean(props.get("experimental").toString());
        builder.allowExperimentalOptions(experimental);
        for (Map.Entry<String, ?> entry : props.entrySet()) {
            if (entry.getKey().startsWith("polyglot.")) {
                String opt = StringUtils.substringAfter(entry.getKey(), "polyglot.");
                builder.option(opt, entry.getValue().toString());
            } else if (entry.getKey().startsWith("pool.")) {
                String key = StringUtils.substringAfter(entry.getKey(), "pool.");
                poolOptions.put(key, entry.getValue().toString());
            }
        }
        sharedEngine = builder.build();
        initializePool(poolOptions);
    }

    @Deactivate
    public void deactivate() {
        logger.debug("GraalVMEngine.deactivate");
        pool.close();
        sharedEngine.close(true);
        currentContext.remove();
    }

    public <T> T doWithContext(Function<ContextProvider, T> callback) {
        Stack<ContextProvider> cx = currentContext.get();
        if (!cx.isEmpty()) {
            return callback.apply(cx.peek());
        } else {
            try {
                cx.push(pool.borrowObject());
            } catch (Exception e) {
                throw new GraalVMException("Unable to borrow context from pool: " + e.getMessage(), e);
            }
            try {
                return callback.apply(cx.peek());
            } finally {
                pool.returnObject(cx.pop());
            }
        }
    }

    public void doWithContext(Consumer<ContextProvider> callback) {
        doWithContext(contextProvider -> {
            callback.accept(contextProvider);
            return null;
        });
    }

    private Source getGraalSource(Bundle bundle, String script) throws IOException {
        String resource = loadResource(bundle, script);
        if (resource == null) {
            throw new IOException("Cannot get resource " + bundle.getSymbolicName() + " / " + script);
        }
        return Source.newBuilder(JS, resource, bundle.getSymbolicName() + "/" + script).build();
    }

    public static String loadResource(Bundle bundle, String path) {
        try {
            URL url = bundle.getResource(path);
            return url != null ? IOUtils.toString(url, StandardCharsets.UTF_8) : null;
        } catch (Exception e) {
            logger.error("Cannot get resource: " + path, e);
        }
        return null;
    }

    private void initialEngineCheckup() {
        // check VM
        String vmVendor = System.getProperty("java.vm.vendor", "Unknown");
        if (!vmVendor.contains("GraalVM")) {
            logger.warn("NPM Modules Engine requires GraalVM for production usage, detected {}.", vmVendor);
            return;
        }

        // Check if the 'js' extension is installed
        try (Context context = Context.create()) {
            if (!context.getEngine().getLanguages().containsKey(JS)) {
                logger.error("NPM Modules Engine detected GraalVM, but the 'js' extension is not installed. You can install it by running: gu install js");
            }
        }
    }

    private void initializePool(Map<String,String> poolOptions) {
        GenericObjectPoolConfig<ContextProvider> config = new GenericObjectPoolConfig<>();
        try {
            BeanUtils.populate(config, poolOptions);
        } catch (IllegalAccessException | InvocationTargetException e) {
            logger.error("Error while applying GraalVM Context pool options", e);
            throw new RuntimeException(e);
        }
        pool = new GenericObjectPool<>(new ContextPoolFactory(), config);
    }

    class ContextPoolFactory extends BasePooledObjectFactory<ContextProvider> {
        @Override
        public ContextProvider create() throws Exception {
            logger.debug("ContextPoolFactory.create");
            Context context = Context.newBuilder(JS)
                    .allowHostClassLookup(s -> true)
                    .allowHostAccess(HostAccess.ALL)
                    .allowPolyglotAccess(PolyglotAccess.ALL)
                    .allowIO(true)
                    .engine(sharedEngine).build();

            ContextProvider contextProvider = new ContextProvider(context, version.get());

            // Inject globals object into the context
            if (globals != null) {
                context.getBindings(JS).putMember(globals.getName(), globals.getObject(contextProvider));
            }

            // Initialize context with available Server side JS from bundles
            for (Map.Entry<Bundle, Source> entry : initScripts.entrySet()) {
                try {
                    // Here we inject the bundle because registry is keeping track of witch bundle is registering stuff.
                    context.getBindings(JS).putMember("bundle", entry.getKey());
                    context.eval(entry.getValue());
                    context.getBindings(JS).removeMember("bundle");
                } catch (Exception e) {
                    logger.error("Cannot execute init script {}", entry.getValue(), e);
                }
            }

            // Initialize context with bundleInitializers
            Map<String, Object> filter = new HashMap<>();
            filter.put("type", "bundleInitializer");
            List<Map<String, Object>> parsers = contextProvider.getRegistry().find(filter);
            if (!parsers.isEmpty()) {
                for (Map.Entry<Bundle, Source> entry : initScripts.entrySet()) {
                    try {
                        contextProvider.getContext().getBindings(JS).putMember("bundle", entry.getKey());
                        for (Map<String, Object> parser : parsers) {
                            Value.asValue(parser.get("init")).execute(entry.getKey());
                        }
                        contextProvider.getContext().getBindings(JS).removeMember("bundle");
                    } catch (Exception e) {
                        logger.error("Cannot execute init script {}", entry.getValue(), e);
                    }
                }
            }

            return contextProvider;
        }

        @Override
        public PooledObject<ContextProvider> wrap(ContextProvider context) {
            return new DefaultPooledObject<>(context);
        }

        @Override
        public boolean validateObject(PooledObject<ContextProvider> p) {
            return version.get() == p.getObject().getVersion();
        }

        @Override
        public void destroyObject(PooledObject<ContextProvider> p) throws Exception {
            logger.debug("ContextPoolFactory.destroyObject");
            p.getObject().close();
        }
    }
}

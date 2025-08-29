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
package org.jahia.modules.javascript.modules.engine.jsengine;

import org.apache.commons.beanutils.BeanUtils;
import org.apache.commons.compress.utils.SeekableInMemoryByteChannel;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.pool2.BasePooledObjectFactory;
import org.apache.commons.pool2.PooledObject;
import org.apache.commons.pool2.impl.DefaultPooledObject;
import org.apache.commons.pool2.impl.GenericObjectPool;
import org.apache.commons.pool2.impl.GenericObjectPoolConfig;
import org.graalvm.home.Version;
import org.graalvm.polyglot.*;
import org.graalvm.polyglot.io.FileSystem;
import org.graalvm.polyglot.io.IOAccess;
import org.graalvm.polyglot.proxy.ProxyObject;
import org.jahia.modules.javascript.modules.engine.js.injector.OSGiServiceInjector;
import org.jahia.modules.javascript.modules.engine.js.server.ConfigHelper;
import org.jahia.modules.javascript.modules.engine.js.server.JcrHelper;
import org.jahia.modules.javascript.modules.engine.js.server.OSGiHelper;
import org.jahia.modules.javascript.modules.engine.js.server.RegistryHelper;
import org.jahia.modules.javascript.modules.engine.js.server.RenderHelper;
import org.jahia.modules.javascript.modules.engine.js.server.gql.GQLHelper;
import org.osgi.framework.Bundle;
import org.osgi.framework.BundleContext;
import org.osgi.service.component.annotations.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.net.URI;
import java.net.URL;
import java.nio.channels.SeekableByteChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.AccessMode;
import java.nio.file.DirectoryStream;
import java.nio.file.DirectoryStream.Filter;
import java.nio.file.LinkOption;
import java.nio.file.OpenOption;
import java.nio.file.Path;
import java.nio.file.attribute.FileAttribute;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;
import java.util.function.Function;

import static org.jahia.modules.javascript.modules.engine.jshandler.JavascriptProtocolConnection.BUNDLE_HEADER_JAVASCRIPT_INIT_SCRIPT;

/**
 * Base JS engine based on GraalVM
 */
@Component(service = GraalVMEngine.class, immediate = true)
public class GraalVMEngine {
    private static final Logger logger = LoggerFactory.getLogger(GraalVMEngine.class);

    public static final String JS = "js";
    private static final String UNKNOWN_SYS_PROP = "Unknown";

    private Engine sharedEngine;

    private GenericObjectPool<ContextProvider> pool;
    private final ThreadLocal<Stack<ContextProvider>> currentContext = ThreadLocal.withInitial(Stack::new);

    private final Map<Bundle, Source> initScripts = Collections.synchronizedMap(new LinkedHashMap<>());
    private final AtomicInteger version = new AtomicInteger(0);

    private BundleContext bundleContext;

    public BundleContext getBundleContext() {
        return bundleContext;
    }

    public void enableJavascriptModule(Bundle bundle) {
        try {
            initScripts.put(bundle,
                    getGraalSource(bundle, bundle.getHeaders().get(BUNDLE_HEADER_JAVASCRIPT_INIT_SCRIPT)));
            version.incrementAndGet();
            logger.info("Registered bundle {} in GraalVM engine", bundle.getSymbolicName());
        } catch (IOException ioe) {
            logger.error("Error enabling bundle {}", bundle.getSymbolicName(), ioe);
        }
    }

    public void disableJavascriptModule(Bundle bundle) {
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
            initScripts.put(bundleContext.getBundle(),
                    getGraalSource(bundleContext.getBundle(), "META-INF/js/main.js"));
        } catch (IOException e) {
            logger.error("Cannot execute main init script", e);
        }
        Engine.Builder builder = Engine.newBuilder();
        Map<String, String> poolOptions = new HashMap<>();
        boolean experimental = props.containsKey("experimental")
                && Boolean.parseBoolean(props.get("experimental").toString());
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
        return Source.newBuilder(JS, resource, bundle.getSymbolicName() + "/" + script)
                .mimeType("application/javascript+module").build();
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
        if (!Version.getCurrent().isRelease()) {
            String specVersion = System.getProperty("java.specification.version", UNKNOWN_SYS_PROP);
            String vendorVersion = System.getProperty("java.vendor.version", specVersion);
            String vendor = System.getProperty("java.vendor", UNKNOWN_SYS_PROP);
            logger.warn("Javascript Modules Engine requires GraalVM for production usage, detected {} (vendor: {}).",
                    vendorVersion, vendor);
            return;
        }

        // Check if the 'js' extension is installed
        try (Context context = Context.create()) {
            if (!context.getEngine().getLanguages().containsKey(JS)) {
                logger.error(
                        "Javascript Modules Engine detected GraalVM, but the 'js' extension is not installed. You can install it by running: gu install js");
            }
        }
    }

    private void initializePool(Map<String, String> poolOptions) {
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
                    .allowIO(IOAccess.newBuilder().fileSystem(new FileSystem() {
                        // Methods are in the same order as the execution order

                        @Override
                        public Path parsePath(String path) {
                            logger.info("parsePath: {}", path);

                            if (path.startsWith("/")) {
                                return Path.of(path);
                            }

                            return Path.of("/META-INF/js/libs", path + ".js");
                        }

                        @Override
                        public void checkAccess(Path path, Set<? extends AccessMode> modes, LinkOption... linkOptions) {
                            // This method is expected to throw when access is refused
                            // Never throw to always grant access
                            logger.info("checkAccess: {}", path.toString());
                        }

                        @Override
                        public Path toRealPath(Path path, LinkOption... linkOptions) throws IOException {
                            logger.info("toRealPath: {}", path.toString());
                            return path;
                        }

                        @Override
                        public Path toAbsolutePath(Path path) {
                            logger.info("toAbsolutePath: {}", path.toString());
                            // This method is called during the resolution process but the result is not
                            // used
                            // Not sure why
                            return path;
                        }

                        @Override
                        public SeekableByteChannel newByteChannel(Path path, Set<? extends OpenOption> options,
                                FileAttribute<?>... attrs) throws IOException {
                            logger.info("newByteChannel: {}", path.toString());
                            URL url = bundleContext.getBundle().getResource(path.toString());
                            return new SeekableInMemoryByteChannel(IOUtils.toByteArray(url.openStream()));
                        }

                        @Override
                        public Path parsePath(URI uri) {
                            throw new UnsupportedOperationException("Unimplemented method 'parsePath'");
                        }

                        @Override
                        public void createDirectory(Path dir, FileAttribute<?>... attrs) throws IOException {
                            throw new UnsupportedOperationException("Unimplemented method 'createDirectory'");
                        }

                        @Override
                        public void delete(Path path) throws IOException {
                            throw new UnsupportedOperationException("Unimplemented method 'delete'");
                        }

                        @Override
                        public DirectoryStream<Path> newDirectoryStream(Path dir, Filter<? super Path> filter)
                                throws IOException {
                            throw new UnsupportedOperationException("Unimplemented method 'newDirectoryStream'");
                        }

                        @Override
                        public Map<String, Object> readAttributes(Path path, String attributes, LinkOption... options)
                                throws IOException {
                            throw new UnsupportedOperationException("Unimplemented method 'readAttributes'");
                        }
                    }).build())
                    .engine(sharedEngine).build();

            ContextProvider contextProvider = new ContextProvider(context, version.get());

            // Add the global "server" variable to the context
            context.getBindings(JS).putMember("server", getServer(contextProvider));

            // Initialize context with available Server side JS from bundles
            for (Map.Entry<Bundle, Source> entry : initScripts.entrySet()) {
                try {
                    // Here we inject the bundle because registry is keeping track of witch bundle
                    // is registering stuff.
                    context.getBindings(JS).putMember("bundle", entry.getKey());
                    context.eval(entry.getValue());
                    context.getBindings(JS).removeMember("bundle");
                } catch (Exception e) {
                    logger.error("Cannot execute init script {} in bundle {}", entry.getValue(), entry.getKey(), e);
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

    /**
     * Creates the global js variable named `server` in js context. It holds a
     * reference to several
     * server-side helpers.
     *
     * @param context
     * @return
     */
    public ProxyObject getServer(ContextProvider context) {
        Map<String, Object> server = new HashMap<>();
        server.put("config", new ConfigHelper());
        server.put("registry", new RegistryHelper(context));
        server.put("render", new RenderHelper());
        server.put("gql", new GQLHelper(context));
        server.put("osgi", new OSGiHelper());
        server.put("jcr", new JcrHelper());

        for (Map.Entry<String, Object> entry : server.entrySet()) {
            try {
                OSGiServiceInjector.handleMethodInjection(entry.getValue());
            } catch (IllegalAccessException | InvocationTargetException e) {
                logger.error("Cannot inject services for {} helper", entry.getKey(), e);
            }
        }

        return ProxyObject.fromMap(server);
    }
}

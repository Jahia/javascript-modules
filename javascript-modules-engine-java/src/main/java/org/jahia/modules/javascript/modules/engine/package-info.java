@Java2TS(declare = {

        @Type(value = java.nio.file.Files.class, export = true),
        @Type(java.nio.file.Path.class),
        @Type(value = java.nio.file.Paths.class, export = true),

        @Type(value = java.util.stream.Stream.class, export = true),

        @Type(java.util.Collection.class),
        @Type(java.util.Map.class),
        @Type(value = java.util.List.class, alias = "List"),
        @Type(java.util.Set.class),
        @Type(value = java.util.Arrays.class, export = true),

        @Type(java.util.Optional.class),

        @Type(value = java.net.URI.class, export = true),
        @Type(java.net.URL.class),

        @Type(value = java.lang.Runnable.class, functional = true),
        @Type(org.osgi.framework.Bundle.class)
}, name="foo")
package org.jahia.modules.javascript.modules.engine;

import org.bsc.processor.annotation.Java2TS;
import org.bsc.processor.annotation.Type;
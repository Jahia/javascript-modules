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

import org.jahia.modules.javascript.modules.engine.contentpatches.ContentPatchOperations;
import org.jahia.modules.javascript.modules.engine.contentpatches.impl.ContentPatchOperationsImpl;
import org.jahia.modules.javascript.modules.engine.contentpatches.impl.ContentPatchServiceImpl;
import org.osgi.framework.Bundle;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Java support object handed to a JavaScript content patch when it is executed. It carries the
 * per-content patch logger, the dry-run flag, module metadata, and hands out the shared
 * {@link ContentPatchOperations} engine bound to the module and to that logger.
 *
 * <p>The JS side (the {@code registerContentPatch} wrapper in the library) builds the idiomatic
 * {@code ContentPatchContext} from this object — keep both shapes in sync.
 */
public class ContentPatchSupport {

    private final Bundle bundle;
    private final boolean dryRun;

    public ContentPatchSupport(Bundle bundle, boolean dryRun) {
        this.bundle = bundle;
        this.dryRun = dryRun;
    }

    /** Logger dedicated to one content patch, named {@code …contentpatches.<module>.<patchName>}. */
    public Logger getLogger(String patchName) {
        return LoggerFactory.getLogger(
                ContentPatchServiceImpl.LOGGER_PREFIX + bundle.getSymbolicName() + "." + patchName);
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

    /**
     * The operations engine bound to this module (owned-definition checks), the dry-run flag, and
     * the given content patch's logger — what the library exposes as {@code patch.*} and
     * {@code jcr.forEachNode}.
     */
    public ContentPatchOperations getOperations(String patchName) {
        return new ContentPatchOperationsImpl(bundle.getSymbolicName(), dryRun, getLogger(patchName));
    }
}

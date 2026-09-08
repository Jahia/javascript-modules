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

import org.osgi.framework.Bundle;

public interface Registrar {

    void register(Bundle bundle);

    void unregister(Bundle bundle);

    /**
     * Whether this registrar takes part in a development server's hot reload, which re-runs
     * {@link #unregister} then {@link #register} on every save.
     *
     * <p>Registrars that publish what the module declares are fine with that rhythm. A registrar
     * that also performs a one-off effect on registration is not, and must opt out: at save
     * frequency the effect would run over and over, and its record of having run is what a redeploy
     * is expected to produce, not an editor keystroke.
     */
    default boolean runsOnHotReload() {
        return true;
    }
}

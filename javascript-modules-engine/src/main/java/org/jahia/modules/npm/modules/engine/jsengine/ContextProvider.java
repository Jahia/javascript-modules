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

import org.graalvm.polyglot.Context;

public class ContextProvider {

    private int version;
    private final Context context;

    private final Registry registry;

    public ContextProvider(Context cx, int version) {
        this.context = cx;
        this.registry = new Registry(cx);
        this.version = version;
    }

    public Context getContext() {
        return context;
    }

    protected int getVersion() {
        return version;
    }

    public Registry getRegistry() {
        return registry;
    }

    public void close() {
        context.close();
    }
}

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
package org.jahia.modules.npm.modules.engine.npmhandler;

import org.apache.felix.fileinstall.ArtifactListener;
import org.apache.felix.fileinstall.ArtifactUrlTransformer;
import org.osgi.service.component.annotations.Component;

import java.io.File;
import java.net.URL;

/**
 * Artifact transformer for tgz files dropped in file install
 */
@Component(service = {ArtifactUrlTransformer.class, ArtifactListener.class}, property = {"url.handler.protocol=npm"}, immediate = true)
public class FileinstallTgzTransformer implements ArtifactUrlTransformer {
    @Override
    public boolean canHandle(File file) {
        return file.getName().endsWith(".tgz");
    }

    @Override
    public URL transform(URL url) throws Exception {
        return new URL("npm://" + url.toExternalForm());
    }
}

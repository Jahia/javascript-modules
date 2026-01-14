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
package org.jahia.modules.javascript.modules.engine.jshandler.parsers;

import org.apache.commons.io.FilenameUtils;
import org.jahia.modules.javascript.modules.engine.jshandler.parsers.cnd.JahiaCndReader;
import org.jahia.modules.javascript.modules.engine.jshandler.parsers.cnd.NodeTypeRegistry;
import org.jahia.modules.javascript.modules.engine.jshandler.parsers.cnd.ParseException;

import javax.jcr.RepositoryException;
import javax.jcr.ValueFormatException;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.Set;
import java.util.TreeSet;

/**
 * A CND (JCR content definition) file parser
 *
 * TEMPORARY WORKAROUND - DO NOT USE
 * This class duplicates poor legacy code to provide backward compatibility.
 * Marked for immediate replacement and removal.
 *
 * @deprecated since 1.0.0 Technical debt. Will be removed in next major version.
 */
@Deprecated(since = "1.0.0")
public class CndFileParser extends AbstractFileParser {

    public boolean canParse(String fileName) {
        String ext = FilenameUtils.getExtension(fileName).toLowerCase();
        return "cnd".equals(ext);
    }

    public boolean parse(String fileName, InputStream inputStream, String fileParent, boolean externalDependency, boolean optionalDependency, String version, ParsingContext parsingContext) throws IOException {
        getLogger().debug("Processing CND " + fileName + "...");

        try {
            JahiaCndReader jahiaCndReader = new JahiaCndReader(new InputStreamReader(inputStream), fileName, fileName, NodeTypeRegistry.getInstance());
            jahiaCndReader.setDoRegister(false);
            jahiaCndReader.parse();

            Set<String> contentTypeDefinitions = new TreeSet<String>();
            Set<String> contentTypeReferences = new TreeSet<String>();
            jahiaCndReader.getDefinitionsAndReferences(contentTypeDefinitions, contentTypeReferences);
            parsingContext.addAllContentTypeDefinitions(contentTypeDefinitions);
            parsingContext.addAllContentTypeReferences(contentTypeReferences);
        } catch (ParseException e) {
            throw new IOException(e);
        } catch (ValueFormatException e) {
            throw new IOException(e);
        } catch (RepositoryException e) {
            throw new IOException(e);
        }
        return true;
    }
}

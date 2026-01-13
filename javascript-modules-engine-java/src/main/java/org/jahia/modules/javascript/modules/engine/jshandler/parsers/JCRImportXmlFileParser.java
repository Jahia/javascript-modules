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

import org.jdom2.Element;
import org.jdom2.JDOMException;

/**
 * JCR Import file parser
 *
 * TEMPORARY WORKAROUND - DO NOT USE
 * This class duplicates poor legacy code to provide backward compatibility.
 * Marked for immediate replacement and removal.
 *
 * @deprecated since 1.0.0 Technical debt. Will be removed in next major version.
 */
@Deprecated(since = "1.0.0")
public class JCRImportXmlFileParser extends AbstractXmlFileParser {

    private final static String[] JCR_IMPORT_XPATH_QUERIES = {
            "//@jcr:primaryType",
            "//@jcr:mixinTypes"
    };

    @Override
    public boolean canParse(String fileName, Element rootElement) {
        boolean canParse = hasNamespaceURI(rootElement, "http://www.jcp.org/jcr/1.0");
        if (!canParse) {
            getLogger().warn("Can't parse JCR Import XML file at " + fileName + " missing namespace http://www.jcp.org/jcr/1.0 in root element");
        }
        return canParse;
    }

    @Override
    public void parse(String fileName, Element rootElement, String fileParent, boolean externalDependency, boolean optionalDependency, String version, ParsingContext parsingContext) throws JDOMException {
        getLogger().debug("Processing JCR import file " + fileParent + " / " + fileName + "...");

        getRefsUsingXPathQueries(fileName, rootElement, false, false, JCR_IMPORT_XPATH_QUERIES, "xp", fileParent, version, optionalDependency, parsingContext);
    }
}

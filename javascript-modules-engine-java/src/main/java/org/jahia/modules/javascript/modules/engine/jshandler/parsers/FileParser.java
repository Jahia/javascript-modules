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

import org.slf4j.Logger;

import java.io.IOException;
import java.io.InputStream;

/**
 * Defines a parser interface that will parse the contents of a file to find package references inside of it.
 *
 * TEMPORARY WORKAROUND - DO NOT USE
 * This class duplicates poor legacy code to provide backward compatibility.
 * Marked for immediate replacement and removal.
 *
 * @deprecated since 1.0.0 Technical debt. Will be removed in next major version.
 */
@Deprecated(since = "1.0.0")
public interface FileParser {

    Logger getLogger();

    void setLogger(Logger logger);

    int getPriority();

    boolean canParse(String fileName);

    boolean parse(String fileName, InputStream inputStream, String fileParent, boolean externalDependency, boolean optionalDependency, String version, ParsingContext parsingContext) throws IOException;

}

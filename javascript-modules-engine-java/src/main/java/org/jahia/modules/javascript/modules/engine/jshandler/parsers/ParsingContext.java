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

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.io.Serializable;
import java.util.*;

/**
 * Context for parsing files
 *
 * TEMPORARY WORKAROUND - DO NOT USE
 * This class duplicates poor legacy code to provide backward compatibility.
 * Marked for immediate replacement and removal.
 *
 * @deprecated since 1.0.0 Technical debt. Will be removed in next major version.
 */
@Deprecated(since = "1.0.0")
public class ParsingContext implements Serializable {

    protected String mavenCoords;
    protected long lastModified;
    protected long fileSize;
    protected String fileName;
    protected String filePath;
    protected String version;
    protected boolean inCache = false;
    private Set<String> contentTypeDefinitions = new TreeSet<>();
    private Set<String> contentTypeReferences = new TreeSet<>();
    private boolean osgiBundle = false;
    private List<String> bundleClassPath = new ArrayList<>();

    @JsonIgnore protected List<ParsingContext> children = new ArrayList<>();
    @JsonIgnore Boolean optional = null;
    @JsonIgnore Boolean external = null;

    public ParsingContext() {
    }


    public Set<String> getContentTypeDefinitions() {
        return contentTypeDefinitions;
    }

    public boolean addAllContentTypeDefinitions(Set<String> newContentTypeDefinitions) {
        return contentTypeDefinitions.addAll(newContentTypeDefinitions);
    }

    public Set<String> getContentTypeReferences() {
        return contentTypeReferences;
    }

    public boolean addContentTypeReference(String contentTypeReference) {
        return contentTypeReferences.add(contentTypeReference);
    }

    public boolean addAllContentTypeReferences(Set<String> newContentTypeReferences) {
        return contentTypeReferences.addAll(newContentTypeReferences);
    }

    public long getFileSize() {
        return fileSize;
    }

    public String getFileName() {
        return fileName;
    }

    public String getFilePath() {
        return filePath;
    }

    public List<ParsingContext> getChildren() {
        return children;
    }

    public boolean isOptional() {
        if (optional == null) {
            return false;
        }
        return optional;
    }

    /**
     * This method will only set the optional state if it was not set before or if the new state is not optional
     * @param optional
     */
    public void setOptional(boolean optional) {
        if (this.optional == null) {
            this.optional = optional;
        }
        if (this.optional && !optional) {
            this.optional = optional;
        }
    }

    public boolean isExternal() {
        if (this.external == null) {
            return false;
        }
        return external;
    }

    public void setExternal(boolean external) {
        if (this.external != null) {

        }
        this.external = external;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    @Override
    public String toString() {
        final StringBuffer sb = new StringBuffer("ParsingContext{");
        sb.append("mavenCoords='").append(mavenCoords).append('\'');
        sb.append(", lastModified=").append(lastModified);
        sb.append(", fileSize=").append(fileSize);
        sb.append(", fileName='").append(fileName).append('\'');
        sb.append(", filePath='").append(filePath).append('\'');
        sb.append(", version='").append(version).append('\'');
        sb.append(", inCache=").append(inCache);
        sb.append(", optional=").append(optional);
        sb.append(", external=").append(external);
        sb.append(", osgiBundle=").append(osgiBundle);
        sb.append(", bundleClassPath=").append(bundleClassPath);
        sb.append('}');
        return sb.toString();
    }

}

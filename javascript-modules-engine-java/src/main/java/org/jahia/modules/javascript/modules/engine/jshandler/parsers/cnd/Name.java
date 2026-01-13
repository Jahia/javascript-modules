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
package org.jahia.modules.javascript.modules.engine.jshandler.parsers.cnd;

import org.apache.commons.lang3.StringUtils;

import java.util.Map;

/**
 *
 * User: toto
 * Date: 14 mars 2008
 * Time: 18:43:40
 *
 */
class Name {
    private String localName;
    private String prefix;
    private String uri;

    private String preComputedToString;
    private int preComputedHashCode;

    public Name(String localName, String prefix, String uri) {
        this.localName = localName;
        this.prefix = prefix;
        this.uri = uri;
    }

    public Name(String qualifiedName, Map<String,String> namespaceMapping) {
        if (qualifiedName.startsWith("{")) {
            int endUri = qualifiedName.indexOf("}");
            if (endUri != -1 && qualifiedName.length() > endUri) {
                uri = StringUtils.substringBetween(qualifiedName, "{", "}");
                for (Map.Entry<String, String> entry : namespaceMapping.entrySet()) {
                    if (entry.getValue().equals(uri)) {
                        prefix = entry.getKey();
                        break;
                    }
                }
                localName = qualifiedName.substring(endUri + 1);
            } else {
                localName = qualifiedName;
                prefix = "";
                uri = namespaceMapping.get("");
            }
        }
        if (localName == null) {
            String s[] = Patterns.COLON.split(qualifiedName);
            if (s.length == 2) {
                prefix = s[0];
                localName = s[1];
                uri = namespaceMapping.get(prefix);
            } else {
                prefix = "";
                localName = s[0];
                uri = namespaceMapping.get("");
            }
        }
    }

    public String getLocalName() {
        return localName;
    }

    public String getPrefix() {
        return prefix;
    }

    public String getUri() {
        return uri;
    }

    public String toString() {
        if (preComputedToString != null) {
            return preComputedToString;
        }
        if (prefix.equals("")) {
            preComputedToString = localName;
            return preComputedToString;
        } else {
            preComputedToString = prefix + ":" + localName;
            return preComputedToString;
        }
    }

    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;

        Name name = (Name) o;

        if (localName != null ? !localName.equals(name.localName) : name.localName != null) return false;
        if (uri != null ? !uri.equals(name.uri) : name.uri != null) return false;

        return true;
    }

    public int hashCode() {
        if (preComputedHashCode != 0) {
            return preComputedHashCode;
        }
        int result;
        result = (localName != null ? localName.hashCode() : 0);
        result = 31 * result + (prefix != null ? prefix.hashCode() : 0);
        result = 31 * result + (uri != null ? uri.hashCode() : 0);
        preComputedHashCode = result;
        return preComputedHashCode;
    }
}

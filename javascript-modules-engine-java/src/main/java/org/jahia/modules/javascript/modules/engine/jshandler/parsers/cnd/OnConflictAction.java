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

/**
 *
 * User: toto
 * Date: Feb 4, 2010
 * Time: 8:24:09 PM
 *
 */
class OnConflictAction {
    public static final int IGNORE = 0;
    public static final int UNRESOLVED = 1;
    public static final int USE_SOURCE = 2;
    public static final int USE_TARGET = 3;
    public static final int USE_OLDEST = 4;
    public static final int USE_LATEST = 5;
    public static final int NUMERIC_USE_MIN = 6;
    public static final int NUMERIC_USE_MAX = 7;
    public static final int NUMERIC_SUM = 8;
    public static final int TEXT_MERGE = 9;

    /**
     * The names of the defined on-conflict actions, as used in serialization.
     */
    public static final String ACTIONNAME_USE_OLDEST = "oldest";
    public static final String ACTIONNAME_USE_LATEST = "latest";
    public static final String ACTIONNAME_NUMERIC_USE_MIN = "min";
    public static final String ACTIONNAME_NUMERIC_USE_MAX = "max";
    public static final String ACTIONNAME_NUMERIC_SUM = "sum";

    /**
     * Returns the name of the specified <code>action</code>, as used in
     * serialization.
     *
     * @param action the on-conflict action
     * @return the name of the specified <code>action</code>
     * @throws IllegalArgumentException if <code>action</code> is not a valid
     *                                  on-conflict action.
     */
    public static String nameFromValue(int action) {
        switch (action) {
            case USE_OLDEST:
                return ACTIONNAME_USE_OLDEST;
            case USE_LATEST:
                return ACTIONNAME_USE_LATEST;
            case NUMERIC_USE_MIN:
                return ACTIONNAME_NUMERIC_USE_MIN;
            case NUMERIC_USE_MAX:
                return ACTIONNAME_NUMERIC_USE_MAX;
            case NUMERIC_SUM:
                return ACTIONNAME_NUMERIC_SUM;
            default:
                throw new IllegalArgumentException("unknown on-conflict action: " + action);
        }
    }

    /**
     * Returns the numeric constant value of the on-conflict action with the
     * specified name.
     *
     * @param name the name of the on-conflict action
     * @return the numeric constant value
     * @throws IllegalArgumentException if <code>name</code> is not a valid
     *                                  on-conflict action name.
     */
    public static int valueFromName(String name) {
        if (name.equals(ACTIONNAME_USE_OLDEST)) {
            return USE_OLDEST;
        } else if (name.equals(ACTIONNAME_USE_LATEST)) {
            return USE_LATEST;
        } else if (name.equals(ACTIONNAME_NUMERIC_USE_MIN)) {
            return NUMERIC_USE_MIN;
        } else if (name.equals(ACTIONNAME_NUMERIC_USE_MAX)) {
            return NUMERIC_USE_MAX;
        } else if (name.equals(ACTIONNAME_NUMERIC_SUM)) {
            return NUMERIC_SUM;
        } else {
            throw new IllegalArgumentException("unknown on-conflict action: " + name);
        }
    }
}

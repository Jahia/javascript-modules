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

import javax.jcr.PropertyType;
import java.util.HashMap;
import java.util.Map;

/**
 *
 * User: toto
 * Date: 14 mars 2008
 * Time: 17:06:46
 *
 */
class SelectorType {
    public static final int SMALLTEXT = 1;
    public static final int RICHTEXT = 2;
    public static final int DATETIMEPICKER = 3;
    public static final int DATEPICKER = 4;
    public static final int TEXTAREA = 5;
    public static final int CONTENTPICKER = 9;
    public static final int FILEUPLOAD = 10;
    public static final int CHECKBOX = 11;
    public static final int COLOR = 12;
    public static final int CATEGORY = 13;
    public static final int CHOICELIST = 14;
    public static final int CRON = 15;
    public static final int TAG = 16;

    public static final int PAGE = 21;

    public static final String SELECTORNAME_SMALLTEXT = "Text";
    public static final String SELECTORNAME_RICHTEXT = "RichText";
    public static final String SELECTORNAME_DATETIMEPICKER = "DateTimePicker";
    public static final String SELECTORNAME_DATEPICKER = "DatePicker";
    public static final String SELECTORNAME_TEXTAREA = "TextArea";
    public static final String SELECTORNAME_CONTENTPICKER = "Picker";
    public static final String SELECTORNAME_FILEUPLOAD = "FileUpload";
    public static final String SELECTORNAME_CHECKBOX = "Checkbox";
    public static final String SELECTORNAME_COLOR = "Color";
    public static final String SELECTORNAME_CATEGORY = "Category";
    public static final String SELECTORNAME_CHOICELIST = "Choicelist";
    public static final String SELECTORNAME_TAG = "Tag";

    public static final Map<Integer, Integer> defaultSelectors = new HashMap<Integer, Integer>();
    public static final Map<String, Integer> nameToValue = new HashMap<String, Integer>();
    public static final Map<Integer, String> valueToName = new HashMap<Integer, String>();

    static {
        nameToValue.put(SELECTORNAME_SMALLTEXT, SMALLTEXT);
        nameToValue.put(SELECTORNAME_RICHTEXT, RICHTEXT);
        nameToValue.put(SELECTORNAME_DATETIMEPICKER, DATETIMEPICKER);
        nameToValue.put(SELECTORNAME_DATEPICKER, DATEPICKER);
        nameToValue.put(SELECTORNAME_TEXTAREA, TEXTAREA);
        nameToValue.put(SELECTORNAME_CONTENTPICKER, CONTENTPICKER);
        nameToValue.put(SELECTORNAME_FILEUPLOAD, FILEUPLOAD);
        nameToValue.put(SELECTORNAME_CHECKBOX, CHECKBOX);
        nameToValue.put(SELECTORNAME_COLOR, COLOR);
        nameToValue.put(SELECTORNAME_CATEGORY, CATEGORY);
        nameToValue.put(SELECTORNAME_CHOICELIST, CHOICELIST);
        nameToValue.put(SELECTORNAME_TAG, TAG);

        valueToName.put(SMALLTEXT, SELECTORNAME_SMALLTEXT);
        valueToName.put(RICHTEXT, SELECTORNAME_RICHTEXT);
        valueToName.put(DATETIMEPICKER, SELECTORNAME_DATETIMEPICKER);
        valueToName.put(DATEPICKER, SELECTORNAME_DATEPICKER);
        valueToName.put(TEXTAREA, SELECTORNAME_TEXTAREA);
        valueToName.put(CONTENTPICKER, SELECTORNAME_CONTENTPICKER);
        valueToName.put(FILEUPLOAD, SELECTORNAME_FILEUPLOAD);
        valueToName.put(CHECKBOX, SELECTORNAME_CHECKBOX);
        valueToName.put(COLOR, SELECTORNAME_COLOR);
        valueToName.put(CATEGORY, SELECTORNAME_CATEGORY);
        valueToName.put(CHOICELIST, SELECTORNAME_CHOICELIST);
        valueToName.put(TAG, SELECTORNAME_TAG);

        defaultSelectors.put(PropertyType.STRING, SMALLTEXT);
        defaultSelectors.put(PropertyType.LONG, SMALLTEXT);
        defaultSelectors.put(PropertyType.DOUBLE, SMALLTEXT);
        defaultSelectors.put(PropertyType.DATE, DATETIMEPICKER);
        defaultSelectors.put(PropertyType.BOOLEAN, CHECKBOX);
        defaultSelectors.put(PropertyType.NAME, SMALLTEXT);
        defaultSelectors.put(PropertyType.PATH, SMALLTEXT);
    }

    public static String nameFromValue(int i) {
        return valueToName.get(i);
    }

    public static int valueFromName(String s) {
        return nameToValue.get(s);
    }

    public static Map<String, Integer> getNameToValue() {
        return nameToValue;
    }

    public static Map<Integer, String> getValueToName() {
        return valueToName;
    }
}

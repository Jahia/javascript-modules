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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.jcr.PropertyType;
import javax.jcr.RepositoryException;
import javax.jcr.Value;
import javax.jcr.nodetype.PropertyDefinition;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * User: toto
 * Date: 4 janv. 2008
 * Time: 14:02:49
 */
class ExtendedPropertyDefinition extends ExtendedItemDefinition implements PropertyDefinition {
    private static Logger logger = LoggerFactory.getLogger(ExtendedPropertyDefinition.class);

    private NodeTypeRegistry registry;

    private int requiredType = 0;

    private boolean internationalized = false;

    private Value[] valueConstraints = new Value[0];
    private Value[] defaultValues = new Value[0];

    private boolean multiple;

    public static final int INDEXED_NO = IndexType.NO;
    public static final int INDEXED_TOKENIZED = IndexType.TOKENIZED;
    public static final int INDEXED_UNTOKENIZED = IndexType.UNTOKENIZED;
    public static final int STORE_YES = 0;
    public static final int STORE_NO = 1;
    public static final int STORE_COMPRESS = 2;

    private int index = IndexType.TOKENIZED;
    private double scoreboost = 1.;
    private String analyzer;

    private boolean queryOrderable = true;
    private boolean fulltextSearchable = true;
    private boolean facetable = false;
    private boolean hierarchical = false;
    private String[] availableQueryOperators = Lexer.ALL_OPERATORS;

    private Map<Locale, Map<String, String>> messageMaps = new ConcurrentHashMap<Locale, Map<String, String>>(1);

    public ExtendedPropertyDefinition(NodeTypeRegistry registry) {
        this.registry = registry;
    }

    public void setDeclaringNodeType(ExtendedNodeType declaringNodeType) {
        super.setDeclaringNodeType(declaringNodeType);
        declaringNodeType.setPropertyDefinition(getName(), this);
    }

    public int getRequiredType() {
        return requiredType;
    }

    public void setRequiredType(int requiredType) {
        this.requiredType = requiredType;
        if (selector == 0 && SelectorType.defaultSelectors.get(requiredType) != null) {
            setSelector(SelectorType.defaultSelectors.get(requiredType));
        }
    }

    public Value[] getValueConstraintsAsUnexpandedValue() {
        return valueConstraints;
    }

    public Value[] getValueConstraintsAsValue() {
        List<Value> res = new ArrayList<Value>();
        for (int i = 0; i < valueConstraints.length; i++) {
            if (valueConstraints[i] instanceof DynamicValueImpl) {
                Value[] v = ((DynamicValueImpl)valueConstraints[i]).expand();
                for (Value value : v) {
                    res.add(value);
                }
            } else {
                res.add(valueConstraints[i]);
            }
        }
        return res.toArray(new Value[res.size()]);
    }

    public String[] getValueConstraints() {
        Value[] value = getValueConstraintsAsValue();
        String[] res = new String[value.length];
        for (int i = 0; i < value.length; i++) {
            try {
                res[i] = value[i].getString();
            } catch (RepositoryException e) {
            }
        }
        return res;
    }

    public void setValueConstraints(Value[] valueConstraints) {
        if (requiredType != PropertyType.BOOLEAN) {
            this.valueConstraints = valueConstraints;
        }
    }

    public Value[] getDefaultValues() {
        List<Value> res = new ArrayList<Value>();
        for (int i = 0; i < defaultValues.length; i++) {
            if (defaultValues[i] instanceof DynamicValueImpl) {
                Value[] v = ((DynamicValueImpl)defaultValues[i]).expand();
                for (Value value : v) {
                    res.add(value);
                }
            } else {
                res.add(defaultValues[i]);
            }
        }
        return res.toArray(new Value[res.size()]);
    }

    public void setDefaultValues(Value[] defaultValues) {
        this.defaultValues = defaultValues;
    }

    public boolean isMultiple() {
        return multiple;
    }

    public void setMultiple(boolean multiple) {
        this.multiple = multiple;
    }

    public boolean isInternationalized() {
        return internationalized;
    }

    public void setInternationalized(boolean internationalized) {
        this.internationalized = internationalized;
    }

    public int getIndex() {
        return index;
    }

    public void setIndex(int index) {
        this.index = index;
    }

    public double getScoreboost() {
        return scoreboost;
    }

    public void setScoreboost(double scoreboost) {
        this.scoreboost = scoreboost;
    }

    public String getAnalyzer() {
        return analyzer;
    }

    public void setAnalyzer(String analyzer) {
        this.analyzer = analyzer;
    }

    public boolean isQueryOrderable() {
        return queryOrderable;
    }

    public void setQueryOrderable(boolean sortable) {
        this.queryOrderable = sortable;
    }

    public boolean isFacetable() {
        return facetable;
    }

    public void setFacetable(boolean facetable) {
        this.facetable = facetable;
    }

    public boolean isHierarchical() {
        return hierarchical;
    }

    public void setHierarchical(boolean hierarchical) {
        this.hierarchical = hierarchical;
    }

    public boolean isFullTextSearchable() {
        return fulltextSearchable;
    }

    public void setFullTextSearchable(boolean fulltextSearchable) {
        this.fulltextSearchable = fulltextSearchable;
    }

    public String[] getAvailableQueryOperators() {
        return availableQueryOperators;
    }

    public void setAvailableQueryOperators(String[] availableQueryOperators) {
        this.availableQueryOperators = availableQueryOperators;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        if (!super.equals(o)) return false;

        ExtendedPropertyDefinition that = (ExtendedPropertyDefinition) o;
        if (name.toString().equals("*")) {
            if (requiredType != that.requiredType) return false;
            if (multiple != that.multiple) return false;
        }

        return super.equals(o);
    }

    public void remove() {
        declaringNodeType.removePropertyDefinition(this);
    }
}

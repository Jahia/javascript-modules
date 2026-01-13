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
import org.slf4j.Logger;

import javax.jcr.Binary;
import javax.jcr.RepositoryException;
import javax.jcr.Value;
import javax.jcr.ValueFormatException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.List;

/**
 *
 * User: toto
 * Date: Apr 3, 2008
 * Time: 12:26:22 PM
 *
 */
class DynamicValueImpl implements Value {

    private static final transient Logger logger = org.slf4j.LoggerFactory.getLogger(DynamicValueImpl.class);

    private List<String> params;
    protected ExtendedPropertyDefinition declaringPropertyDefinition;
    private String fn;
    protected int type;
    private boolean isConstraint;

    public DynamicValueImpl(String fn, List<String> params, int type, boolean isConstraint, ExtendedPropertyDefinition declaringPropertyDefinition) {
        this.type = type;
        this.fn = fn;
        this.params = params;
        this.isConstraint = isConstraint;
        this.declaringPropertyDefinition = declaringPropertyDefinition;
    }

    public String getString() throws ValueFormatException, IllegalStateException, RepositoryException {
        return getExpandedValue().getString();
    }

    public InputStream getStream() throws IllegalStateException, RepositoryException {
        return getExpandedValue().getStream();
    }

    public long getLong() throws IllegalStateException, RepositoryException {
        return getExpandedValue().getLong();
    }

    public double getDouble() throws ValueFormatException, IllegalStateException, RepositoryException {
        return getExpandedValue().getDouble();
    }

    public Calendar getDate() throws ValueFormatException, IllegalStateException, RepositoryException {
        return getExpandedValue().getDate();
    }

    public boolean getBoolean() throws ValueFormatException, IllegalStateException, RepositoryException {
        return getExpandedValue().getBoolean();
    }

    public Binary getBinary() throws RepositoryException {
        return getExpandedValue().getBinary();
    }

    public BigDecimal getDecimal() throws ValueFormatException, RepositoryException {
        return getExpandedValue().getDecimal();
    }

    public int getType() {
        return type;
    }

    public String getFn() {
        return fn;
    }

    public List<String> getParams() {
        return params;
    }

//    public String getString() {
//        if (fn.equals("now")) {
//            return ISO8601.format(new GregorianCalendar());
//        } else if (fn.equals("resourceKey")) {
//            String bundleId = ((ExtendedNodeType) declaringPropertyDefinition.getDeclaringNodeType()).getResourceBundleId();
//            return ResourceBundleMarker.drawMarker(bundleId,declaringPropertyDefinition.getResourceBundleKey()+"."+getParams().get(0),getParams().get(0));
//        } else if (fn.equals("useClass")) {
//            String classname = getParams().get(0);
//            try {
//                ValueInitializer init = (ValueInitializer) Class.forName(classname).newInstance();
//                return init.getValue(Jahia.getThreadParamBean());
//            } catch (InstantiationException e) {
//                logger.error(e.getMessage(), e);
//            } catch (IllegalAccessException e) {
//                logger.error(e.getMessage(), e);
//            } catch (ClassNotFoundException e) {
//                logger.error(e.getMessage(), e);
//            }
//        }
//        return null;
//    }

    public Value[] expand() {
        Value[] v = null;
        String classname;
        if (fn.equals("useClass")) {
            classname = getParams().get(0);
        } else {
            classname = "org.jahia.services.content.nodetypes.initializers."+ StringUtils.capitalize(fn);
        }
        try {
            ValueInitializer init = (ValueInitializer) Class.forName(classname).newInstance();
            v = init.getValues(declaringPropertyDefinition, getParams());
        } catch (InstantiationException e) {
            logger.error(e.getMessage(), e);
        } catch (IllegalAccessException e) {
            logger.error(e.getMessage(), e);
        } catch (ClassNotFoundException e) {
            logger.error(e.getMessage(), e);
        }
        List<Value> res = new ArrayList<Value>();
        if (v != null) {
            for (int i = 0; i < v.length; i++) {
                Value value = v[i];
                if (value instanceof DynamicValueImpl) {
                    res.addAll(Arrays.asList(((DynamicValueImpl)value).expand()));
                } else {
                    res.add(value);
                }
            }
        }
        return res.toArray(new Value[res.size()]);
    }

    private Value getExpandedValue() throws ValueFormatException {
        Value[] v = expand();
        if (v.length == 1) {
            return v[0];
        } else {
            throw new ValueFormatException("Dynamic value expanded to none/multiple values : "+v.length );
        }
    }
}

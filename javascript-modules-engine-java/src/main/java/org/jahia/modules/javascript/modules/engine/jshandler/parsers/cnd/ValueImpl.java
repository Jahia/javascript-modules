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

import javax.jcr.*;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.UnsupportedEncodingException;
import java.math.BigDecimal;
import java.util.Calendar;
import java.util.regex.Pattern;

/**
 * Implementation of the JCR's {@link Value} interface for holding property
 * values of different types.
 *
 * @author Thomas Draier
 */
class ValueImpl implements Value {

    private static final Logger logger = org.slf4j.LoggerFactory.getLogger(ValueImpl.class);

    protected String value;
    protected int type;

    public ValueImpl(String v) {
        this(v, PropertyType.STRING);
    }

    public ValueImpl(String v, int type) {
        this(v, type, false);
    }

    public ValueImpl(Calendar c) {
        this(ISO8601.format(c), PropertyType.DATE);
    }

    public ValueImpl(boolean b) {
        this(Boolean.toString(b), PropertyType.BOOLEAN);
    }

    public ValueImpl(long b) {
        this(Long.toString(b), PropertyType.LONG);
    }

    public ValueImpl(double d) {
        this(Double.toString(d), PropertyType.DOUBLE);
    }

    public ValueImpl(String v, int type, boolean isConstraint) {
        this.value = v;
        this.type = type;

        if (value != null && !isConstraint) {
            switch (type) {
                case PropertyType.LONG :
                    this.value = Long.toString(new Double(value).longValue());
                    break;
            }
        }

        if (value != null && isConstraint) {
            switch (type) {
                // handle constant constraint
                case PropertyType.LONG :
                case PropertyType.DOUBLE :
                case PropertyType.DATE :
                case PropertyType.BINARY :
                    if (value.indexOf(',') == -1) value = "["+value+","+value+"]";
            }
        }

    }

    public String getString() throws ValueFormatException, IllegalStateException, RepositoryException {
        return value;
    }

    public InputStream getStream() throws IllegalStateException, RepositoryException {
        String s = getString();
        try {
            return new ByteArrayInputStream(s.getBytes("UTF-8"));
        } catch (UnsupportedEncodingException e) {
            return new ByteArrayInputStream(s.getBytes());
        }
    }

    public long getLong() throws ValueFormatException, IllegalStateException, RepositoryException {
        if (getType() == PropertyType.DATE) {
            return getDate().getTimeInMillis();
        } else {
            String s = getString();
            try {
                return Long.parseLong(s);
            } catch (NumberFormatException e) {
                throw new ValueFormatException(s);
            }
        }
    }

    public double getDouble() throws ValueFormatException, IllegalStateException, RepositoryException {
        String s = getString();
        try {
            return Double.parseDouble(s);
        } catch (NumberFormatException e) {
            throw new ValueFormatException(s);
        }
    }

    public Calendar getDate() throws ValueFormatException, IllegalStateException, RepositoryException {
        return ISO8601.parse(getString());
    }

    public boolean getBoolean() throws ValueFormatException, IllegalStateException, RepositoryException {
        String s = getString();
        try {
            return Boolean.parseBoolean(s);
        } catch (NumberFormatException e) {
            throw new ValueFormatException(s);
        }
    }

    public int getType() {
        return type;
    }

    public boolean checkConstraint(String value) throws ValueFormatException, IllegalStateException, RepositoryException {
        if (value == null || value.length() == 0) {
            return true;
        }
        try {
            switch (type) {
                case PropertyType.STRING:
                    Pattern p = Pattern.compile(getString());
                    return p.matcher(value).matches();
                case PropertyType.LONG:
                case PropertyType.DOUBLE:
                case PropertyType.DATE:
                    String s = getString();
                    boolean lowerBoundIncluded = s.charAt(0) == '[';
                    boolean upperBoundIncluded = s.charAt(s.length()-1) == ']';
                    String lowerBound = s.substring(1,s.indexOf(','));
                    String upperBound = s.substring(s.indexOf(',')+1, s.length()-1);
                    switch (type) {
                        case PropertyType.LONG:
                        case PropertyType.DOUBLE: {
                            double v = Double.parseDouble(value);
                            double l = Double.parseDouble(lowerBound);
                            double u = Double.parseDouble(upperBound);
                            return (lowerBoundIncluded?v>=l:v>l) && (upperBoundIncluded?v<=u:v<u);
                        }
                        case PropertyType.DATE: {
                            long v = Long.parseLong(value);
                            long l = ISO8601.parse(lowerBound).getTimeInMillis();
                            long u = ISO8601.parse(upperBound).getTimeInMillis();
                            return (lowerBoundIncluded?v>=l:v>l) && (upperBoundIncluded?v<=u:v<u);
                        }
                    }
            }
        } catch (Exception e) {
            logger.warn(e.getMessage(), e);
            return true;
        }
        return true;
    }

    public Binary getBinary() throws RepositoryException {
        return null;
    }

    public BigDecimal getDecimal() throws ValueFormatException, RepositoryException {
        return null;
    }
}

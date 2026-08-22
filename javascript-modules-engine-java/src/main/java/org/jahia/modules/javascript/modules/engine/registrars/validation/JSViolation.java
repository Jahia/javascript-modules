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
package org.jahia.modules.javascript.modules.engine.registrars.validation;

/**
 * A violation reported by a JavaScript node validator: a message, an optional property name (for
 * field-level errors in the editing UI) and the key of the reporting validator.
 */
public final class JSViolation {

    private final String message;
    private final String propertyName;
    private final String validatorKey;

    public JSViolation(String message, String propertyName, String validatorKey) {
        this.message = message;
        this.propertyName = propertyName;
        this.validatorKey = validatorKey;
    }

    public String getMessage() {
        return message;
    }

    public String getPropertyName() {
        return propertyName;
    }

    public String getValidatorKey() {
        return validatorKey;
    }
}

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

import javax.validation.Constraint;
import javax.validation.Payload;
import java.lang.annotation.ElementType;
import java.lang.annotation.Repeatable;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Class-level constraint carried by {@link JSNodeValidator}, dispatching to JavaScript-declared node
 * validators. One annotation instance exists per Jahia validation phase combination (see {@link Mode}),
 * with matching Bean Validation groups, so that Jahia's group orchestration during session save applies
 * to JS validators exactly as it does to Java ones.
 *
 * <p>This annotation intentionally has no {@code propertyName()} attribute: Jahia core then derives the
 * property from each violation's property path, which the constraint validator sets per violation.
 */
@Target({ElementType.TYPE, ElementType.ANNOTATION_TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Repeatable(JSValidation.List.class)
@Constraint(validatedBy = JSValidationConstraintValidator.class)
public @interface JSValidation {

    String message() default "";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    /** The Jahia validation phase this constraint instance covers. */
    Mode mode();

    enum Mode {
        /** First validation phase, also enforced during imports. */
        DEFAULT,
        /** First validation phase, skipped during imports. */
        DEFAULT_SKIP_ON_IMPORT,
        /** Second validation phase (runs only if the first one passed), also enforced during imports. */
        ADVANCED,
        /** Second validation phase, skipped during imports. */
        ADVANCED_SKIP_ON_IMPORT
    }

    @Target({ElementType.TYPE, ElementType.ANNOTATION_TYPE})
    @Retention(RetentionPolicy.RUNTIME)
    @interface List {
        JSValidation[] value();
    }
}

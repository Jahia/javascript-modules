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

import org.apache.commons.lang3.StringUtils;
import org.jahia.osgi.BundleUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.validation.ConstraintValidator;
import javax.validation.ConstraintValidatorContext;
import java.util.List;
import java.util.function.Supplier;

/**
 * Dispatches {@link JSValidation} constraints to the JavaScript node validators registered for the
 * current validation phase, and reports their violations programmatically — with a property node for
 * field-level errors (Jahia core maps a resolvable property path to a field error in the editing UI, and
 * a blank path to a node-level error).
 *
 * <p>Message templates are handed to Jahia's {@code JahiaMessageInterpolator}, which resolves messages of
 * the form <code>{resource.bundle.key}</code> against deployed resource bundles and returns any other
 * message verbatim (no EL, no parameter interpolation). Messages shorter than 2 characters would crash
 * that interpolator and are replaced by a generic fallback.
 */
public class JSValidationConstraintValidator implements ConstraintValidator<JSValidation, JSNodeValidator> {

    private static final Logger logger = LoggerFactory.getLogger(JSValidationConstraintValidator.class);

    /**
     * Test seam; the production default resolves the registrar service per call, which is cheap at
     * validation frequency and stays correct across engine redeploys.
     */
    static Supplier<NodeValidatorRegistrar> registrarSupplier =
            () -> BundleUtils.getOsgiService(NodeValidatorRegistrar.class, null);

    private JSValidation.Mode mode;

    @Override
    public void initialize(JSValidation constraintAnnotation) {
        this.mode = constraintAnnotation.mode();
    }

    @Override
    public boolean isValid(JSNodeValidator bean, ConstraintValidatorContext context) {
        NodeValidatorRegistrar registrar;
        try {
            registrar = registrarSupplier.get();
        } catch (Exception e) {
            logger.debug("JS node validator registrar is not available, skipping JS validation", e);
            return true;
        }
        if (registrar == null) {
            // engine stopped or redeploying: nothing to validate against
            return true;
        }

        List<JSViolation> violations = registrar.collectViolations(bean.getNode(), mode);
        if (violations.isEmpty()) {
            return true;
        }

        context.disableDefaultConstraintViolation();
        for (JSViolation violation : violations) {
            ConstraintValidatorContext.ConstraintViolationBuilder builder = context
                    .buildConstraintViolationWithTemplate(sanitizeMessage(violation.getMessage(), violation.getValidatorKey()));
            if (StringUtils.isNotBlank(violation.getPropertyName())) {
                // property-level path -> field-level error in the editing UI
                builder.addPropertyNode(violation.getPropertyName()).addConstraintViolation();
            } else {
                // class-level violation -> blank path -> node-level error
                builder.addConstraintViolation();
            }
        }
        return false;
    }

    static String sanitizeMessage(String message, String validatorKey) {
        if (message == null || message.trim().length() < 2) {
            logger.warn("JS node validator '{}' returned a blank violation message, using a generic one",
                    validatorKey);
            return "Invalid content";
        }
        return message;
    }
}

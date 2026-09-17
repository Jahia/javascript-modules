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

import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.decorator.validation.AdvancedGroup;
import org.jahia.services.content.decorator.validation.DefaultSkipOnImportGroup;
import org.junit.After;
import org.junit.AfterClass;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Test;

import javax.validation.ConstraintViolation;
import javax.validation.MessageInterpolator;
import javax.validation.Validation;
import javax.validation.Validator;
import javax.validation.ValidatorFactory;
import javax.validation.groups.Default;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.function.Supplier;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

/**
 * Exercises the whole Bean Validation chain of the JS validator bridge against a real Hibernate
 * Validator (same version as the platform): constraint discovery on {@link JSNodeValidator}, group
 * orchestration per {@link JSValidation.Mode}, programmatic violation building (property-level vs
 * node-level paths) and message pass-through.
 *
 * <p>The interpolator is a pass-through, mimicking Jahia's {@code JahiaMessageInterpolator} behavior for
 * messages that do not match a resource bundle key (it returns unresolved templates verbatim and never
 * applies EL or parameter interpolation).
 */
public class JSNodeValidatorBeanValidationTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    /** Canned violations returned by the fake registrar, per requested mode. */
    private FakeRegistrar fakeRegistrar;
    private Supplier<NodeValidatorRegistrar> previousSupplier;

    private static class FakeRegistrar extends NodeValidatorRegistrar {
        private final List<JSViolation> defaultViolations = new ArrayList<>();
        private final List<JSViolation> defaultSkipOnImportViolations = new ArrayList<>();
        private final List<JSViolation> advancedViolations = new ArrayList<>();

        @Override
        public List<JSViolation> collectViolations(JCRNodeWrapper node, JSValidation.Mode mode) {
            switch (mode) {
                case DEFAULT:
                    return defaultViolations;
                case DEFAULT_SKIP_ON_IMPORT:
                    return defaultSkipOnImportViolations;
                case ADVANCED:
                    return advancedViolations;
                default:
                    return List.of();
            }
        }
    }

    @BeforeClass
    public static void setUpFactory() {
        factory = Validation.byDefaultProvider().configure()
                .messageInterpolator(new MessageInterpolator() {
                    @Override
                    public String interpolate(String messageTemplate, Context context) {
                        return messageTemplate;
                    }

                    @Override
                    public String interpolate(String messageTemplate, Context context, Locale locale) {
                        return messageTemplate;
                    }
                })
                .buildValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterClass
    public static void tearDownFactory() {
        factory.close();
    }

    @Before
    public void setUp() {
        fakeRegistrar = new FakeRegistrar();
        previousSupplier = JSValidationConstraintValidator.registrarSupplier;
        JSValidationConstraintValidator.registrarSupplier = () -> fakeRegistrar;
    }

    @After
    public void tearDown() {
        JSValidationConstraintValidator.registrarSupplier = previousSupplier;
    }

    @Test
    public void noViolationsMeansValid() {
        assertTrue(validator.validate(new JSNodeValidator(null)).isEmpty());
    }

    @Test
    public void propertyLevelViolationCarriesThePropertyPath() {
        fakeRegistrar.defaultViolations.add(new JSViolation("Email is invalid", "email", "test"));

        Set<ConstraintViolation<JSNodeValidator>> violations = validator.validate(new JSNodeValidator(null));

        assertEquals(1, violations.size());
        ConstraintViolation<JSNodeValidator> violation = violations.iterator().next();
        assertEquals("Email is invalid", violation.getMessage());
        // Jahia core maps a resolvable property path to a field-level error in the editing UI
        assertEquals("email", violation.getPropertyPath().toString());
    }

    @Test
    public void nodeLevelViolationHasABlankPath() {
        fakeRegistrar.defaultViolations.add(new JSViolation("Node is inconsistent", null, "test"));

        Set<ConstraintViolation<JSNodeValidator>> violations = validator.validate(new JSNodeValidator(null));

        assertEquals(1, violations.size());
        // Jahia core maps a blank property path to a node-level error
        assertEquals("", violations.iterator().next().getPropertyPath().toString());
    }

    @Test
    public void messagesPassThroughVerbatimIncludingSpecialCharacters() {
        String nasty = "lone { brace, ${7*7}, back\\slash and {jcr:title}";
        fakeRegistrar.defaultViolations.add(new JSViolation(nasty, "email", "test"));

        Set<ConstraintViolation<JSNodeValidator>> violations = validator.validate(new JSNodeValidator(null));

        assertEquals(nasty, violations.iterator().next().getMessage());
    }

    @Test
    public void blankMessagesAreReplacedByAGenericFallback() {
        fakeRegistrar.defaultViolations.add(new JSViolation(" ", null, "test"));

        Set<ConstraintViolation<JSNodeValidator>> violations = validator.validate(new JSNodeValidator(null));

        assertEquals("Invalid content", violations.iterator().next().getMessage());
    }

    @Test
    public void groupOrchestrationMatchesJahiaPhases() {
        fakeRegistrar.defaultViolations.add(new JSViolation("default phase", null, "test"));
        fakeRegistrar.defaultSkipOnImportViolations.add(new JSViolation("default skip-on-import phase", null, "test"));
        fakeRegistrar.advancedViolations.add(new JSViolation("advanced phase", null, "test"));

        // normal save, first phase: Default + DefaultSkipOnImportGroup (what Jahia core requests)
        Set<ConstraintViolation<JSNodeValidator>> firstPhase =
                validator.validate(new JSNodeValidator(null), Default.class, DefaultSkipOnImportGroup.class);
        assertEquals(2, firstPhase.size());

        // import, first phase: Default only -> the skip-on-import validator does not run
        Set<ConstraintViolation<JSNodeValidator>> importPhase =
                validator.validate(new JSNodeValidator(null), Default.class);
        assertEquals(1, importPhase.size());
        assertEquals("default phase", importPhase.iterator().next().getMessage());

        // second phase: AdvancedGroup
        Set<ConstraintViolation<JSNodeValidator>> advancedPhase =
                validator.validate(new JSNodeValidator(null), AdvancedGroup.class);
        assertEquals(1, advancedPhase.size());
        assertEquals("advanced phase", advancedPhase.iterator().next().getMessage());
    }

    @Test
    public void missingRegistrarMeansValid() {
        JSValidationConstraintValidator.registrarSupplier = () -> null;
        fakeRegistrar.defaultViolations.add(new JSViolation("should not surface", null, "test"));

        assertTrue(validator.validate(new JSNodeValidator(null)).isEmpty());
    }
}

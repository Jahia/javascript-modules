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
import org.jahia.services.content.decorator.validation.AdvancedSkipOnImportGroup;
import org.jahia.services.content.decorator.validation.DefaultSkipOnImportGroup;
import org.jahia.services.content.decorator.validation.JCRNodeValidator;

/**
 * The single Bean Validation bean bridging all JavaScript-declared node validators.
 *
 * <p>It is registered once, for the sentinel node type {@code nt:base} (see
 * {@link NodeValidatorRegistrar}), so Jahia core instantiates and validates it exactly once per changed
 * node per save — node-type matching and dispatch to the JS validators happen in
 * {@link JSValidationConstraintValidator}/{@link NodeValidatorRegistrar}. Registering it under each
 * JS-declared node type instead would run every matching JS validator once per matching node type,
 * producing duplicate violations.
 *
 * <p>The four repeated class-level constraints mirror Jahia's validation phases: on a normal save, core
 * validates with groups (Default, DefaultSkipOnImportGroup) and then — only if that passed — with
 * (AdvancedGroup, AdvancedSkipOnImportGroup); during imports, the SkipOnImport groups are omitted.
 */
@JSValidation(mode = JSValidation.Mode.DEFAULT)
@JSValidation(mode = JSValidation.Mode.DEFAULT_SKIP_ON_IMPORT, groups = DefaultSkipOnImportGroup.class)
@JSValidation(mode = JSValidation.Mode.ADVANCED, groups = AdvancedGroup.class)
@JSValidation(mode = JSValidation.Mode.ADVANCED_SKIP_ON_IMPORT, groups = AdvancedSkipOnImportGroup.class)
public class JSNodeValidator implements JCRNodeValidator {

    private final JCRNodeWrapper node;

    public JSNodeValidator(JCRNodeWrapper node) {
        this.node = node;
    }

    public JCRNodeWrapper getNode() {
        return node;
    }
}

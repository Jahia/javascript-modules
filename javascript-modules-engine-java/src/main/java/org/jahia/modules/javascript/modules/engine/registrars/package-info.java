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
/**
 * Registrars bridge JavaScript registry entries to Jahia extension points, driven per JS bundle by
 * {@code JavascriptModuleListener} through the {@link org.jahia.modules.javascript.modules.engine.registrars.Registrar}
 * whiteboard (see ADR-0001 in docs/adr).
 *
 * <p>Package layout rule: registrars whose bridge fits in a single class live flat in this package
 * (e.g. choicelists, render filters, legacy node actions, over
 * {@link org.jahia.modules.javascript.modules.engine.registrars.AbstractServiceRegistrar}); verticals
 * needing several collaborating classes get a subpackage (e.g. {@code validation}, {@code contentpatches}).
 * Non-registrar surfaces live outside: the actions dispatch endpoint in {@code ..engine.actions}, the
 * exported third-party facade in {@code ..engine.sdk}, and engine plumbing in {@code ..engine.jsengine}.
 */
package org.jahia.modules.javascript.modules.engine.registrars;

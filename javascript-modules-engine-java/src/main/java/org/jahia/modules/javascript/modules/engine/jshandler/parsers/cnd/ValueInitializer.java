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


import javax.jcr.Value;
import java.util.List;

/**
 * Defines a property value initializer.
 * User: toto
 * Date: Apr 3, 2008
 * Time: 4:09:58 PM
 */
 interface ValueInitializer {

     Value[] getValues(ExtendedPropertyDefinition declaringPropertyDefinition, List<String> params);

}

package org.jahia.modules.javascript.modules.engine.js;

import org.jahia.modules.javascript.modules.engine.jsengine.ContextProvider;
import org.jahia.modules.javascript.modules.engine.jsengine.JSGlobalVariableFactory;
import org.osgi.service.component.annotations.Component;

@Component(service = {JSGlobalVariableFactory.class}, immediate = true)
public class JavascriptModulesLibraryGlobalVariableFactory implements JSGlobalVariableFactory {
    @Override
    public String getName() {
        return "javascriptModulesLibraryBuilder";
    }

    @Override
    public Object getObject(ContextProvider context) {
        return new JavascriptModulesLibraryBuilder(context);
    }
}

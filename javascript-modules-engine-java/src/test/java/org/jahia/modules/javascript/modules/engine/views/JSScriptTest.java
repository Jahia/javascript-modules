package org.jahia.modules.javascript.modules.engine.views;

import junit.framework.TestCase;
import org.jahia.services.render.RenderException;
import org.junit.Test;

import java.util.Collections;
import java.util.Map;

public class JSScriptTest extends TestCase {

    @Test
    public void testCheckRegisteredReturnsViewValues() throws RenderException {
        Map<String, Object> viewValues = Collections.singletonMap("viewRenderer", "react");
        assertSame(viewValues, JSScript.checkRegistered(viewValues, "358/jahiacom/jahiacom_template_jnt:page_basic"));
    }

    @Test
    public void testCheckRegisteredFailsWithViewPathWhenMissing() {
        try {
            JSScript.checkRegistered(null, "358/jahiacom/jahiacom_template_jnt:page_basic");
            fail("Expected a RenderException");
        } catch (RenderException e) {
            assertTrue(e.getMessage().contains("358/jahiacom/jahiacom_template_jnt:page_basic"));
            assertTrue(e.getMessage().contains("Cannot execute init script"));
        }
    }
}

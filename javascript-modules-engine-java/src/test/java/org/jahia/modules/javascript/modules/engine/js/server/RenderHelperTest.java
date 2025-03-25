package org.jahia.modules.javascript.modules.engine.js.server;

import junit.framework.TestCase;
import junitparams.JUnitParamsRunner;
import junitparams.Parameters;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(JUnitParamsRunner.class)
public class RenderHelperTest extends TestCase {

    @Test
    @Parameters({
            // siblings:
            "/home, /about, ../about",
            "/sites/mysite/home, /sites/mysite/about, ../about",
            // identical:
            "/home, /home, .",
            // parents:
            "/home/sub-level-1, /home, ../",
            "/home/sub-level-1/sub-level-2, /home, ../../",
            "/home/sub-level-1/sub-level-2, /home/sub-level-1, ../",
            // children:
            "/home, /home/sub-level-1, sub-level-1",
            "/home, /home/sub-level-1, sub-level-1",
            "/home, /home/sub-level-1/sub-level-2, sub-level-1/sub-level-2"
    })
    public void testCalculateRelativePath(String currentPath, String basePath, String expectedRelativePath) {
        assertEquals(expectedRelativePath, RenderHelper.calculateRelativePath(currentPath, basePath));
    }
}
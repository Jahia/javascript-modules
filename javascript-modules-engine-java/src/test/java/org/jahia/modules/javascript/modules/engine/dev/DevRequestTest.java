package org.jahia.modules.javascript.modules.engine.dev;

import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

public class DevRequestTest {

    @Test
    public void readsTheModuleOfAnAssetRequest() {
        DevRequest request = DevRequest.parse("/my-module/src/components/Hello/Hello.client.tsx");
        assertEquals("my-module", request.getModule());
        assertFalse(request.isCommand());
        assertNull(request.getCommand());
    }

    @Test
    public void readsACommand() {
        DevRequest request = DevRequest.parse("/my-module/@jahia/server-bundle");
        assertEquals("my-module", request.getModule());
        assertTrue(request.isCommand());
        assertEquals("server-bundle", request.getCommand());
    }

    @Test
    public void treatsVitesOwnReservedSegmentsAsAssets() {
        // the segment that tells the two apart must not collide with anything Vite generates
        for (String path : new String[] { "/my-module/@vite/client", "/my-module/@id/react",
                "/my-module/@fs/Users/dev/vite/dist/client/env.mjs", "/my-module/@react-refresh" }) {
            DevRequest request = DevRequest.parse(path);
            assertFalse(path, request.isCommand());
            assertEquals(path, "my-module", request.getModule());
        }
    }

    @Test
    public void acceptsAModuleWithNoPath() {
        DevRequest request = DevRequest.parse("/my-module");
        assertEquals("my-module", request.getModule());
        assertFalse(request.isCommand());
    }

    @Test
    public void rejectsPathsNamingNoModule() {
        assertNull(DevRequest.parse(null));
        assertNull(DevRequest.parse(""));
        assertNull(DevRequest.parse("/"));
        assertNull(DevRequest.parse("//src/index.js"));
        assertNull(DevRequest.parse("no-leading-slash"));
    }

    @Test
    public void buildsTheBasePathTheDevServerMustUse() {
        assertEquals("/modules/jsm-dev/my-module/", DevServerRegistry.baseOf("my-module"));
    }
}

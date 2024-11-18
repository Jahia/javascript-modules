package org.jahia.modules.npm.modules.engine.npmhandler;

import org.junit.Test;

import java.util.HashMap;
import java.util.Hashtable;
import java.util.Map;

import static org.junit.Assert.assertEquals;

public class NpmProtocolConnectionTest {


    public static final String PACKAGE_VERSION = "1.2.3";

    @Test
    public void GIVEN_the_snapshot_mode_is_enabled_with_a_boolean_WHEN_getting_the_bundle_version_THEN_the_snapshot_suffix_is_present() {
        String version = NpmProtocolConnection.getBundleVersion(createPackageProperties(), createJahiaProps(true));
        assertEquals("The version should be suffixed with SNAPSHOT", PACKAGE_VERSION + ".SNAPSHOT", version);
    }

    @Test
    public void GIVEN_the_snapshot_mode_is_enabled_with_a_string_WHEN_getting_the_bundle_version_THEN_the_snapshot_suffix_is_present() {
        String version = NpmProtocolConnection.getBundleVersion(createPackageProperties(), createJahiaProps("TrUe"));
        assertEquals("The version should be suffixed with SNAPSHOT", PACKAGE_VERSION + ".SNAPSHOT", version);
    }

    @Test
    public void GIVEN_the_snapshot_mode_is_disabled_WHEN_getting_the_bundle_version_THEN_the_snapshot_suffix_is_absent() {
        String version = NpmProtocolConnection.getBundleVersion(createPackageProperties(), createJahiaProps(false));
        assertEquals("The version should not be suffixed with SNAPSHOT", PACKAGE_VERSION, version);
    }

    @Test
    public void GIVEN_the_snapshot_mode_is_not_set_WHEN_getting_the_bundle_version_THEN_the_snapshot_suffix_is_absent() {
        String version = NpmProtocolConnection.getBundleVersion(createPackageProperties(), new HashMap<>());
        assertEquals("The version should not be suffixed with SNAPSHOT", PACKAGE_VERSION, version);
    }


    @Test
    public void GIVEN_the_snapshot_mode_is_enabled_with_a_boolean_WHEN_getting_the_implementation_version_THEN_the_snapshot_suffix_is_present() {
        String version = NpmProtocolConnection.getImplementationVersion(createPackageProperties(), createJahiaProps(true));
        assertEquals("The version should be suffixed with SNAPSHOT", PACKAGE_VERSION + "-SNAPSHOT", version);
    }

    @Test
    public void GIVEN_the_snapshot_mode_is_enabled_with_a_string_WHEN_getting_the_implementation_version_THEN_the_snapshot_suffix_is_present() {
        String version = NpmProtocolConnection.getImplementationVersion(createPackageProperties(), createJahiaProps("TrUe"));
        assertEquals("The version should be suffixed with SNAPSHOT", PACKAGE_VERSION + "-SNAPSHOT", version);
    }

    @Test
    public void GIVEN_the_snapshot_mode_is_disabled_WHEN_getting_the_implementation_version_THEN_the_snapshot_suffix_is_absent() {
        String version = NpmProtocolConnection.getImplementationVersion(createPackageProperties(), createJahiaProps(false));
        assertEquals("The version should not be suffixed with SNAPSHOT", PACKAGE_VERSION, version);
    }

    @Test
    public void GIVEN_the_snapshot_mode_is_not_set_WHEN_getting_the_implementation_version_THEN_the_snapshot_suffix_is_absent() {
        String version = NpmProtocolConnection.getImplementationVersion(createPackageProperties(), new HashMap<>());
        assertEquals("The version should not be suffixed with SNAPSHOT", PACKAGE_VERSION, version);
    }

    private static Map<String, Object> createPackageProperties() {
        Map<String, Object> packageProps = new Hashtable<>();
        packageProps.put("version", NpmProtocolConnectionTest.PACKAGE_VERSION);
        return packageProps;
    }

    private static Map<String, Object> createJahiaProps(Object snapshotModeValue) {
        HashMap<String, Object> jahiaProps = new HashMap<>();
        jahiaProps.put("snapshot", snapshotModeValue);
        return jahiaProps;
    }
}


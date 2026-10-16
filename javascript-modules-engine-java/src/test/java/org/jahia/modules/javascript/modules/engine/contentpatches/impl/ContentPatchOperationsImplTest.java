package org.jahia.modules.javascript.modules.engine.contentpatches.impl;

import org.jahia.modules.javascript.modules.engine.contentpatches.OperationReport;
import org.jahia.services.content.JCRCallback;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRPropertyWrapper;
import org.jahia.services.content.JCRSessionWrapper;
import org.jahia.services.content.JCRValueWrapper;
import org.jahia.services.content.nodetypes.ExtendedPropertyDefinition;
import org.jahia.services.content.nodetypes.NodeTypeRegistry;
import org.junit.Before;
import org.junit.Test;
import org.slf4j.LoggerFactory;

import javax.jcr.ItemNotFoundException;
import javax.jcr.NodeIterator;
import javax.jcr.RepositoryException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class ContentPatchOperationsImplTest {

    private static final String MODULE = "test-module";
    private static final String TYPE = "test:content";

    private NodeTypeRegistry registry;
    private JCRSessionWrapper session;
    private List<JCRNodeWrapper> selectedNodes;
    private TestableOperations operations;

    /** Runs the session callbacks on a mocked session, and query pages from {@code selectedNodes}. */
    private class TestableOperations extends ContentPatchOperationsImpl {
        final List<String> sessionWorkspaces = new ArrayList<>();
        final List<String> queries = new ArrayList<>();
        final Map<String, String> typeOwners = new HashMap<>();

        TestableOperations(boolean dryRun) {
            super(MODULE, dryRun, LoggerFactory.getLogger("test"));
        }

        @Override
        protected <T> T withSystemSession(String workspace, JCRCallback<T> callback) throws RepositoryException {
            sessionWorkspaces.add(workspace);
            return callback.doInJCR(session);
        }

        @Override
        protected NodeTypeRegistry nodeTypeRegistry() {
            return registry;
        }

        @Override
        protected String nodeTypeSystemId(String name) {
            return typeOwners.get(name);
        }

        @Override
        protected NodeIterator queryPage(JCRSessionWrapper querySession, String query, long offset, long limit) {
            queries.add(query);
            List<JCRNodeWrapper> page = offset < selectedNodes.size() ? selectedNodes : Collections.emptyList();
            return nodeIterator(page.iterator());
        }
    }

    @Before
    public void setUp() {
        registry = mock(NodeTypeRegistry.class);
        when(registry.hasNodeType(TYPE)).thenReturn(true);
        selectedNodes = new ArrayList<>();
        session = mock(JCRSessionWrapper.class);
        operations = new TestableOperations(false);
    }

    /** Registers a node in the mocked query result and session, with a unique identifier. */
    private JCRNodeWrapper givenSelectedNode(String identifier) throws RepositoryException {
        JCRNodeWrapper node = mock(JCRNodeWrapper.class);
        when(node.getIdentifier()).thenReturn(identifier);
        when(node.getPath()).thenReturn("/content/" + identifier);
        when(node.getExistingLocales()).thenReturn(Collections.emptyList());
        when(session.getNodeByIdentifier(identifier)).thenReturn(node);
        selectedNodes.add(node);
        return node;
    }

    private static NodeIterator nodeIterator(Iterator<JCRNodeWrapper> iterator) {
        NodeIterator nodeIterator = mock(NodeIterator.class);
        when(nodeIterator.hasNext()).thenAnswer(invocation -> iterator.hasNext());
        when(nodeIterator.nextNode()).thenAnswer(invocation -> iterator.next());
        return nodeIterator;
    }

    private static Map<String, Object> options(Object... keysAndValues) {
        Map<String, Object> result = new HashMap<>();
        for (int i = 0; i < keysAndValues.length; i += 2) {
            result.put((String) keysAndValues[i], keysAndValues[i + 1]);
        }
        return result;
    }

    // === forEachNode: batching, counters, dry-run ===

    @Test
    public void forEachNodeBatchesAndCounts() throws RepositoryException {
        givenSelectedNode("id-1");
        givenSelectedNode("id-2");
        givenSelectedNode("id-3");

        List<String> visited = new ArrayList<>();
        OperationReport report = operations.forEachNode(
                options("nodeType", TYPE, "workspaces", Arrays.asList("default"), "batchSize", 2),
                node -> {
                    visited.add(node.getIdentifier());
                    return null;
                });

        assertEquals(Arrays.asList("id-1", "id-2", "id-3"), visited);
        assertEquals(3, report.getMatched());
        assertEquals(3, report.getUpdated());
        assertEquals(0, report.getSkipped());
        assertEquals(Arrays.asList("default"), report.getWorkspaceNames());
        // one session for the snapshot + one per batch of 2
        assertEquals(Arrays.asList("default", "default", "default"), operations.sessionWorkspaces);
        verify(session, times(2)).save();
    }

    @Test
    public void forEachNodeProcessesBothWorkspacesByDefault() throws RepositoryException {
        givenSelectedNode("id-1");

        OperationReport report = operations.forEachNode(options("nodeType", TYPE), node -> null);

        assertEquals(Arrays.asList("default", "live"), report.getWorkspaceNames());
        assertEquals(2, report.getMatched());
        assertEquals(Arrays.asList("default", "default", "live", "live"), operations.sessionWorkspaces);
    }

    @Test
    public void forEachNodeCountsFalseReturnsAndVanishedNodesAsSkipped() throws RepositoryException {
        givenSelectedNode("id-1");
        JCRNodeWrapper vanished = givenSelectedNode("id-2");
        givenSelectedNode("id-3");
        when(session.getNodeByIdentifier("id-2")).thenThrow(new ItemNotFoundException("id-2"));

        OperationReport report = operations.forEachNode(
                options("nodeType", TYPE, "workspaces", Arrays.asList("default")),
                node -> node.getIdentifier().equals("id-3") ? Boolean.FALSE : null);

        assertEquals(3, report.getMatched());
        assertEquals(1, report.getUpdated());
        assertEquals(2, report.getSkipped());
        verify(vanished, never()).getPath();
    }

    @Test
    public void forEachNodeDryRunDiscardsInsteadOfSaving() throws RepositoryException {
        operations = new TestableOperations(true);
        givenSelectedNode("id-1");

        operations.forEachNode(options("nodeType", TYPE, "workspaces", Arrays.asList("default")), node -> null);

        verify(session, never()).save();
        verify(session).refresh(false);
    }

    @Test
    public void forEachNodeFiltersSubtypesOutWhenAskedTo() throws RepositoryException {
        JCRNodeWrapper exact = givenSelectedNode("id-1");
        JCRNodeWrapper subtype = givenSelectedNode("id-2");
        when(exact.getPrimaryNodeTypeName()).thenReturn(TYPE);
        when(subtype.getPrimaryNodeTypeName()).thenReturn("test:contentSubtype");

        OperationReport report = operations.forEachNode(
                options("nodeType", TYPE, "includeSubtypes", false, "workspaces", Arrays.asList("default")),
                node -> null);

        assertEquals(2, report.getMatched());
        assertEquals(1, report.getUpdated());
        assertEquals(1, report.getSkipped());
    }

    @Test
    public void forEachNodeBuildsTheQueryFromTheSelection() throws RepositoryException {
        operations.forEachNode(options("nodeType", TYPE, "scope", "/sites/acme", "where", "[price] > 1000",
                "workspaces", Arrays.asList("default")), node -> null);

        assertEquals(
                Arrays.asList(
                        "SELECT * FROM [test:content] AS n WHERE ISDESCENDANTNODE(n, '/sites/acme') AND ([price] > 1000)"),
                operations.queries);
    }

    @Test
    public void forEachNodeRequiresANodeTypeOrAQuery() {
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> operations.forEachNode(options("property", "color"), node -> null));
        assertTrue(error.getMessage().contains("nodeType"));
    }

    // === Fresh-install guard ===

    @Test
    public void operationsOnAnUnregisteredTypeAreGracefulNoOps() throws RepositoryException {
        when(registry.hasNodeType(TYPE)).thenReturn(false);

        OperationReport report = operations.removePropertyValues(options("nodeType", TYPE, "property", "color"));

        assertEquals(0, report.getMatched());
        assertTrue("no session must be opened", operations.sessionWorkspaces.isEmpty());
    }

    // === The operations, on mocked nodes ===

    @Test
    public void removePropertyValuesRemovesAndReports() throws RepositoryException {
        JCRNodeWrapper node = givenSelectedNode("id-1");
        JCRPropertyWrapper property = mock(JCRPropertyWrapper.class);
        when(node.hasProperty("color")).thenReturn(true);
        when(node.getProperty("color")).thenReturn(property);

        OperationReport report = operations.removePropertyValues(
                options("nodeType", TYPE, "property", "color", "workspaces", Arrays.asList("default")));

        verify(property).remove();
        assertEquals(1, report.getUpdated());
    }

    @Test
    public void setPropertyValuesBackfillsMissingValues() throws RepositoryException {
        JCRNodeWrapper node = givenSelectedNode("id-1");
        ExtendedPropertyDefinition definition = mock(ExtendedPropertyDefinition.class);
        when(node.getApplicablePropertyDefinition("theme")).thenReturn(definition);
        when(node.hasProperty("theme")).thenReturn(false);

        OperationReport report = operations.setPropertyValues(options("nodeType", TYPE, "property", "theme",
                "value", "light", "workspaces", Arrays.asList("default")));

        verify(node).setProperty("theme", "light");
        assertEquals(1, report.getUpdated());
    }

    @Test
    public void setPropertyValuesHonorsOnlyIfMissing() throws RepositoryException {
        JCRNodeWrapper node = givenSelectedNode("id-1");
        ExtendedPropertyDefinition definition = mock(ExtendedPropertyDefinition.class);
        when(node.getApplicablePropertyDefinition("theme")).thenReturn(definition);
        when(node.hasProperty("theme")).thenReturn(true);

        OperationReport report = operations.setPropertyValues(options("nodeType", TYPE, "property", "theme",
                "value", "light", "workspaces", Arrays.asList("default")));

        verify(node, never()).setProperty(eq("theme"), anyString());
        assertEquals(1, report.getSkipped());
    }

    @Test
    public void setPropertyValuesSkipsNodesWithoutTheProperty() throws RepositoryException {
        JCRNodeWrapper node = givenSelectedNode("id-1");
        when(node.getApplicablePropertyDefinition("theme")).thenReturn(null);

        OperationReport report = operations.setPropertyValues(options("nodeType", TYPE, "property", "theme",
                "value", "light", "workspaces", Arrays.asList("default")));

        assertEquals(1, report.getSkipped());
    }

    @Test
    public void setPropertyValuesResolverSkipsWithNullAndStoresNumbersAsLongs() throws RepositoryException {
        JCRNodeWrapper skippedNode = givenSelectedNode("id-1");
        JCRNodeWrapper updatedNode = givenSelectedNode("id-2");
        ExtendedPropertyDefinition definition = mock(ExtendedPropertyDefinition.class);
        for (JCRNodeWrapper node : Arrays.asList(skippedNode, updatedNode)) {
            when(node.getApplicablePropertyDefinition("priority")).thenReturn(definition);
            when(node.hasProperty("priority")).thenReturn(false);
        }

        OperationReport report = operations.setPropertyValues(
                options("nodeType", TYPE, "property", "priority", "workspaces", Arrays.asList("default")),
                (node, locale) -> node == updatedNode ? 42 : null);

        verify(updatedNode).setProperty("priority", 42L);
        assertEquals(1, report.getUpdated());
        assertEquals(1, report.getSkipped());
    }

    @Test
    public void setPropertyValuesWithoutValueOrResolverIsRefused() {
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> operations.setPropertyValues(options("nodeType", TYPE, "property", "theme")));
        assertTrue(error.getMessage().contains("value"));
    }

    @Test
    public void convertPropertyValuesRewritesTheStoredValue() throws RepositoryException {
        JCRNodeWrapper node = givenSelectedNode("id-1");
        JCRPropertyWrapper property = mock(JCRPropertyWrapper.class);
        JCRValueWrapper storedValue = mock(JCRValueWrapper.class);
        when(storedValue.getString()).thenReturn("42");
        when(node.hasProperty("counter")).thenReturn(true);
        when(node.getProperty("counter")).thenReturn(property);
        when(property.getValue()).thenReturn(storedValue);

        OperationReport report = operations.convertPropertyValues(
                options("nodeType", TYPE, "property", "counter", "workspaces", Arrays.asList("default")),
                (value, ownerNode) -> Integer.parseInt(value.getString()));

        verify(property).remove();
        verify(node).setProperty("counter", 42L);
        assertEquals(1, report.getUpdated());
    }

    @Test
    public void convertPropertyValuesLeavesValuesUntouchedOnNull() throws RepositoryException {
        JCRNodeWrapper node = givenSelectedNode("id-1");
        JCRPropertyWrapper property = mock(JCRPropertyWrapper.class);
        when(node.hasProperty("counter")).thenReturn(true);
        when(node.getProperty("counter")).thenReturn(property);
        when(property.getValue()).thenReturn(mock(JCRValueWrapper.class));

        OperationReport report = operations.convertPropertyValues(
                options("nodeType", TYPE, "property", "counter", "workspaces", Arrays.asList("default")),
                (value, ownerNode) -> null);

        verify(property, never()).remove();
        assertEquals(1, report.getSkipped());
    }

    // === Definition guard rails ===

    private void givenRegisteredType(String name, String owner) {
        when(registry.hasNodeType(name)).thenReturn(true);
        operations.typeOwners.put(name, owner);
    }

    @Test
    public void removeNodeTypeRefusesForeignTypesBeforeTouchingContent() throws RepositoryException {
        givenRegisteredType(TYPE, "another-module");
        givenSelectedNode("id-1");

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> operations.removeNodeType(options("nodeType", TYPE, "ifContentExists", "delete")));

        assertTrue(error.getMessage().contains("another-module"));
        assertTrue("no content must be touched", operations.sessionWorkspaces.isEmpty());
    }

    @Test
    public void removeNodeTypeFailsByDefaultWhenInstancesExist() throws RepositoryException {
        givenRegisteredType(TYPE, MODULE);
        JCRNodeWrapper node = givenSelectedNode("id-1");
        when(node.getPrimaryNodeTypeName()).thenReturn(TYPE);

        assertThrows(IllegalStateException.class,
                () -> operations.removeNodeType(options("nodeType", TYPE, "workspaces", Arrays.asList("default"))));
        verify(node, never()).remove();
        verify(registry, never()).unregisterNodeType(TYPE);
    }

    @Test
    public void removeNodeTypePurgesAndUnregistersWhenDeleteIsOptedIn() throws RepositoryException {
        givenRegisteredType(TYPE, MODULE);
        JCRNodeWrapper node = givenSelectedNode("id-1");
        when(node.getPrimaryNodeTypeName()).thenReturn(TYPE);

        OperationReport report = operations.removeNodeType(options("nodeType", TYPE,
                "ifContentExists", "delete", "workspaces", Arrays.asList("default")));

        verify(node).remove();
        verify(registry).unregisterNodeType(TYPE);
        assertEquals(1, report.getUpdated());
    }

    @Test
    public void removeNodeTypeDryRunNeverUnregisters() throws RepositoryException {
        operations = new TestableOperations(true);
        givenRegisteredType(TYPE, MODULE);

        operations.removeNodeType(options("nodeType", TYPE,
                "ifContentExists", "delete", "workspaces", Arrays.asList("default")));

        verify(registry, never()).unregisterNodeType(TYPE);
    }

    @Test
    public void removeNodeTypeValidatesTheMode() {
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> operations.removeNodeType(options("nodeType", TYPE, "ifContentExists", "purge")));
        assertTrue(error.getMessage().contains("ifContentExists"));
    }

    @Test
    public void changeNodeTypeRequiresARegisteredOwnedTargetType() throws RepositoryException {
        givenRegisteredType("test:oldType", MODULE);

        IllegalStateException notRegistered = assertThrows(IllegalStateException.class,
                () -> operations.changeNodeType(options("from", "test:oldType", "to", "test:newType")));
        assertTrue(notRegistered.getMessage().contains("test:newType"));

        givenRegisteredType("test:newType", "another-module");
        IllegalArgumentException foreign = assertThrows(IllegalArgumentException.class,
                () -> operations.changeNodeType(options("from", "test:oldType", "to", "test:newType")));
        assertTrue(foreign.getMessage().contains("another-module"));
        assertTrue("no content must be touched", operations.sessionWorkspaces.isEmpty());
    }
}

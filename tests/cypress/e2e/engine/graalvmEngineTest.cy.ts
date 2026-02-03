describe("Check that GraalVM debugger can be enabled", () => {
  // these ports must be exposed in docker-compose.yml
  const ports = [9229, 10229];

  ports.forEach((port) => {
    it(`Check that GraalVM debugger can be enabled on port ${port}`, function () {
      // extract the host from the JAHIA_URL env var
      const host = Cypress.env("JAHIA_URL").split("//")[1].split(":")[0];

      // delete the config
      deleteGraalVMConfig();
      waitForCurlExitCode(
        host,
        port,
        CONNECTION_ERROR_CODES,
        "debugger should be disabled by default (no config)",
      );

      // Enable the debugger
      enableGraalVMDebugger(port);
      waitForCurlExitCode(host, port, CONNECTION_OK, "debugger should be enabled when configured");
      verifyGraalVMInspector(host, port);
    });
  });
});

// Constants for curl exit codes
const CONNECTION_OK = 0;
const CONNECTION_ERROR_CODES = [7, 56]; // 7=ECONNREFUSED, 56=ECONNRESET

/**
 * Wait for curl to return the expected exit code when connecting to host:port Exit codes:
 * 0=success, 7=ECONNREFUSED, 56=ECONNRESET
 */
function waitForCurlExitCode(
  host: string,
  port: number,
  expectedExitCode: number | number[],
  errorMsg: string,
) {
  const expectedCodes = Array.isArray(expectedExitCode) ? expectedExitCode : [expectedExitCode];

  cy.waitUntil(
    () =>
      cy
        .exec(`curl -s -o /dev/null -w "%{http_code}" http://${host}:${port}/json/version`, {
          failOnNonZeroExit: false,
          timeout: 4000,
        })
        .then((result) => {
          const actualCode = result.code;

          if (expectedCodes.includes(actualCode)) {
            const msg =
              actualCode === 0
                ? `Connection successful (HTTP ${result.stdout})`
                : `Got expected connection error (exit code: ${actualCode})`;
            Cypress.log({ message: msg });
            return true;
          }

          Cypress.log({
            message: `Waiting... got exit code ${actualCode}, expected ${expectedCodes.join(" or ")}`,
          });
          return false;
        }),
    {
      timeout: 5000,
      errorMsg: `${errorMsg} - Expected curl exit code ${expectedCodes.join(" or ")}`,
    },
  );
}

/** Delete the GraalVM Engine configuration */
function deleteGraalVMConfig() {
  cy.runProvisioningScript({
    script: {
      fileContent: JSON.stringify([
        {
          editConfiguration: "org.jahia.modules.javascript.modules.engine.jsengine.GraalVMEngine",
          content: "",
        },
      ]),
      type: "application/yaml",
    },
  });
}

/** Enable the GraalVM debugger on a given port */
function enableGraalVMDebugger(port: number) {
  cy.apollo({
    variables: { inspect: `0.0.0.0:${port}`, suspend: false, secure: false },
    mutationFile: "graphql/enableGraalVMDebugger.graphql",
  });
}

/** Verify the response is from the GraalVM Chrome DevTools inspector */
function verifyGraalVMInspector(host: string, port: number) {
  cy.request(`http://${host}:${port}/json/version`).then((response) => {
    expect(response.status).to.equal(200);
    expect(response.body).to.have.property("Browser", "GraalVM");
    expect(response.body).to.have.property("Protocol-Version", "1.2");
  });
}

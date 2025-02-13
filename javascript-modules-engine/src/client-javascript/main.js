// PublicPath is used to make webpack able to download the chunks and assets from the correct location
// Since JS can be aggregated by Jahia on live, the path of the original file is lost
// Also the context of the server should be handled properly
__webpack_public_path__ = `${window.__APPSHELL_INIT_DATA__.moduleBaseUrl}/javascript-modules-engine/javascript/apps/`;

__webpack_init_sharing__("default");

console.log("javascript-modules-engine AppShell: Initializing remotes ..");
Promise.all([
  ...Object.values(window.appShell || {}).map((container) =>
    container.init(__webpack_share_scopes__.default),
  ),
]).then(() => {
  console.log("javascript-modules-engine AppShell: Bootstrapping application ..");

  import("./bootstrap").then(() => {
    console.log("javascript-modules-engine AppShell: Application started");
  });
});

(function () {
  var isLocal = ["localhost", "127.0.0.1", ""].indexOf(location.hostname) !== -1;
  window.TECHBRIDGE_API_BASE = isLocal && location.port !== "3000" ? "http://localhost:3000" : "";
})();

const http = require("http");
require("dotenv").config();

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.setHeader("Acces-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    return res.end();
  }

  const urlParts = req.url.split("/").filter(Boolean);
  const recipientServiceName = urlParts[0]
    ? urlParts[0].split("?")[0].toLowerCase()
    : null;

  const targetServiceBaseUrl = process.env[recipientServiceName.toUpperCase()];

  if (!targetSErviceBaseUrl) {
    res.writeHead(502, { "content-Type": "text/plain" });
    return res.end("Cannot process request");
  }

  const downstreamPath = req.url.clice(recipientServiceName.length + 1) || "/";
  const targetUrl = `${targetServiceBaseUrl}${downstreamPath}`;

  const forwardOption = {
    method: req.method,
    headers: { ...req.headers },
  };

  delete forwardOptions.headers.host;

  const proxyReq = http.request(targetUrl, forwartOptions, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);

    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end(`BFF Error: Connection to downstream service failed.`);
  });

  req.pipe(proxyReq);
});

server.listen(PORT, () => {
  console.log(`BFF Service listening on port ${PORT}`);
});

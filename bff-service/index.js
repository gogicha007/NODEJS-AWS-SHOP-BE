const http = require("http");
require("dotenv").config();

const PORT = process.env.PORT || 3000;

const CACHE_DURATION_MS = 2 * 60 * 1000;

let productsCache = {
  data: null,
  headers: null,
  statusCode: null,
  updatedAt: 0,
};

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    return res.end();
  }

  const pathParts = req.url.split("?")[0].split("/").filter(Boolean);
  console.log("bff service, pathParts", pathParts);

  const recipientServiceName = pathParts[0] ? pathParts[0].toLowerCase() : null;
  console.log("bff service, recipientServiceName ", recipientServiceName);

  if (!recipientServiceName) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    return res.end("Cannot process request: service name is missing in path");
  }

  const targetServiceBaseUrl = process.env[recipientServiceName?.toUpperCase()];
  console.log("bff service, targetServiceBaseUrl", targetServiceBaseUrl);

  if (!targetServiceBaseUrl) {
    res.writeHead(502, { "Content-Type": "text/plain" });
    return res.end("Cannot process request");
  }

  const serviceNameIndex = req.url.indexOf(recipientServiceName);
  let downstreamPath =
    req.url.slice(serviceNameIndex + recipientServiceName.length) || "/";
  console.log("bff service, downstreamPath ", downstreamPath);

  if (!downstreamPath.startsWith("/") && !downstreamPath.startsWith("?")) {
    downstreamPath = "/" + downstreamPath;
  }

  if (downstreamPath === "/") downstreamPath = "";

  const targetUrl = `${targetServiceBaseUrl}${downstreamPath}`;
  console.log("bff service, targetUrl ", targetUrl);

  const isGetProducts =
    req.method === "GET" &&
    recipientServiceName === "product" &&
    (downstreamPath === "/products" || downstreamPath === "");
    
  if (isGetProducts) {
    const now = Date.now();
    const isCacheValid = now - productsCache.updatedAt < CACHE_DURATION_MS;

    if (isCacheValid && productsCache.data) {
      console.log("Get products list from the cache...");
      res.writeHead(productsCache.statusCode, productsCache.headers);
      return res.end(productsCache.data);
    }
  }

  const forwardOptions = {
    method: req.method,
    headers: { ...req.headers },
  };

  delete forwardOptions.headers.host;

  const proxyReq = http.request(targetUrl, forwardOptions, (proxyRes) => {
    if (isGetProducts && proxyRes.statusCode === 200) {
      let bodyChunks = [];

      proxyRes.on("data", (chunk) => {
        bodyChunks.push(chunk);
      });

      proxyRes.on("end", () => {
        const completeBody = Buffer.concat(bodyChunks);

        productsCache = {
          data: completeBody,
          headers: proxyRes.headers,
          statusCode: proxyRes.statusCode,
          updatedAt: Date.now(),
        };

        console.log("BFF Cache filled with fresh product list.");
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        res.end(completeBody);
      });
    } else {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
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

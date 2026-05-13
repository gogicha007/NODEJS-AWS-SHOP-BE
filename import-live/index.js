"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// lambdas/import-products.ts
var import_products_exports = {};
__export(import_products_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(import_products_exports);
var headers = {
  "Content-type": "application/json"
};
function isCsvFile(filename) {
  return /\.csv$/i.test(filename);
}
var handler = (event) => {
  try {
    const fileName = event?.queryStringParameters?.name;
    if (!fileName || !isCsvFile(fileName)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "Missing " })
      };
    }
    console.log("import-produsts-file request", {
      event,
      queryStringParameters: event?.queryStringParameters
    });
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ fileName })
    };
  } catch (err) {
    console.error("import poducts file error", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Internal server errorF" })
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});

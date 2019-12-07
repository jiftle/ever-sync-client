"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const mime = require("mime");
// md5 hash
function hash(data) {
    const md5 = crypto.createHash("md5");
    md5.update(data);
    return md5.digest();
}
exports.hash = hash;
// guess mime type by filename, if not detected, use as text.
function guessMime(filename) {
    return mime.lookup(filename) || "text/plain";
}
exports.guessMime = guessMime;
//# sourceMappingURL=myutil.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fsn = require("fs");
const bluebird = require("bluebird");
const fs = bluebird.Promise.promisifyAll(fsn);
exports.default = fs;
fs.exsit = function (path) {
    return new bluebird.Promise((resolve) => {
        fsn.access(path, fsn.constants.F_OK, err => resolve(!err));
    });
};
//# sourceMappingURL=file.js.map
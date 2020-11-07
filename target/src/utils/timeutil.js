"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moment = require("moment");
//// 时间戳 转为 字符串
//let d = moment(1575801036000).format("YYYY-MM-DD HH:mm:ss");
//console.log(d);
class TimeUtil {
    static TimeStampToString(timestamp) {
        let s = "";
        s = moment(timestamp).format("YYYY-MM-DD HH:mm:ss");
        return s;
    }
}
exports.default = TimeUtil;
// var timestamp = 1575801036000;
// 
// let sf = TimeUtil.TimeStampToString(timestamp);
// 
// console.log(sf);
//# sourceMappingURL=timeutil.js.map
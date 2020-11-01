// import * as moment from 'moment';
// import TimeUtil from "TimeUtil";

import TimeUtil from "../utils/timeutil";

// export default class TimeUtil {
//     static TimeStampToString(timestamp){
//         let s = "";
//         s = moment(timestamp).format("YYYY-MM-DD HH:mm:ss");
//         return s;
//     }
// }


var timestamp = 1575801036000;

let sf = TimeUtil.TimeStampToString(timestamp);

console.log(sf);

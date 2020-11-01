import * as moment from 'moment';


//// 时间戳 转为 字符串
//let d = moment(1575801036000).format("YYYY-MM-DD HH:mm:ss");
//console.log(d);

export default class TimeUtil {
    static TimeStampToString(timestamp){
        let s = "";
        s = moment(timestamp).format("YYYY-MM-DD HH:mm:ss");
        return s;
    }
}


// var timestamp = 1575801036000;
// 
// let sf = TimeUtil.TimeStampToString(timestamp);
// 
// console.log(sf);

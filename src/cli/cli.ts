#!/usr/bin/env node
// 时间格式工具类
import TimeUtil from "../utils/timeutil";
import * as yargs from "yargs";
// 自定义，印象笔记客户端
import EverSyncClient from "../eversyncclient";
import EnmlConverter from "../utils/enmlconverter"; 
import * as fs from "fs";

const argv = yargs
    .usage("Prune node_modules files and save disk space\n\nUsage: prune <path>")
    .help("help")
    .alias("help", "h")
    .alias("version", "v").argv;

const path = argv._[0] || "../test-data/tmp.md";

const startT = Date.now();

function output(key: string, value: string) {
    console.log("\x1b[1m%s\x1b[0m ", key, value);
}

function print() {
    output("duration", `${Date.now() - startT}ms`);
}

// -------------------------------- 主函数 -----------------------------
console.log(argv)
var timestamp = 1575801036000;

let sf = TimeUtil.TimeStampToString(timestamp);

console.log(sf, path);
print();

// -------------- 读文件
//
let md_context:string;

md_context = fs.readFileSync('../test-data/test.md', "utf-8");
console.log(md_context);


//参数配置
let config = {
    token: "S=s58:U=d1c0c7:E=175c59e9324:C=175a1920de8:P=1cd:A=en-devtoken:V=2:H=b92cafbf1c73e0e9ed94928454bc6f63",
    noteStoreUrl: "https://app.yinxiang.com/shard/s58/notestore"
};

// 转换工具类
let converter = new EnmlConverter();
// let 定义局部变量
// 调用客户端
let client = new EverSyncClient();

// 1. 同步账号信息，包括笔记本，笔记  --ok
// 登录
client.syncAccount(config.token, config.noteStoreUrl).then(function (result) {
    if(result == false){
        console.log("印象笔记登录失败, \nconfig:\n", config);
        return;
    }
    
    // --------------- 根据标题查找笔记，是否存在，如果存在就返回笔记的guid ---------
    let title = "EverSyncClient Test";
    let noteGuid = "";
    client.getNoteGuidByTitle(title).then(function(guid) {
        noteGuid = guid;
        console.log("---> query note[%s] success! noteGuid=%s\n", title,noteGuid);
    
        // ------------- 获取笔记内容 ---------------
        client.getNoteContent(noteGuid).then(function(note) {
            console.log("--guid:\n", note.guid);
            console.log("--标题:\n", note.title);
            console.log("--创建时间:\n", TimeUtil.TimeStampToString(note.created));
            console.log("--更新时间:\n", TimeUtil.TimeStampToString(note.updated));
            console.log("--文件大小:\n", note.contentLength);
            console.log("--笔记本guid:\n", note.notebookGuid);
            console.log("--内容:\n", note.content);
            console.log("---> 笔记本内容:\n%s\n", note.content);
            noteGuid = note.guid;
    
           // ------------- 更新笔记 -------------------
           console.log("---> 开始更新笔记了,noteGuid=%s", noteGuid);
           let content = note.content;

            console.log("---> 笔记内容: \n", content);

           //let noteGuid = "4f53529a-e2b5-468e-b76a-b8d27370f1c0" ;
            let markdown_update = "# 单元测试 \n## 哈哈H1标题\n - 你好啊我的Markdown笔记\n - 美国总统大选2020年，拜登 and Trump 🇺";
            markdown_update = md_context;
           // 转换笔记内容为印象笔记的专用格式
           converter.toEnml(markdown_update).then(function(enml){
               console.log("--------- enml ----------")
               console.log(enml);
    
               console.log("---> 开始更新笔记了[2],noteGuid=%s", noteGuid);
               // 更新笔记内容
               let meta = {
                   title:"EverSyncClient Test",
                   tags: "markdown",
                   notebook: "blog"
               }
               let content = enml;
               client.updateNoteContent(meta, content, noteGuid).then(function(nte) {
                   console.log(nte)
               });
           });// 更新笔记
});
})
});

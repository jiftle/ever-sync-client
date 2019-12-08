import {
    EverSyncClient
} from "./eversyncclient";

import Converter from "./converterplus";
import * as moment from 'moment';


function greeter(person) {
    return "Hello, " + person;
}

let user = "Jane User";

console.log(greeter(user));

// 时间戳 转为 字符串
// let d = moment(1575801036000).format("YYYY-MM-DD HH:mm:ss");
// console.log(d);


//let markdown = "# 你好啊，我的Markdown笔记\n\n## 二级标题\n- 来自EverSynClient";
let markdown;

const converter = new Converter({});


//参数配置
let config = {
    token : "S=s58:U=d1c0c7:E=16f03ef2457:C=16edfe29da8:P=1cd:A=en-devtoken:V=2:H=f6ba1e4118af4731e11ea132cf1257ce",
    noteStoreUrl : "https://app.yinxiang.com/shard/s58/notestore"
};
// 调用客户端
let client = new EverSyncClient();

// 登录
client.syncAccount(config.token, config.noteStoreUrl).then(function(){

    // 列出笔记本列表 --测试接口是否畅通
    let notebooks = client.listNotebooks();
    console.log(notebooks);

    // 列出笔记列表
    //    var notes = client.listNotes(notebooks[0]);
    //   console.log(notes[0]);
    //    for(var i in notebooks) {
    //        console.log(notebooks[i])
    //        
    //        // 获取笔记内容，异步方式
    //        var note = notebooks[i]
    //        client.getNoteContent(note).then(function(noteContent){
    //            console.log(noteContent);
    //        });
    //    }



    //    markdown = "你好啊我的Markdown笔记";
    //    // 转换笔记内容为印象笔记的专用格式
    //    converter.toEnml(markdown).then(function(enml){
    //        console.log(enml);
    //
    //        // 异步方式
    //        // ------------------ 新建笔记 ----------------
    //        let meta = {
    //            title:"EverSyncClient Test",
    //            tags: "markdown",
    //            notebook: "blog"
    //        }
    //        let content = enml;
    //        let resources = 0;
    //        client.createNote(meta,content,resources).then(function(nte) {
    //            console.log("create note success!\n-------------------\nnoteGuid=" + nte.guid + "\nnoteTitle=" + nte.title + "\nnotebookGuid=" + nte.notebookGuid + "\n");
    //        });
    //    });
    //
    //    return;

    // ------------- 更新笔记 -------------------
    let noteGuid = "4f53529a-e2b5-468e-b76a-b8d27370f1c0" ;
    let markdown_update = "你好啊我的Markdown笔记,更新内容成功了，祝贺我吧，打小孩了\n，啊啊啊，时间戳转字符串，我要去做饭了";

    // 转换笔记内容为印象笔记的专用格式
    converter.toEnml(markdown_update).then(function(enml){
        //console.log(enml);

        // 异步方式
        // ------------------ 新建笔记 ----------------
        let meta = {
            title:"EverSyncClient Test",
            tags: "markdown",
            notebook: "blog"
        }
        let content = enml;
        let resources = 0;
        client.updateNoteContent(meta, content, noteGuid).then(function(nte) {
            console.log("update note success!\n标题: %s\n创建时间: %s\n更新时间: %s\n",
                nte.title,
                moment(nte.created).format("YYYY-MM-DD HH:mm:ss"),
                moment(nte.updated).format("YYYY-MM-DD HH:mm:ss")
            );
        });
    });
});


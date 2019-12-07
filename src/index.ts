import {
  EverSyncClient
} from "./eversyncclient";

import Converter from "./converterplus";



function greeter(person) {
    return "Hello, " + person;
}

let user = "Jane User";

console.log(greeter(user));

//let markdown = "# 你好啊，我的Markdown笔记\n\n## 二级标题\n- 来自EverSynClient";
let markdown = "你好啊我的Markdown笔记";

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



    converter.toEnml(markdown).then(function(enml){
        console.log(enml);

        // 异步方式
        // ------------------ 新建笔记 ----------------
        let meta = {
            title:"EverSyncClient Test",
            tags: "markdown",
            notebook: "blog"
        }
        let content = enml;
        //            let content = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' +
        //        '<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">\n' +
        //        '<en-note><div><en-media hash="a8d37852fba2d22e11c93e4459d4263d" title="Attachment" width="3024" type="image/jpeg"/></div><div><en-media hash="cc6089c8269ed3ab53fb0cd59596f11e" title="Attachment" width="2070" type="image/png"/></div><div><en-media hash="57dd10ddca3fbcbfdf4ab96a08e69616" title="Attachment" width="2752" type="image/png"/></div><div><br/></div></en-note>\n'
                let resources = 0;
        client.createNote(meta,content,resources).then(function(nte) {
             console.log("note upload success!\n-------------------\nnoteGuid=" + nte.guid + "\nnoteTitle=" + nte.title + "\nnotebookGuid=" + nte.notebookGuid + "\n");
        });
    });

    // ------------- 更新笔记 -------------------
    //   let noteGuid = "" ;
    //     client.updateNoteContent(meta, content, noteGuid) ;

});


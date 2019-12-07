import {
  EverSyncClient
} from "./eversyncclient";



function greeter(person) {
    return "Hello, " + person;
}

let user = "Jane User";

console.log(greeter(user));


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
    //    console.log(notes[0]);
    //
    //    // 获取笔记内容
    //    var note = notes[0]
    //var noteContent = client.getNoteContent(note.guid)
    //console.log(noteContent);

    // 异步方式
    // var noteContent = client.getNoteContent(note.guid).then(function(noteContent){
    //     console.log(noteContent);
    // });
    
        // ------------------ 新建笔记 ----------------
        let meta = {
            title:"EverSyncClient Test",
            tags: "markdown",
            notebook: "blog"
        }
    let content = ""
    //        let content = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' +
    //    '<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">\n' +
    //    '<en-note><div><en-media hash="a8d37852fba2d22e11c93e4459d4263d" title="Attachment" width="3024" type="image/jpeg"/></div><div><en-media hash="cc6089c8269ed3ab53fb0cd59596f11e" title="Attachment" width="2070" type="image/png"/></div><div><en-media hash="57dd10ddca3fbcbfdf4ab96a08e69616" title="Attachment" width="2752" type="image/png"/></div><div><br/></div></en-note>\n'
        let resources = 0;
        var a = client.createNote(meta,content,resources);
        console.log(a);

    // ------------- 更新笔记 -------------------
    //   let noteGuid = "" ;
    //     client.updateNoteContent(meta, content, noteGuid) ;

});


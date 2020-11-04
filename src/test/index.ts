// 自定义，印象笔记客户端
import EverSyncClient from "../eversyncclient";

// 时间格式工具类
import TimeUtil from "../utils/timeutil";
import Converter from "../utils/converterplus"; 

//--------------------- 单元测试,测试用例 ----------------------[
// 1. 同步账号信息，包括笔记本，笔记  --ok
// 2. 新建笔记  --ok
// 3. 更新笔记  --ok
// 4. 根据笔记标题查找笔记  --ok
// 5. 获取笔记内容  --ok
// 6. 文件内容渲染为Enm专用格式  --ok
//--------------------- 单元测试,测试用例 ----------------------]

//参数配置
let config = {
    token: "S=s58:U=d1c0c7:E=1759413f7b9:C=17570076fe8:P=1cd:A=en-devtoken:V=2:H=0bf1ed12c657740081089b1b6ed1e117",
    noteStoreUrl: "https://app.yinxiang.com/shard/s58/notestore"
};

// 转换工具类
let converter = new Converter();
// let 定义局部变量
// 调用客户端
let client = new EverSyncClient();

// 1. 同步账号信息，包括笔记本，笔记  --ok
// 登录
client.syncAccount(config.token, config.noteStoreUrl).then(function (result) {
    //console.log("同步结果: ", result);
    if(result == false){
        console.log("印象笔记登录失败, \nconfig:\n", config);
        return;
    }

    //// 列出笔记本列表 --测试接口是否畅通
    //let notebooks = client.listNotebooks();
    ////console.log(notebooks);

    //// 列出笔记列表
    //let notes = client.listNotes(notebooks[0]);
    ////console.log("------------ 第1个笔记本 --------- \n", notes);

    //let note = notes[0];
    //console.log("------------ 第1个笔记 --------- \n", note);

    //// 笔记本内容
    //client.getNoteContent(note.guid).then(function(note){
        //console.log("--guid:\n", note.guid);
        //console.log("--标题:\n", note.title);
        //console.log("--创建时间:\n", TimeUtil.TimeStampToString(note.created));
        //console.log("--更新时间:\n", TimeUtil.TimeStampToString(note.updated));
        //console.log("--文件大小:\n", note.contentLength);
        //console.log("--笔记本guid:\n", note.notebookGuid);
        //console.log("--内容:\n", note.content);
    //});


//--guid:
// 38db6523-6b38-4f5c-a7b9-2c651807ebeb
//--标题:
// 随笔
//--创建时间:
// 2020-04-09 08:24:55
//--更新时间:
// 2020-04-09 08:26:18
//--文件大小:
// 206
//--笔记本guid:
// 99d25415-7699-45a8-9327-1595548a9079

//    // ------------------ 新建笔记 ----------------
//    let markdown = "你好啊我的Markdown笔记";
//
//    // 转换笔记内容为印象笔记的专用格式
//    converter.toEnml(markdown).then(function(enml){
//        console.log(enml);
//    
//        // ------------------ 新建笔记 ----------------
//        let meta = {
//            title:"EverSyncClient Test",
//            tags: "markdown",
//            notebook: "blog"
//        }
//        let content = enml;
//        let resources = 0;
//        client.createNote(meta,content,resources).then(function(nte) {
//            console.log("---> create note success!\n-------------------\nnoteGuid=" + nte.guid + "\nnoteTitle=" + nte.title + "\nnotebookGuid=" + nte.notebookGuid + "\n");
//        });
//    });
//    
//    return;

//noteGuid=18c1336d-767c-4349-8789-7eb5ef2063e6
//noteTitle=EverSyncClient Test
//notebookGuid=99d25415-7699-45a8-9327-1595548a9079

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
           //let noteGuid = "4f53529a-e2b5-468e-b76a-b8d27370f1c0" ;
            let markdown_update = "# 单元测试 \n## 哈哈H1标题\n - 你好啊我的Markdown笔记\n - 美国总统大选2020年，拜登 and Trump 🇺";
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
    
    });

});


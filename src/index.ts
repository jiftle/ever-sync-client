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

    // 列出笔记本列表
    client.listNotebooks().then(function(notebook){
      console.log(notebook[0]);
        client.listNotes(notebook[0]).then(function(notes){
            console.log(notes);
        });
    });

});


// 引用evernote sdk
import * as Evernote from "evernote";


const RECENT_NOTE_COUNT = 10;
const MAX_NOTE_COUNT = 50;
let attributes = {};

// 类定义
export class EvernoteClient {
    // 定义成员变量
    noteStore;

    // 构造函数
    constructor(token, noteStoreUrl) {
        if (!token) {
            console.log("missing token in configuration，token丢失");
        }
        //  const options = {
        //    token
        //  };

        const options = {
            sandbox: false,
            china: true,
            token
        };

        // 实例化客户端
        const client = new Evernote.Client(options);
//        console.log("客户端实例: \n", client);
        this.noteStore = client.getNoteStore(noteStoreUrl);
        //console.log("客户端实例-存储: \n", this.noteStore);

    }

    // 当前状态
    async getCurLoginStatus() {
    //    let latestUpdateCount = 0; // Persist this value

        // Each time you want to check for new and updated notes...
        let currentState = await this.noteStore.getSyncState();
        console.log("currentState = ", currentState);
      //  let currentUpdateCount = currentState.getUpdateCount();
      //  console.log("currentUpdateCount = ", currentUpdateCount);

      //  if (currentUpdateCount > latestUpdateCount) {

      //      // Keep track of the new high-water mark
      //      latestUpdateCount = currentState.getUpdateCount();
      //      console.log("latestUpdateCount = ", latestUpdateCount);
      //  }
        return currentState;
    }

    // 列出最近笔记
    listRecentNotes() {
        return this.noteStore.findNotesMetadata({
            order: Evernote.Types.NoteSortOrder.UPDATED
        }, 0, RECENT_NOTE_COUNT, {
                includeTitle: true,
                includeNotebookGuid: true,
                includeTagGuids: true
            });
    }

    // 列出笔记本
    listMyNotes(intitle) {
        let filter = new Evernote.NoteStore.NoteFilter({
            words: intitle,
            ascending: true
        });
        return this.noteStore.findNotesMetadata(
            filter,
            0, 500, {
                includeTitle: true,
                includeNotebookGuid: true,
                includeTagGuids: true
            });
    }

    // 列出笔记本 
    listNotebooks() {
        return this.noteStore.listNotebooks();
    }

    // 列出所有的笔记元数据
    listAllNoteMetadatas(notebookGuid) {
        return this.noteStore.findNotesMetadata({
            notebookGuid
        }, 0, MAX_NOTE_COUNT, {
                includeTitle: true,
                includeNotebookGuid: true,
                includeTagGuids: true
            });
    }

    // 获得笔记的内容
    getNoteContent(noteGuid) {
        return this.noteStore.getNoteWithResultSpec(noteGuid, {
            includeContent: true
        });
    }

    // 获取笔记的资源
    getNoteResources(noteGuid) {
        return this.noteStore.getNoteWithResultSpec(noteGuid, {
            includeResourceData: true
        });

    }

    // 得到资源
    getResource(guid) {
        return this.noteStore.getResource(guid, true, false, true, false);
    }

    // 更新笔记本内容
    updateNoteContent(guid, title, content, tagNames, notebookGuid) {
        return this.noteStore.updateNote({
            guid,
            title,
            content,
            tagNames,
            notebookGuid,
            attributes
        });
    }

    // 更新笔记资源
    updateNoteResources(guid, title, content, tagNames, notebookGuid, resources) {
        return this.noteStore.updateNote({
            guid,
            title,
            content,
            tagNames,
            notebookGuid,
            resources,
            attributes
        });
    }

    // 创建笔记本
    createNotebook(title) {
        return this.noteStore.createNotebook({
            name: title
        });
    }

    // 创建笔记
    createNote(title, notebookGuid, content, tagNames, resources) {
        return this.noteStore.createNote({
            title,
            notebookGuid,
            content,
            tagNames,
            resources,
            attributes
        });
    }

    // list all tags, and store it in local. guid -> name (hash by guid)
    listTags() {
        return this.noteStore.listTags();
    }



    // 搜索笔记
    searchNote(words) {
        return this.noteStore.findNotesMetadata({
            words
        }, 0, MAX_NOTE_COUNT, {
                includeNotebookGuid: true,
                includeTitle: true
            });
    }

    // 获取标签
    getTag(guid) {
        return this.noteStore.getTag(guid);
    }

    // 获取默认笔记本
    getDefaultNotebook() {
        return this.noteStore.getDefaultNotebook();
    }
}

import * as buffer from "buffer";
import Converter from "./utils/converterplus";
import * as _ from "lodash";
import * as open from "opener";
import * as util from "util";
import * as path from "path";
import {
    hash,
    guessMime
} from "./utils/myutil";
import fs from "./utils/file";
import * as evernote from "evernote";
import {
    EvernoteClient
} from "./api/everapi";

// token 申请地址
// https://app.yinxiang.com/api/DeveloperToken.action

//const ATTACHMENT_FOLDER_PATH = config.attachmentsFolder || path.join(__dirname, "../../attachments");
const ATTACHMENT_FOLDER_PATH = path.join("", "../../attachments");
const ATTACHMENT_SOURCE_LOCAL = 0;
const ATTACHMENT_SOURCE_SERVER = 1;
const TIP_BACK = "back...";
const METADATA_PATTERN = /^---[ \t]*\n((?:[ \t]*[^ \t:]+[ \t]*:[^\n]*\n)+)---[ \t]*\n/;

const METADATA_HEADER = `\
---
title: %s
tags: %s
notebook: %s
---

`;

// ------------------ 笔记本，本地缓存 ----------------
let m_notebooks;
let m_notesMap;
let m_selectedNotebook;
const localNote = {};

//let showTips;
//
//  ------------ 客户端 -----------
let client;
//const serverResourcesCache = {};
const tagCache = {};
const converter = new Converter({});

// doc -> [{filepath: attachment}]
const attachmentsCache = {};

// 参数配置
let config = {
    token: "",
    noteStoreUrl: ""
};

// 类定义
export default class EverSyncClient {


    // 同步印象笔记账号，元数据
    // Synchronize evernote account. For metadata.
    async syncAccount(token :string, noteStoreUrl :string) {
        config.token = token;
        config.noteStoreUrl = noteStoreUrl;

        try {
            // 懒加载
            // lazy initilation.
            client = new EvernoteClient(config.token, config.noteStoreUrl);
            // console.log(client);
            if (client.errorCode != null) {
                console.log("syncAccount--**-- EvernoteClient调用失败");
            }

            //console.log("--**-- 1");

            try {
                let curLoginStatus = await client.getCurLoginStatus();
                console.log("--- 登录状态: ", curLoginStatus);
  //currentTime: 1604501263592,
  //fullSyncBefore: 1454173352000,
  //updateCount: 18254,
  //uploaded: 36060,
  //userLastUpdated: 1604329567000,
  //userMaxMessageEventId: 94206583

            } catch (error) {
                console.log(" (X)|--> 登录失败，错误信息: \n", error);
                return false;
            }

            // 保存标签信息到本地, awit 等待执行完毕，返回
            const tags = await client.listTags();
            //console.log("----- tags: \n", tags);
            tags.forEach(
                tag => tagCache[tag.guid] = tag.name
            );

            // 保存笔记本信息到本地
            m_notebooks = await client.listNotebooks();
            // console.log("-------------------- notebooks ------------------");
            // console.log(m_notebooks);

            // 返回结果 promises
            let promises = m_notebooks.map(
                notebook => client.listAllNoteMetadatas(notebook.guid)
            );

            // 以上3个await 执行结果 Promise.all
            // const allMetas = await Promise.all(promises);
            const allMetas = await Promise.all(promises);

            // 遍历笔记本
            const notes = _.flattenDeep(
                allMetas.map(
                    (meta: evernote.Types.Note) => meta.notes
                )
            );
            // console.log("-------------------- notes,笔记本内的笔记 ------------------");
            // console.log(notes);

            m_notesMap = _.groupBy(notes, "notebookGuid");

            console.log("账号同步成功，数据(标签、笔记本、元数据)已经缓存到本地. Synchronizing succeeded!", 1000);
            return true;
        } catch (err) {
            this.wrapError(err);
            return false;
        }
    }

    // 列出所有的笔记本
    // List all notebooks name.
    listNotebooks() {
        try {
            // => 箭头函数
            let notebooks = m_notebooks.map(
                // => 箭头函数，返回值需要使用小括号括起来
                notebook => ({
                    name: notebook.name,
                    guid: notebook.guid
                })
            );
            return notebooks;
        } catch (err) {
            this.wrapError(err);
        }

    }

    // List notes in the notebook. (200 limits.)
    // 列出笔记
    listNotes(notebook) {
        //        console.log("----------- ListNotes , 入参");
        //        console.log(notebook);

        m_selectedNotebook = m_notebooks.find(
            notebook => notebook.name
        );

        //        console.log("----------- 选中笔记本");
        //        console.log(m_selectedNotebook);
        let noteLists = m_notesMap[m_selectedNotebook.guid];
        //        console.log("----------- noteLists");
        //        console.log(noteLists);

        return noteLists;
    }

    //  exact text Metadata by convention 分析文件头得到元数据
    exactMetadata(text) {
        let metadata = {};
        let content = text;
        if (_.startsWith(text, "---")) {
            let match = METADATA_PATTERN.exec(text);
            if (match) {
                content = text.substring(match[0].trim().length).replace(/^\s+/, "");
                let metadataStr = match[1].trim();
                let metaArray = metadataStr.split("\n");
                metaArray.forEach(value => {
                    let sep = value.indexOf(":");
                    metadata[value.substring(0, sep).trim()] = value.substring(sep + 1).trim();
                });
                if (metadata["tags"]) {
                    let tagStr = metadata["tags"];
                    metadata["tags"] = tagStr.split(",").map(value => value.trim());
                }
            }
        }
        return {
            "metadata": metadata,
            "content": content
        };
    }

    genMetaHeader(title, tags, notebook) {
        return util.format(METADATA_HEADER, title, tags.join(","), notebook);
    }



    // Publish note to Evernote Server. with resources.
    async publishNote() {
        try {
            let NoteText = "";
            let result = this.exactMetadata(NoteText);
            let content = await converter.toEnml(result.content);
            let meta = result.metadata;
            let title = meta["title"];
            let resources;

            let fileName = title;
            // 服务器上已经存在同名文件
            let bNoteIsExisted = false;
            if (bNoteIsExisted) {
                // update the note.
                let updatedNote;
                let noteGuid = localNote[fileName].guid;

                const noteResources = await client.getNoteResources(noteGuid);
                updatedNote = await this.updateNoteContent(meta, content, noteGuid);

                let notebookName = notebooks.find(notebook => notebook.guid === updatedNote.notebookGuid).name;
                // attachments cache should be removed.
                console.log(`${notebookName}>>${title} updated successfully.`);
            } else {
                const nguid = await this.getNoteGuid(meta);
                if (nguid) {
                    const updateNote = await this.updateNoteOnServer(meta, content, resources, nguid);
                    updateNote.resources = resources;
                    if (!notesMap[updateNote.notebookGuid]) {
                        notesMap[updateNote.notebookGuid] = [updateNote];
                    } else {
                        notesMap[updateNote.notebookGuid].push(updateNote);
                    }
                    localNote[fileName] = updateNote;
                    let notebookName = notebooks.find(notebook => notebook.guid === updateNote.notebookGuid).name;
                    attachmentsCache[fileName] = [];
                    return console.log(`${notebookName}>>${title} update to server successfully.`);
                } else {
                    const createdNote = await this.createNote(meta, content, resources);
                    createdNote.resources = resources;
                    if (!notesMap[createdNote.notebookGuid]) {
                        notesMap[createdNote.notebookGuid] = [createdNote];
                    } else {
                        notesMap[createdNote.notebookGuid].push(createdNote);
                    }
                    localNote[fileName] = createdNote;
                    let notebookName = notebooks.find(notebook => notebook.guid === createdNote.notebookGuid).name;
                    attachmentsCache[fileName] = [];
                    console.log(`${notebookName}>>${title} created successfully.`);
                }
            }
        } catch (err) {
            this.wrapError(err);
        }
    }

    // Update an exsiting note.
    async updateNoteContent(meta, content, noteGuid) {
        try {
            let tagNames = meta["tags"];
            let title = meta["title"];
            let notebook = meta["notebook"];
            const notebookGuid = await this.getNotebookGuid(notebook);
            let note = await client.updateNoteContent(noteGuid, title, content, tagNames, notebookGuid);
            return note

        } catch (err) {
            this.wrapError(err);
        }
    }

    // Choose notebook. Used for publish.
    // 根据名字查找笔记本
    async getNotebookGuid(notebook) {
        try {
            let notebookGuid;
            if (notebook) {
                let notebookLocal = notebooks.find(nb => nb.name === notebook);
                if (notebookLocal) {
                    notebookGuid = notebookLocal.guid;
                } else {
                    const createdNotebook = await client.createNotebook(notebook);
                    notebooks.push(createdNotebook);
                    notebookGuid = createdNotebook.guid;
                }
            } else {
                const defaultNotebook = await client.getDefaultNotebook();
                notebookGuid = defaultNotebook.guid;
            }
            return notebookGuid;
        } catch (err) {
            this.wrapError(err);
        }
    }

    // 查找笔记
    async getNoteGuid(meta) {
        let title = meta["title"];
        let intitle = 'intitle:' + '"' + title + '"';
        let nguid = null;
        let re = await client.listMyNotes(intitle);
        let resul = re.notes;
        let arrayLength = resul.length;
        let i;
        for (i = 0; i < arrayLength; i++) {
            if (resul[i].title == title) nguid = resul[i].guid;
        }
        return nguid;
    }

    // 查找笔记
    async getNoteGuidByTitle(title) {
        let intitle = 'intitle:' + '"' + title + '"';
        let nguid = null;

        // 模糊查找
        let re = await client.listMyNotes(intitle);
        let resul = re.notes;
        let arrayLength = resul.length;
        let i;

        // 筛选出，名字完全一致的笔记
        for (i = 0; i < arrayLength; i++) {
            if (resul[i].title == title) nguid = resul[i].guid;
        }
        return nguid;
    }
    // 更新服务器上的笔记
    async updateNoteOnServer(meta, content, resources, nguid) {
        try {
            let title = meta["title"];
            let tagNames = meta["tags"];
            let notebook = meta["notebook"];
            const notebookGuid = await this.getNotebookGuid(notebook);
            return client.updateNoteResources(nguid, title, content, tagNames, notebookGuid, resources || void 0);
        } catch (err) {
            this.wrapError(err);
        }
    }

    // Create an new note.
    async createNote(meta, content, resources) {
        try {
            let tagNames = meta["tags"];
            let title = meta["title"];
            let notebook = meta["notebook"];
            console.log("notebook=" + notebook);

            // 获得笔记本的guid
            const notebookGuid = await this.getNotebookGuid(notebook);

            console.log("notebook guid =" + notebookGuid);
            const note = await client.createNote(title, notebookGuid, content, tagNames, resources || void 0);
            return note
        } catch (err) {
            this.wrapError(err);
        }
    }


    // Search note.
    async searchNote(query) {
        try {
            const searchResult = await client.searchNote(query);
            const noteWithbook = searchResult.notes.map(note => {
                let title = note["title"];
                selectedNotebook = notebooks.find(notebook => notebook.guid === note.notebookGuid);
                return selectedNotebook.name + ">>" + title;
            });
            console.log(noteWithbook);
        } catch (err) {
            this.wrapError(err);
        }
    }


    // Open search result note. (notebook >> note)
    async openSearchResult(noteWithbook, notes) {
        try {
            let index = noteWithbook.indexOf(">>");
            let searchNoteResult = noteWithbook.substring(index + 2);
            let chooseNote = notes.find(note => note.title === searchNoteResult);
            const note = await client.getNoteContent(chooseNote.guid);
            const content = note.content;
            console.log("--------------- content=\n" + content)

            //await cacheAndOpenNote(note, doc, content);
        } catch (err) {
            this.wrapError(err);
        }

    }

    // 获取笔记内容
    async getNoteContent(noteGuid) {
        try {
            console.log("|--> 笔记GUID: ", noteGuid);
            const noteContent = await client.getNoteContent(noteGuid);
            console.log("|--> 笔记, ", noteContent);

            return noteContent
        } catch (err) {
            this.wrapError(err);
        }
    }

    getNoteLink(noteGuid) {
        const token = config.token;
        if (token && noteGuid) {
            let userInfo = token.split(":");
            let shardId = userInfo[0].substring(2);
            let userId = parseInt(userInfo[1].substring(2), 16);
            return `evernote:///view/${userId}/${shardId}/${noteGuid}/${noteGuid}/`;
        }
        return "";
    }

    async openNoteInBrowser(noteGuid) {
        const domain = config.noteStoreUrl.slice(0, -9);
        const url = util.format(domain + "view/%s", noteGuid);
        console.log("url:", url)
    }


    // open evernote dev page to help you configure.
    async openDevPage() {
        try {
            console.log("https://app.yinxiang.com/api/DeveloperToken.action");

        } catch (err) {
            this.wrapError(err)
        }
    }

    wrapError(error) {
        if (!error) {
            return;
        }

        let errMsg;
        if (error.statusCode && error.statusMessage) {
            errMsg = `Http Error: ${error.statusCode}- ${error.statusMessage}, Check your ever config please.`;
        } else if (error.errorCode && error.parameter) {
            errMsg = `Evernote Error: ${error.errorCode} - ${error.parameter}`;
        } else {
            errMsg = "Unexpected Error: " + JSON.stringify(error);
        }

        console.log(errMsg);
    }


}

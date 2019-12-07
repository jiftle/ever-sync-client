"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const converterplus_1 = require("./converterplus");
const _ = require("lodash");
const util = require("util");
const path = require("path");
const everapi_1 = require("./everapi");
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
let notebooks;
let notesMap;
let selectedNotebook;
const localNote = {};
let showTips;
let client;
const serverResourcesCache = {};
const tagCache = {};
const converter = new converterplus_1.default({});
// doc -> [{filepath: attachment}]
const attachmentsCache = {};
let config = {
    token: "",
    noteStoreUrl: ""
};
// 类定义
class EverSyncClient {
    // Synchronize evernote account. For metadata.
    syncAccount(token, noteStoreUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            config.token = token;
            config.noteStoreUrl = noteStoreUrl;
            try {
                // lazy initilation.
                client = new everapi_1.EvernoteClient(config.token, config.noteStoreUrl);
                // 保存标签信息到本地
                const tags = yield client.listTags();
                tags.forEach(tag => tagCache[tag.guid] = tag.name);
                // 保存笔记本信息到本地
                notebooks = yield client.listNotebooks();
                let promises = notebooks.map(notebook => client.listAllNoteMetadatas(notebook.guid));
                const allMetas = yield Promise.all(promises);
                const notes = _.flattenDeep(allMetas.map((meta) => meta.notes));
                notesMap = _.groupBy(notes, "notebookGuid");
                console.log("Synchronizing succeeded!", 1000);
            }
            catch (err) {
                this.wrapError(err);
            }
        });
    }
    // List all notebooks name.
    listNotebooks() {
        try {
            return notebooks.map(notebook => notebook.name);
        }
        catch (err) {
            this.wrapError(err);
        }
    }
    // List notes in the notebook. (200 limits.)
    listNotes(notebook) {
        //    console.log(notebooks);
        selectedNotebook = notebooks.find(nb => nb.name === notebook);
        //console.log(selectedNotebook);
        let noteLists = notesMap[selectedNotebook.guid];
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
    publishNote() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let NoteText = "";
                let result = this.exactMetadata(NoteText);
                let content = yield converter.toEnml(result.content);
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
                    const noteResources = yield client.getNoteResources(noteGuid);
                    updatedNote = yield this.updateNoteContent(meta, content, noteGuid);
                    let notebookName = notebooks.find(notebook => notebook.guid === updatedNote.notebookGuid).name;
                    // attachments cache should be removed.
                    console.log(`${notebookName}>>${title} updated successfully.`);
                }
                else {
                    const nguid = yield this.getNoteGuid(meta);
                    if (nguid) {
                        const updateNote = yield this.updateNoteOnServer(meta, content, resources, nguid);
                        updateNote.resources = resources;
                        if (!notesMap[updateNote.notebookGuid]) {
                            notesMap[updateNote.notebookGuid] = [updateNote];
                        }
                        else {
                            notesMap[updateNote.notebookGuid].push(updateNote);
                        }
                        localNote[fileName] = updateNote;
                        let notebookName = notebooks.find(notebook => notebook.guid === updateNote.notebookGuid).name;
                        attachmentsCache[fileName] = [];
                        return console.log(`${notebookName}>>${title} update to server successfully.`);
                    }
                    else {
                        const createdNote = yield this.createNote(meta, content, resources);
                        createdNote.resources = resources;
                        if (!notesMap[createdNote.notebookGuid]) {
                            notesMap[createdNote.notebookGuid] = [createdNote];
                        }
                        else {
                            notesMap[createdNote.notebookGuid].push(createdNote);
                        }
                        localNote[fileName] = createdNote;
                        let notebookName = notebooks.find(notebook => notebook.guid === createdNote.notebookGuid).name;
                        attachmentsCache[fileName] = [];
                        console.log(`${notebookName}>>${title} created successfully.`);
                    }
                }
            }
            catch (err) {
                this.wrapError(err);
            }
        });
    }
    // Update an exsiting note.
    updateNoteContent(meta, content, noteGuid) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let tagNames = meta["tags"];
                let title = meta["title"];
                let notebook = meta["notebook"];
                const notebookGuid = yield this.getNotebookGuid(notebook);
                return client.updateNoteContent(noteGuid, title, content, tagNames, notebookGuid);
            }
            catch (err) {
                this.wrapError(err);
            }
        });
    }
    // Choose notebook. Used for publish.
    getNotebookGuid(notebook) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let notebookGuid;
                if (notebook) {
                    let notebookLocal = notebooks.find(nb => nb.name === notebook);
                    if (notebookLocal) {
                        notebookGuid = notebookLocal.guid;
                    }
                    else {
                        const createdNotebook = yield client.createNotebook(notebook);
                        notebooks.push(createdNotebook);
                        notebookGuid = createdNotebook.guid;
                    }
                }
                else {
                    const defaultNotebook = yield client.getDefaultNotebook();
                    notebookGuid = defaultNotebook.guid;
                }
                return notebookGuid;
            }
            catch (err) {
                this.wrapError(err);
            }
        });
    }
    getNoteGuid(meta) {
        return __awaiter(this, void 0, void 0, function* () {
            let title = meta["title"];
            let intitle = 'intitle:' + '"' + title + '"';
            let nguid = null;
            let re = yield client.listMyNotes(intitle);
            let resul = re.notes;
            let arrayLength = resul.length;
            let i;
            for (i = 0; i < arrayLength; i++) {
                if (resul[i].title == title)
                    nguid = resul[i].guid;
            }
            return nguid;
        });
    }
    // 更新服务器上的笔记
    updateNoteOnServer(meta, content, resources, nguid) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let title = meta["title"];
                let tagNames = meta["tags"];
                let notebook = meta["notebook"];
                const notebookGuid = yield this.getNotebookGuid(notebook);
                return client.updateNoteResources(nguid, title, content, tagNames, notebookGuid, resources || void 0);
            }
            catch (err) {
                this.wrapError(err);
            }
        });
    }
    // Create an new note.
    createNote(meta, content, resources) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let tagNames = meta["tags"];
                let title = meta["title"];
                let notebook = meta["notebook"];
                console.log("notebook=" + notebook);
                // 获得笔记本的guid
                const notebookGuid = yield this.getNotebookGuid(notebook);
                console.log("notebook guid =" + notebookGuid);
                const note = yield client.createNote(title, notebookGuid, content, tagNames, resources || void 0);
                return note;
            }
            catch (err) {
                this.wrapError(err);
            }
        });
    }
    // Search note.
    searchNote(query) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const searchResult = yield client.searchNote(query);
                const noteWithbook = searchResult.notes.map(note => {
                    let title = note["title"];
                    selectedNotebook = notebooks.find(notebook => notebook.guid === note.notebookGuid);
                    return selectedNotebook.name + ">>" + title;
                });
            }
            catch (err) {
                this.wrapError(err);
            }
        });
    }
    // Open search result note. (notebook >> note)
    openSearchResult(noteWithbook, notes) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let index = noteWithbook.indexOf(">>");
                let searchNoteResult = noteWithbook.substring(index + 2);
                let chooseNote = notes.find(note => note.title === searchNoteResult);
                const note = yield client.getNoteContent(chooseNote.guid);
                const content = note.content;
                console.log("--------------- content=\n" + content);
                //await cacheAndOpenNote(note, doc, content);
            }
            catch (err) {
                this.wrapError(err);
            }
        });
    }
    // 获取笔记内容
    getNoteContent(noteGuid) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const note = yield client.getNoteContent(noteGuid);
                return note;
            }
            catch (err) {
                this.wrapError(err);
            }
        });
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
    openNoteInBrowser(noteGuid) {
        return __awaiter(this, void 0, void 0, function* () {
            const domain = config.noteStoreUrl.slice(0, -9);
            const url = util.format(domain + "view/%s", noteGuid);
            console.log("url:", url);
        });
    }
    // open evernote dev page to help you configure.
    openDevPage() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log("https://app.yinxiang.com/api/DeveloperToken.action");
            }
            catch (err) {
                this.wrapError(err);
            }
        });
    }
    wrapError(error) {
        if (!error) {
            return;
        }
        let errMsg;
        if (error.statusCode && error.statusMessage) {
            errMsg = `Http Error: ${error.statusCode}- ${error.statusMessage}, Check your ever config please.`;
        }
        else if (error.errorCode && error.parameter) {
            errMsg = `Evernote Error: ${error.errorCode} - ${error.parameter}`;
        }
        else {
            errMsg = "Unexpected Error: " + JSON.stringify(error);
        }
        console.log(errMsg);
    }
}
exports.EverSyncClient = EverSyncClient;
//# sourceMappingURL=eversyncclient.js.map
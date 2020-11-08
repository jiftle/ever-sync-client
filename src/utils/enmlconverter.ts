import * as cheerio from "cheerio";
import * as hljs from "highlight.js";
import * as inlineCss from "inline-css";
import * as MarkdownIt from "markdown-it";
import * as mdSub from "markdown-it-sub";
import * as mdSup from "markdown-it-sup";
import * as mdEmoji from "markdown-it-emoji";
import * as mdEnmlTodo from "markdown-it-enml-todo";
import markdownItGithubToc from "markdown-it-github-toc";
import * as path from "path";
import * as toMarkdown from "to-markdown";
import * as util from "util";

// import * as fs from "fs";
import fs from "./file";

// 配置
let config = {
    fontFamily: ["宋体"],
    fontSize: "16px",
    codeFontFamily: ["monaco"],
    codeFontSize: "14px",
};

// Make this configurable
var __dirname = "";

const MARKDOWN_THEME_PATH = path.join(__dirname, "../../themes");
const HIGHLIGHT_THEME_PATH = path.join(__dirname, "../../node_modules/highlight.js/styles");
const DEFAULT_HIGHLIGHT_THEME = "github";
const MAGIC_SPELL = "%EVERMONKEY%";

const OVERRIDE_FONT_FAMILY = `
.markdown-body {
  font-family: %s !important;
}`;

const OVERRIDE_FONT_SIZE = `
.markdown-body {
  font-size: %s !important;
}`;

const OVERRIDE_CODE_FONT_FAMILY = `
.hljs {
  font-family: %s !important;
}`;

const OVERRIDE_CODE_FONT_SIZE = `
.hljs {
  font-size: %s !important;
}`;

// 转换器
export default class EnmlConverter {
    // 成员变量
    md;
    styles;
    // 构造器
    constructor(options = {}) {
        //console.log("-------- 构造函数 -----------");
        const md = new MarkdownIt({
            html: true,
            linkify: true,
            highlight(code, lang) {
                // code highlight
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return `<pre class="hljs"><code>${hljs.highlight(lang, code, true).value}</code></pre>`;
                    } catch (err) {}
                }
                return `<pre class="hljs"><code>${md.utils.escapeHtml(code)}</code></pre>`;
            },
            ...options,
        });

        // markdown-it plugin
        md.use(mdSub)
            .use(mdSup)
            .use(mdEnmlTodo)
            .use(mdEmoji)
            .use(markdownItGithubToc, {
                anchorLink: false
            });

        // Inline code class for enml style.
        const inlineCodeRule = md.renderer.rules.code_inline;
        md.renderer.rules.code_inline = (...args) => {
            const result = inlineCodeRule.call(md, ...args);
            return result.replace("<code>", '<code class="inline">');
        };

        // -------- 成员变量初始化
        this.md = md;
        //    let data = await this.initStyles();
        //   this.styles =  data;
        //   this.initStyles().then(
        //       data => this.styles = data
        //   ).catch(e => console.log(e));
    }

    // 初始化，样式层叠表
    async initStyles() {
        // markdown 主题
        const markdownTheme = "github.css";
        // 语法高亮，主题，和编程语言相关
        let highlightTheme = DEFAULT_HIGHLIGHT_THEME;

        // TODO: customize Evernote rendering by input markdown theme.
        // 使用指定的Markdown样式主题，渲染
        let formatTheme = highlightTheme.replace(/\s+/g, "-");

        let markdown_theme = path.join(MARKDOWN_THEME_PATH, markdownTheme);
        let highlight_theme = path.join(HIGHLIGHT_THEME_PATH, `${formatTheme}.css`);
        //console.log("func: initStyles--| markdown_theme: ", markdown_theme);
        //console.log("func: initStyles--| highlight_theme: ", highlight_theme);

          let ret1 = await fs.readFileAsync(markdown_theme)
        let ret2 = await  fs.readFileAsync(highlight_theme)

        let ret = [ret1,ret2];
        // TODO: read config css here and cover the default one.
        //     fs.readFileAsync(highlight_theme)

    //    let ret = Promise.all([
    //        // TODO: read to the memory, instead of IO each time.
    //        fs.readFileAsync(markdown_theme),
    //        // TODO: read config css here and cover the default one.
    //        fs.readFileAsync(highlight_theme)
    //    ]).then((values) => {
    //        console.log("func: initStyles, 加载完成 |--values: \n", values);
    //    })

        return ret
    }


    // 内容转化为印象笔记专用的格式
    async toEnml(markcontent) {

        //    await this.initStyles().then(function(data){
        //        console.log("func: toEnml |--> 样式初始化:\n", data);
        //    });

        let data = await this.initStyles();
        //console.log("func: toEnml |--> 样式初始化:\n", data);
        this.styles = data;

        //console.log("Markdown原文:\n" + markcontent)
        let base64_str = Buffer.from(markcontent, "utf-8").toString("base64");
        //console.log("Markdown-Base64:\n" + base64_str);

        // 1. 首先转化为HTML格式
        const html_str = await this.toHtml(markcontent);
        //console.log("markcontent-html:\n" + html_str);

        // 2-1. 加入专用的笔记头
        let enml = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note>';
        enml += "<!--" + MAGIC_SPELL;

        // 3. 笔记内容转化为BASE64格式
        enml += base64_str;

        // 2-2. 加入专用的笔记头
        enml += MAGIC_SPELL + "-->";

        enml += html_str;
        enml += "</en-note>";

        //console.log("完整的enml: \n" + enml)
        return enml;
    }


    // 转换为HTML
    async toHtml(markcontent) {
        let data = await this.initStyles();
        //console.log("func: toEnml |--> 样式初始化:\n", data);
        this.styles = data;
        //console.log("func: toHtml--------- in -----------")
        const tokens = this.md.parse(markcontent, {});
        //console.log("func: toHtml--------- parse ok -----------,tokens=", tokens)

        const html = this.md.renderer.render(tokens, this.md.options);
        //console.log("func: toHtml-------渲染后的Html:\n", html);

        const $ = cheerio.load(html);
        await this.processStyle($);

        let xml_str = $.xml();
        //console.log("func: toHtml--------- 处理完样式后,xml:\n", xml_str);
        return xml_str;
    }

    // 处理样式
    async processStyle($) {
        //console.log("func: processStyle--------------开始处理样式表css")
        // 处理css样式层叠表
        //console.log($)
        const styleHtml = await this.customizeCss($);
        //console.log("func: processStyle---> styleHtml:\n", styleHtml);
        $.root().html(styleHtml);
        //console.log("func: processStyle-----$root().html ---end")

        // Change html classes to inline styles
        // css样式表，存储到html内部
        const inlineStyleHtml = await inlineCss($.html(), {
        url: "/",
        removeStyleTags: true,
        removeHtmlSelectors: true,
        });
        //console.log("---Change html classes to inline styles---in")
        $.root().html(inlineStyleHtml);
        //console.log("---Change html classes to inline styles---out")
        $("en-todo").removeAttr("style");
        //console.log("---en-todo --end")
    }

    // 自定义CSS样式，层叠样式表
    async customizeCss($) {
        let fontFamily;
        let fontSize;
        let codeFontFamily;
        let codeFontSize;
        if (config.fontFamily) {
            fontFamily = util.format(OVERRIDE_FONT_FAMILY, config.fontFamily.join(","));
        }
        if (config.fontSize) {
            fontSize = util.format(OVERRIDE_FONT_SIZE, config.fontSize);
        }
        if (config.codeFontFamily) {
            codeFontFamily = util.format(OVERRIDE_CODE_FONT_FAMILY, config.codeFontFamily.join(","));
        }
        if (config.codeFontSize) {
            codeFontSize = util.format(OVERRIDE_CODE_FONT_SIZE, config.codeFontSize);
        }

        //console.log("func: customizeCss|--- this.styles: \n", this.styles);
        if (this.styles == undefined) {
            console.log("func: customizeCss|--> this.styles=undefined, 尚未加载完成");
            return null;
        }
        let ret = `<style>${this.styles.join("")}${fontFamily}${fontSize}${codeFontFamily}${codeFontSize}</style>` +
            `<div class="markdown-body">${$.html()}</div>`;

        return ret;
    }

    toMd(enml) {
        if (!enml) {
            return "";
        }
        let beginTagIndex = enml.indexOf("<en-note");
        let startIndex = enml.indexOf(">", beginTagIndex) + 1;
        let endIndex = enml.indexOf("</en-note>");
        let rawContent = enml.substring(startIndex, endIndex);
        if (rawContent.indexOf(MAGIC_SPELL) !== -1) {
            let beginMark = "<!--" + MAGIC_SPELL;
            let beginMagicIdx = rawContent.indexOf(beginMark) + beginMark.length;
            let endMagicIdx = rawContent.indexOf(MAGIC_SPELL + "-->");
            let magicString = rawContent.substring(beginMagicIdx, endMagicIdx);
            let base64content = new Buffer(magicString, "base64");
            return base64content.toString("utf-8");
        } else {
            let commentRegex = /<!--.*?-->/;
            let htmlStr = rawContent.replace(commentRegex, "");
            let mdtxt = toMarkdown(htmlStr);
            return this.todoFix(mdtxt);
        }
    }

    todoFix(markdown) {
        return markdown.replace(/<en-todo\s+checked="true"\s*\/?>/g, '[x] ')
            .replace(/<en-todo\s+checked="false"\s*\/?>/g, '[ ] ')
            .replace(/<en-todo\s*\/?>/g, '[ ] ')
            .replace(/<\/en-todo>/g, '');
    }
}

//---------------------- 单元测试代码 ------------------------
let markdown = "# 单元测试 \n## 哈哈H1标题\n - 你好啊我的Markdown笔记\n - 美国总统大选2020年，拜登 and Trump 🇺";

const converter = new EnmlConverter({});
// 转换笔记内容为印象笔记的专用格式
converter.toEnml(markdown).then(function (enml) {
  console.log(enml);
    let md = converter.toMd(enml);
    console.log(md);
});

// 笔记转换成Html
converter.toHtml(markdown).then(function(html){
    console.log(html);
});

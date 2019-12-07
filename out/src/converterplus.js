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
const cheerio = require("cheerio");
const hljs = require("highlight.js");
const inlineCss = require("inline-css");
const MarkdownIt = require("markdown-it");
const mdSub = require("markdown-it-sub");
const mdSup = require("markdown-it-sup");
const mdEmoji = require("markdown-it-emoji");
const mdEnmlTodo = require("markdown-it-enml-todo");
const markdown_it_github_toc_1 = require("markdown-it-github-toc");
const path = require("path");
const file_1 = require("./file");
const toMarkdown = require("to-markdown");
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
class Converter {
    constructor(options = {}) {
        const md = new MarkdownIt(Object.assign({ html: true, linkify: true, highlight(code, lang) {
                // code highlight
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return `<pre class="hljs"><code>${hljs.highlight(lang, code, true).value}</code></pre>`;
                    }
                    catch (err) { }
                }
                return `<pre class="hljs"><code>${md.utils.escapeHtml(code)}</code></pre>`;
            } }, options));
        // markdown-it plugin
        md.use(mdSub)
            .use(mdSup)
            .use(mdEnmlTodo)
            .use(mdEmoji)
            .use(markdown_it_github_toc_1.default, {
            anchorLink: false
        });
        // Inline code class for enml style.
        const inlineCodeRule = md.renderer.rules.code_inline;
        md.renderer.rules.code_inline = (...args) => {
            const result = inlineCodeRule.call(md, ...args);
            return result.replace("<code>", '<code class="inline">');
        };
        this.md = md;
        this.initStyles().then(data => this.styles = data).catch(e => console.log(e));
    }
    initStyles() {
        let highlightTheme = DEFAULT_HIGHLIGHT_THEME;
        // TODO: customize Mevernote rendering by input markdown theme.
        const markdownTheme = "github.css";
        let formatTheme = highlightTheme.replace(/\s+/g, "-");
        return Promise.all([
            // TODO: read to the memory, instead of IO each time.
            file_1.default.readFileAsync(path.join(MARKDOWN_THEME_PATH, markdownTheme)),
            // TODO: read config css here and cover the default one.
            file_1.default.readFileAsync(path.join(HIGHLIGHT_THEME_PATH, `${formatTheme}.css`))
        ]);
    }
    toHtml(markcontent) {
        return __awaiter(this, void 0, void 0, function* () {
            const tokens = this.md.parse(markcontent, {});
            const html = this.md.renderer.render(tokens, this.md.options);
            const $ = cheerio.load(html);
            yield this.processStyle($);
            return $.xml();
        });
    }
    toEnml(markcontent) {
        return __awaiter(this, void 0, void 0, function* () {
            const html = yield this.toHtml(markcontent);
            let enml = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note>';
            enml += "<!--" + MAGIC_SPELL;
            enml += Buffer.from(markcontent, "utf-8").toString("base64");
            enml += MAGIC_SPELL + "-->";
            enml += html;
            enml += "</en-note>";
            return enml;
        });
    }
    processStyle($) {
        return __awaiter(this, void 0, void 0, function* () {
            //    const styleHtml = this.customizeCss($);
            //    $.root().html(styleHtml);
            //
            // Change html classes to inline styles
            const inlineStyleHtml = yield inlineCss($.html(), {
                url: "/",
                removeStyleTags: true,
                removeHtmlSelectors: true,
            });
            //    $.root().html(inlineStyleHtml);
            $("en-todo").removeAttr("style");
        });
    }
    //  customizeCss($) {
    //    //const config = vscode.workspace.getConfiguration("evermonkey");
    //    let fontFamily;
    //    let fontSize;
    //    let codeFontFamily;
    //    let codeFontSize;
    //    if (config.fontFamily) {
    //      fontFamily = util.format(OVERRIDE_FONT_FAMILY, config.fontFamily.join(","));
    //    }
    //    if (config.fontSize) {
    //      fontSize = util.format(OVERRIDE_FONT_SIZE, config.fontSize);
    //    }
    //    if (config.codeFontFamily) {
    //      codeFontFamily = util.format(OVERRIDE_CODE_FONT_FAMILY, config.codeFontFamily.join(","));
    //    }
    //    if (config.codeFontSize) {
    //      codeFontSize = util.format(OVERRIDE_CODE_FONT_SIZE, config.codeFontSize);
    //    }
    //    return `<style>${this.styles.join("")}${fontFamily}${fontSize}${codeFontFamily}${codeFontSize}</style>` +
    //      `<div class="markdown-body">${$.html()}</div>`;
    //  }
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
        }
        else {
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
exports.default = Converter;
//# sourceMappingURL=converterplus.js.map
import * as fs from 'fs'
import * as path from 'path'

// a pattern for to handle nested curly brackets
const pattern = '\\{(?:(?:__pattern__)|(?:[^{}]))*\\}'
let nestedPattern = '\\{(?:(?:__pattern__)|(?:[^{}]))*\\}'
for (let i = 0; i < 3; i++) {
    nestedPattern = nestedPattern.replace('__pattern__', pattern)
}
nestedPattern = '(' + nestedPattern.replace('__pattern__', '\\{(?:[^{}])*\\}') + ')'
const fullNestedPattern = '(\\s*\\{(([^{}]*' + nestedPattern.replace('__pattern__', '\\{(?:[^{}])*\\}') + ')|([^;]*;))*\\s*)'
// a pattern to save everything that is in brackets or parens
const escapePattern = `((\\\\(([^()]|("[\s\S]*")|('[\s\S]*'))*\\\\))|(\\\\[([^\\[\\]]|("[\s\S]*")|('[\s\S]*'))*\\\\])`


class File {
    private content: string
    private path: string
    private options: any
    private isCSS: boolean

    constructor(file: string, options?: any) {
        this.path = file
        this.isCSS = path.extname(file) === '.css'
        this.content = fs.readFileSync(file, 'utf-8')
        this.options = options || {}
        this.options.autosave = this.options.autosave === 'undefined' ? true : this.options.autosave
        this.options.autorefresh = this.options.autorefresh === 'undefined' ? true : this.options.autorefresh
        if (!this.options.autosave) {
            this.options.autorefresh = false
        }
    }

    public writeProperty(selector: string, propertyName: string, propertyValue: string) {
        // get last version of the file
        if (this.options.autorefresh) {
            this.content = fs.readFileSync(this.path, 'utf-8')
        }

        // Build selector regexp
        let selectorP = selector.trim();
        // save everything that is in brackets or parens
        const escaped = selectorP.match(escapePattern) || []
        // escape regexp special characters
        selectorP = selectorP.replace(/[-[\]{}()*+:=?.,\\/^$|#]/g, '\\$&')
        // delete saved brackets and paren for now
        escaped.map((e: any, i: number) => selectorP = selectorP.replace(e, '__escaped' + i))

        let singleSelectors = selectorP.split('\\,')
        console.log(singleSelectors);

        let sss: string[] = []
        if (!this.isCSS && singleSelectors.length > 1) {
            const ss = singleSelectors.map((s) => s.split(/(?<=\w)(?=(\\\:){1,2}|\\\.|\\\#|\s)/).filter(t => t && t.trim()))
            console.log(ss);

            let a = ''
            let b = ''
            let prefix = ''
            do {
                console.log(a.replace(/\\/g, '\\\\'))
                if (a) {
                    singleSelectors = singleSelectors.map(s => s.trim().replace(new RegExp('^&?' + b.replace(/\\/g, '\\\\') + '(?=\\s)'), '').replace(new RegExp('^&?' + b.replace(/\\/g, '\\\\')), '&'))
                }
                console.log(singleSelectors);

                const selectors = singleSelectors.map(s => s ? this.processSelector(s, true) : '&')
                console.log(prefix);

                const p = prefix ? this.processSelector(prefix, false) + fullNestedPattern : ''
                sss.push(p + '(' + getPermutations(selectors).map((s) => s.join('\\s*,\\s*')).join('|') + ')')
                a = ss[0][0]
                b = a.trim()
                prefix += a
            } while (ss.reduce((acc, s) => {
                const r = s.shift()
                return acc && r !== undefined && r.trim() === b
            }, true))
        }
        else {
            const selectors = singleSelectors.map(s => this.processSelector(s, this.isCSS))
            sss = getPermutations(selectors).map((s) => s.join('\\s*,\\s*'))
        }

        let selectorRE = '(' + sss.join('|') + ')'

        // inject saved brackets and parens
        escaped.map((e: any, i: number) => selectorRE = selectorRE.replace('__escaped' + i, e))
        console.log(selectorRE)
        // Build global regexp
        const s3 = this.isCSS ? '[^{}]*' : '([^{}]|' + nestedPattern + ')*'
        const gre = new RegExp('(' + selectorRE + '\\s*{' + s3 + '[^\\w\\-]' + propertyName + '\\s*:)[^;}]*')
        console.log(gre)
        if (gre.test(this.content)) {
            // the property is found for the given selector : replace the value
            this.content = this.content.replace(gre, '$1 ' + propertyValue)
        }
        else {
            // the property is not found for that selector : test if the selector exists
            const sre = new RegExp(selectorRE + '\\s*{' + s3)
            console.log(sre);

            if (sre.test(this.content)) {
                // the selector is found : add the property
                this.content = this.content.replace(sre, `$&    ${propertyName}: ${propertyValue};\n`);
            }
            else {
                // the selector is not found : add the selector and the property at the end of the file
                this.content += `\n${selector} {\n    ${propertyName}: ${propertyValue};\n}\n`
            }
        }
        // write to file
        if (this.options.autosave) {
            this.save()
        }
    }

    public save() {
        fs.writeFileSync(this.path, this.content)
    }

    public refresh() {
        this.content = fs.readFileSync(this.path, 'utf-8')
    }

    private processSelector(selector: string, css: boolean) {

        // handle multi spaces
        const s0 = css ? '\\s*$1\\s*' : '(\\s*|' + fullNestedPattern + '(&\\s*))$1\\s*'

        selector = selector.replace(/\s*(>|\\\+|~)\s*/g, s0)

        // replace spaces in selector
        const s1 = css ? '\\s+' : '(\\s+|' + fullNestedPattern + '(&\\s+)?)'
        selector = selector.replace(/\s/g, s1)
        // replace selector special character
        const s2 = css ? '$&' : '($&|' + fullNestedPattern + '&$&)'

        selector = selector.replace(/(?<=\w)((\\\:){1,2}|\\\.|\\\#)/g, s2)

        return selector
    }
}

function getPermutations(elts: string[]): string[][] {
    let result = [];
    for (let i = 0; i < elts.length; i++) {
        let rest = getPermutations(elts.slice(0, i).concat(elts.slice(i + 1)))
        if (!rest.length) {
            result.push([elts[i]])
        } else {
            for (let j = 0; j < rest.length; j = j + 1) {
                result.push([elts[i]].concat(rest[j]))
            }
        }
    }
    return result;
}

export function open(file: string, options?: any) {
    return new File(file, options)
}
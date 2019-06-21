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
    private ext: string

    constructor(file: string, options?: any) {
        this.path = file
        this.ext = path.extname(file)
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

        const singleSelectors = selector.split(',').map(s => this.processSelector(s))
        const selectorRE = '(' + getPermutations(singleSelectors).map((s) => s.join('\\s*,\\s*')).join('|') + ')'

        // Build global regexp
        const s3 = this.ext === '.css' ? '[^{}]*' : '([^{}]|' + nestedPattern + ')*'
        const gre = new RegExp('(' + selectorRE + '\\s*{' + s3 + '[^\\w\\-]' + propertyName + '\\s*:)[^;}]*')

        if (gre.test(this.content)) {
            // the property is found for the given selector : replace the value
            this.content = this.content.replace(gre, '$1 ' + propertyValue)
        }
        else {
            // the property is not found for that selector : test if the selector exists
            const sre = new RegExp(selectorRE + '\\s*{([^{}]|' + nestedPattern + ')*')
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

    private processSelector(selector: string) {
        selector = selector.trim();
        // save everything that is in brackets or parens
        const escaped = selector.match(escapePattern) || []
        // escape regexp special characters
        let selectorRE = selector.replace(/[-[\]{}()*+:=?.,\\/^$|#]/g, '\\$&')
        // delete saved brackets and paren for now
        escaped.map((e: any, i: number) => selectorRE = selectorRE.replace(e, '__escaped' + i))
        // handle multi spaces
        const s0 = this.ext === '.css' ? '\\s*$1\\s*' : '(\\s*|' + fullNestedPattern + '(&\\s*))$1\\s*'

        selectorRE = selectorRE.replace(/\s*(>|\\\+|~)\s*/g, s0)
        selectorRE = selectorRE.replace(/\s*(\\\,)\s*/g, s0)

        // replace spaces in selector
        const s1 = this.ext === '.css' ? '\\s+' : '(\\s+|' + fullNestedPattern + '(&\\s+)?)'
        selectorRE = selectorRE.replace(/\s/g, s1)
        // replace selector special character
        const s2 = this.ext === '.css' ? '$&' : '($&|' + fullNestedPattern + '&$&)'

        selectorRE = selectorRE.replace(/(?<=\w)((\\\:){1,2}|\\\.|\\\#)/g, s2)

        // inject saved brackets and parens
        escaped.map((e: any, i: number) => selectorRE = selectorRE.replace('__escaped' + i, e))
        return selectorRE
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


// const style = open(path.resolve(__dirname, '../test/hello.css'), { autosave: false, autorefresh: false })
// style.writeProperty('.container .test, .container .hello', 'color', 'blue')
// style.save()
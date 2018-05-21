import Token from './token'

type Rule = Array<any>
interface LanguageSyntaxDefinition {
  tokenizer: { root: Array<Rule>; [state: string]: Array<Rule> }
  [definition: string]: Array<any> | any
}

// A monarch engine like language syntax definition
class Monarch {
  def: LanguageSyntaxDefinition
  tokenizer: (text: string) => Array<any>
  private replace(text: string): string {
    const p = /@(\w*)/g,
      replaceList = []
    for (let m = p.exec(text); m !== null; m = p.exec(text)) replaceList.push(m[1])
    for (const r of replaceList)
      text = text.replace(
        `@${r}`,
        this.def[r]
          ? Array.isArray(this.def[r])
            ? this.def[r].map((o: string) => o.replace(/([$()*+.?\/\\^{}|])/g, '\\$1')).join('|')
            : this.def[r].source
          : r,
      )
    return text
  }
  constructor(def: LanguageSyntaxDefinition) {
    this.def = def
    const { tokenizer } = this.def
    const { root } = tokenizer
    this.tokenizer = text => {
      const regex = new RegExp(root.map(rule => `(${this.replace(rule[0].source)})`).join('|'), 'g')
      const result = []
      for (let m = regex.exec(text); m !== null; m = regex.exec(text)) {
        for (let i = 1; i < m.length; i++) {
          if (m[i]) {
            const action = root[i - 1][1]
            let type: string = ''
            if (typeof action !== 'string') {
              if (action.token) type = action.token
              else if (action.cases) {
                for (const c in action.cases) {
                  if (new RegExp(this.replace(c)).test(m[i])) {
                    type = action.cases[c]
                    break
                  }
                }
                if (type === '') type = action.cases['@default']
              }
            } else type = action
            result.push({ input: m[i], start: m.index, end: m[i].length + m.index, type })
          }
        }
      }
      return result
    }
  }
}

class Tokenizer {
  text: string
  tokens: Array<Token> = []
  m: Monarch

  constructor(lsd: LanguageSyntaxDefinition) {
    this.m = new Monarch(lsd)
  }

  parse(text: string) {
    this.text = text
    const lineText: Array<string> = text.split('\n').map(line => line + '\n')
    const lineMap: Array<number> = []
    let beginIndex = 0
    for (const t of lineText) {
      lineMap.push(beginIndex)
      beginIndex += t.length
    }
    lineMap.push(beginIndex)
    const getLoc = (start: number, end: number) => {
      const result = { start: { line: 0, column: 0 }, end: { line: 0, column: 0 } }
      const bs = (index: number, isEnd: boolean) => {
        let l = 0,
          r = lineMap.length - 1,
          mid: number
        while (true) {
          if (l > r) {
            mid = l - 1
            break
          }
          mid = Math.floor((l + r) / 2)
          if (lineMap[mid] > index) r = mid - 1
          else if (lineMap[mid] < index) l = mid + 1
          else {
            mid -= isEnd ? 1 : 0
            break
          }
        }
        return mid
      }
      const startLine = bs(start, false)
      const endLine = bs(end, true)
      result.start = { line: startLine, column: start - lineMap[startLine] }
      result.end = { line: endLine, column: end - lineMap[endLine] }
      return result
    }

    this.tokens = this.m.tokenizer(this.text).map(({ input, start, end, type }: any) => {
      const token = new Token(input, start, end, type)
      token.loc = getLoc(start, end)
      return token
    })
  }
}

export default Tokenizer
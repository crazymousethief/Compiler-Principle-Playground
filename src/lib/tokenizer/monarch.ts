import { IMonarchLanguage, IMonarchState, ICompiledMonarchLanguage, ICompiledMonarchLanguageRule } from './monarchTypes'
import compile from './monarchCompile'
import Token from './token'

class Monarch {
  private readonly _ml: ICompiledMonarchLanguage
  private readonly stack: IMonarchState[] = []

  constructor(json: IMonarchLanguage) {
    this._ml = compile(json)

    const { tokenizer } = this._ml
    this.stack.push({ name: Object.keys(tokenizer)[0] })
  }

  tokenize(text: string): Token[] {
    const state = this.stack[this.stack.length - 1].name
    const { tokenizer } = this._ml
    const context = {
      index: 0,
      tokenList: <Token[]>[],
    }

    for (let lastIndex = 0; ; context.index = lastIndex) {
      for (const rule of tokenizer[state]) {
        lastIndex = this.runRule(rule, context.index, text, context)
        if (lastIndex !== context.index) break
      }
      if (lastIndex === context.index) break
    }

    return context.tokenList
  }

  private runRule(
    rule: ICompiledMonarchLanguageRule,
    index: number,
    text: string,
    context: { index: number; tokenList: Token[] },
  ): number {
    const { regex, action } = rule

    const re = new RegExp(regex.source, 'g')
    re.lastIndex = index
    const match = re.exec(text)

    if (match && match.index == index) {
      const { token, cases, group } = action
      if (token) {
        const type = match[0].replace(new RegExp(regex.source, 'g'), token)
        context.tokenList.push(
          new Token(match.index + (match.index < context.index ? context.index : 0), match[0], type),
        )
      } else if (cases) {
        for (const rule of cases) if (this.runRule(rule, 0, match[0], context) > 0) break
      } else if (group) {
        if (match.reduce((pv, cv) => pv + cv.length, 0) > 2 * match[0].length)
          throw new Error(
            `With groups, all characters should be matched in consecutive groups in rule: ${rule.regex.source}`,
          )
        for (let i = 1, lengthIndex = 0; i < match.length; lengthIndex += match[i++].length) {
          context.index += this.runRule(
            { regex: new RegExp(`^[\\s\\S]*$`), action: group[i - 1] },
            0,
            match[i],
            context,
          )
        }
      }
      return re.lastIndex
    }
    return index
  }

  private groupCount(re: RegExp): number {
    const nonEscape = re.source.replace(
      new RegExp('.*+?^=!:${}()|[]/\\'.replace(/./g, '\\\\\\$&|') + '\\[.*\\]', 'g'),
      '',
    )

    // TODO: There may be a better solution
    const groupMatchRE = /\(\?\:|\)|\(/g
    let groupRegexp = ''
    for (let m = groupMatchRE.exec(nonEscape); m !== null; m = groupMatchRE.exec(nonEscape)) groupRegexp += m[0]
    const groupResult = new RegExp(`${groupRegexp}`).exec('')

    return groupResult ? groupResult.length - 1 : 0
  }
}

export default Monarch

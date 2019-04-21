import { LL1Grammar, epsilon, $accept, $end, Symbol } from '@/lib/grammar'
import { Token } from '@/lib/tokenizer'
import { ASTNode } from './ASTNode'

type PredictiveTable = Map<Symbol, Map<Symbol, number>>

export class LL1Parser {
  private readonly _predictiveTable: PredictiveTable = new Map()
  private readonly _grammar: LL1Grammar

  constructor(grammar: LL1Grammar) {
    this._grammar = grammar
    grammar.getProductions().forEach((production, i) => {
      const [symbol, alternative] = production
      const firstSet = grammar.first(alternative)
      const add = (s: Symbol) => (grammar.terminals.has(s) ? this.addProduction(i, symbol, s) : null)
      firstSet.forEach(add)
      if (firstSet.has(epsilon)) grammar.follow(symbol).forEach(add)
    })
  }

  public getPredictiveTable(): PredictiveTable {
    return this._predictiveTable
  }

  public parse(tokens: Token[]): ASTNode {
    const root = new ASTNode($accept)
    const stack = [root]
    let index = 0,
      X = $accept

    while (X !== $end) {
      const token = tokens[index]

      if (this._grammar.terminals.has(X)) {
        if (token.type === X || token.token === X) {
          stack.pop()
          index++
        } else throw new Error()
      } else if (this.getM(X, token.type) === undefined && this.getM(X, token.token) === undefined) {
        throw new Error()
      } else {
        const productions = this._grammar.getProductions()
        const production =
          this.getM(X, token.type) === undefined
            ? productions[this.getM(X, token.token)!]
            : productions[this.getM(X, token.type)!]
        const [, alternative] = production
        const top = stack.pop()!
        top.children = alternative.map(s => new ASTNode(s, top))
        stack.push(...[...top.children].reverse())
      }

      X = stack[stack.length - 1].symbol
    }

    return root
  }

  private getM(nonTerminal: Symbol, terminal: Symbol): number | undefined {
    const tMap = this._predictiveTable.get(nonTerminal)
    if (tMap) {
      return tMap.get(terminal)
    } else return undefined
  }

  private addProduction(index: number, nonTerminal: Symbol, terminal: Symbol) {
    let tMap = this._predictiveTable.get(nonTerminal)
    if (!tMap) {
      tMap = new Map()
      this._predictiveTable.set(nonTerminal, tMap)
    }
    if (tMap.has(terminal)) throw new Error(`M[${nonTerminal}, ${terminal}] can only be one item`)
    tMap.set(terminal, index)
  }
}
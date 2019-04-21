export type Symbol = string
export type Alternative = Array<Symbol>
export type Alternatives = Array<Alternative>
export type Production = [Symbol, Alternative]
export type Productions = Array<Production>
export type ProductionsIndexMap = Map<Symbol, [number, number]>
export type Firsts = Map<Symbol, Set<Symbol>>
export type Follows = Map<Symbol, Set<Symbol>>
export type IndexMap = Map<Symbol, Set<[Production, number]>>

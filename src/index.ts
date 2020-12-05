type RefObject<T> = {
  current: T
}

type LiteralType = 'bool' | 'string' | 'object' | 'array' | 'number'

const useRef = <T>(value: T): RefObject<T> => ({ current: value })

class Parser {
  private index = 0
  private string: string = ''
  private length = 0
  private numberRE = /[0-9]{0,20}\.?[0-9]+/g

  private skipBlank(): void {
    while (
      this.index < this.length &&
      /\s/.test(this.string.charAt(this.index))
    ) {
      this.index++
    }
  }

  parse(str: string): any {
    if (!str) return
    this.string = str
    this.index = 0
    this.length = str.length

    this.skipBlank()

    if (this.index >= this.length) return

    const char = this.string[this.index]

    if (char === '{') {
      let result = useRef<Record<string, any>>({})
      this.readObject(result)
      return result.current
    } else if (char === '[') {
      const array = useRef<any[]>([])

      this.readArray(array)

      return array.current
    }
  }

  private nextType(): LiteralType {
    if (this.index >= this.length) {
      this.error()
    }

    const char = this.string[this.index]

    if (char === '[') return 'array'
    else if (char === '{') return 'object'
    else if (char === '"') return 'string'
    else if (char >= '0' && char <= '9') return 'number'
    else if (
      this.string.substr(this.index, 4) === 'true' ||
      this.string.substr(this.index, 5) === 'false'
    )
      return 'bool'

    throw this.error()
  }

  private readObject(ref: RefObject<Record<string, any>>): void {
    this.index++

    this.skipBlank()
    if (this.string[this.index] !== '}' && this.string[this.index] !== '"')
      throw new Error(`unexpected token at index ${this.index}`)

    if (this.string[this.index] === '}') {
      this.index++
      return
    }

    while (true) {
      this.skipBlank()
      let key: string
      if (this.string[this.index] === '"') {
        key = this.readString()
      } else {
        throw this.error()
      }

      this.skipBlank()

      if (this.string[this.index] !== ':') {
        this.error()
      }

      this.index++

      this.skipBlank()

      const type = this.nextType()

      switch (type) {
        case 'array': {
          const array = useRef<any[]>([])
          this.readArray(array)
          ref.current[key] = array.current
          break
        }
        case 'bool': {
          const value = this.readBool()
          ref.current[key] = value
          break
        }
        case 'number': {
          const value = this.readNumber()
          ref.current[key] = value
          break
        }
        case 'object': {
          const obj = useRef<Record<string, any>>({})
          this.readObject(obj)
          ref.current[key] = obj.current
          break
        }
        case 'string': {
          const str = this.readString()
          ref.current[key] = str
          break
        }
      }

      this.skipBlank()

      if (this.index >= this.length) throw this.error()

      if (this.string[this.index] === ',') this.index++

      if (this.string[this.index] === '}') {
        this.index++
        return
      }
    }
  }

  error(): Error {
    return new Error(`unexpected token at index ${this.index}`)
  }

  private readString(): string {
    this.index++
    let start = this.index
    while (this.index < this.length && this.string[this.index] !== '"') {
      this.index++
    }

    if (this.string[this.index] !== '"') {
      throw this.error()
    }

    return this.string.slice(start, this.index++)
  }

  private readBool(): boolean {
    const result = this.string.substr(this.index, 4)

    if (result === 'true') {
      this.index += 4
      return true
    } else {
      this.index += 5
      return false
    }
  }

  private readNumber(): number {
    this.numberRE.lastIndex = this.index

    const match = this.numberRE.exec(this.string)

    if (!match) throw this.error()

    const lastIndex = this.numberRE.lastIndex
    const result = this.string.slice(this.index, lastIndex)
    this.index = lastIndex
    return +result
  }

  private readArray(array: RefObject<any[]>): void {
    this.index++

    this.skipBlank()

    if (this.index >= this.length) {
      throw this.error()
    }

    if (this.string[this.index] === ']') return

    while (true) {
      const type = this.nextType()
      switch (type) {
        case 'array': {
          const array = useRef<any[]>([])
          this.readArray(array)
          array.current.push(array.current)
          break
        }
        case 'bool': {
          const value = this.readBool()
          array.current.push(value)
          break
        }
        case 'number': {
          const value = this.readNumber()
          array.current.push(value)
          break
        }
        case 'object': {
          const obj = useRef<Record<string, any>>({})
          this.readObject(obj)
          array.current.push(obj.current)
          break
        }
        case 'string': {
          const str = this.readString()
          array.current.push(str)
          break
        }
      }

      this.skipBlank()
      if (this.index >= this.length) throw this.error()

      if (this.string[this.index] === ',') this.index++

      this.skipBlank()

      if (this.string[this.index] === ']') {
        this.index++
        return
      }
    }
  }
}

const parser = new Parser()

console.log(
  parser.parse(
    '{"a": 1, "b": [1,2,3], "c": true, "d": 3.14159, "e":{"f": [3,2,{}]}}'
  )
)

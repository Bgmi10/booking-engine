import type { Variable } from "./types"

export interface UnlayerDesign {
  body: {
    id: string
    rows: UnlayerRow[]
    values: {
      backgroundColor: string
      fontFamily: { label: string; value: string }
      textColor: string
      linkColor: string
      contentWidth: string
      contentAlign: string
    }
  }
}

export interface UnlayerRow {
  id: string
  cells: number[]
  columns: UnlayerColumn[]
  values: {
    backgroundColor?: string
    backgroundImage?: {
      url: string
      fullWidth: boolean
      repeat: boolean
      center: boolean
      cover: boolean
    }
    padding: string
    columnsBackgroundColor?: string
  }
}

export interface UnlayerColumn {
  id: string
  contents: UnlayerContent[]
}

export interface UnlayerContent {
  id: string
  type: "text" | "button" | "image" | "divider" | "spacer" | "html"
  values: Record<string, any>
}

export class HtmlToUnlayerConverter {
  private variables: Record<string, Variable>
  private rowCounter = 0
  private columnCounter = 0
  private contentCounter = 0

  constructor(variables: Record<string, Variable>) {
    this.variables = variables
  }

  public convertHtmlToUnlayerDesign(html: string): UnlayerDesign {
    // Parse HTML
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, "text/html")

    // Extract body styles
    const bodyStyles = this.extractBodyStyles(doc)

    // Convert content to rows
    const rows = this.convertContentToRows(doc.body)

    return {
      body: {
        id: "body",
        rows,
        values: {
          backgroundColor: bodyStyles.backgroundColor || "#f8fafc",
          fontFamily: {
            label: bodyStyles.fontFamily || "Arial",
            value: bodyStyles.fontFamily || "arial,helvetica,sans-serif",
          },
          textColor: bodyStyles.color || "#1f2937",
          linkColor: "#3b82f6",
          contentWidth: "600px",
          contentAlign: "center",
        },
      },
    }
  }

  private extractBodyStyles(doc: Document): Record<string, string> {
    const body = doc.body
    const styles: Record<string, string> = {}

    // Extract inline styles
    const styleAttr = body?.getAttribute("style") || ""
    if (styleAttr) {
      const inlineStyles = this.parseInlineStyles(styleAttr)
      Object.assign(styles, inlineStyles)
    }

    // Extract from style tags
    const styleTags = doc.querySelectorAll("style")
    styleTags.forEach((styleTag) => {
      const cssText = styleTag.textContent || ""
      const bodyStyles = this.extractBodyStylesFromCSS(cssText)
      Object.assign(styles, bodyStyles)
    })

    return styles
  }

  private extractBodyStylesFromCSS(css: string): Record<string, string> {
    const styles: Record<string, string> = {}
    const bodyMatch = css.match(/body\s*{([^}]*)}/i)

    if (bodyMatch) {
      const bodyCSS = bodyMatch[1]
      const parsedStyles = this.parseInlineStyles(bodyCSS)
      Object.assign(styles, parsedStyles)
    }

    return styles
  }

  private convertContentToRows(body: HTMLElement): UnlayerRow[] {
    const rows: UnlayerRow[] = []

    // Look for main container (usually a table or div with max-width)
    const mainContainer = this.findMainContainer(body)

    if (mainContainer) {
      const elements = Array.from(mainContainer.children)

      for (const element of elements) {
        const row = this.convertElementToRow(element as HTMLElement)
        if (row) {
          rows.push(row)
        }
      }
    } else {
      // Fallback: convert direct body children
      const elements = Array.from(body.children)
      for (const element of elements) {
        const row = this.convertElementToRow(element as HTMLElement)
        if (row) {
          rows.push(row)
        }
      }
    }

    // If no rows created, create a single HTML row with all content
    if (rows.length === 0) {
      rows.push(this.createHtmlRow(body.innerHTML))
    }

    return rows
  }

  private findMainContainer(body: HTMLElement): HTMLElement | null {
    // Look for common email container patterns
    const selectors = [
      'table[style*="max-width"]',
      'div[style*="max-width"]',
      'table[style*="width: 600px"]',
      'div[style*="width: 600px"]',
      ".email-container",
      "#email-container",
    ]

    for (const selector of selectors) {
      const container = body.querySelector(selector) as HTMLElement
      if (container) {
        return container
      }
    }

    // If no specific container, look for the first table or main div
    const firstTable = body.querySelector("table") as HTMLElement
    if (firstTable) {
      return firstTable
    }

    const mainDiv = body.querySelector("div") as HTMLElement
    if (mainDiv) {
      return mainDiv
    }

    return null
  }

  private convertElementToRow(element: HTMLElement): UnlayerRow | null {
    const tagName = element.tagName.toLowerCase()
    const styles = this.parseInlineStyles(element.getAttribute("style") || "")

    // Handle table rows
    if (tagName === "tr") {
      return this.convertTableRowToUnlayerRow(element)
    }

    // Handle divs and other block elements
    if (this.isBlockElement(element)) {
      return this.convertBlockElementToRow(element)
    }

    return null
  }

  private convertTableRowToUnlayerRow(tr: HTMLElement): UnlayerRow {
    const cells = Array.from(tr.children) as HTMLElement[]
    const columns: UnlayerColumn[] = []

    for (const cell of cells) {
      const column = this.convertCellToColumn(cell)
      columns.push(column)
    }

    const rowStyles = this.parseInlineStyles(tr.getAttribute("style") || "")

    return {
      id: `row-${++this.rowCounter}`,
      cells: [columns.length], // Unlayer format for column distribution
      columns,
      values: {
        backgroundColor: rowStyles.backgroundColor,
        padding: rowStyles.padding || "10px",
        columnsBackgroundColor: rowStyles.backgroundColor,
      },
    }
  }

  private convertBlockElementToRow(element: HTMLElement): UnlayerRow {
    const column = this.convertElementToColumn(element)
    const styles = this.parseInlineStyles(element.getAttribute("style") || "")

    return {
      id: `row-${++this.rowCounter}`,
      cells: [1],
      columns: [column],
      values: {
        backgroundColor: styles.backgroundColor,
        padding: styles.padding || "10px",
        columnsBackgroundColor: styles.backgroundColor,
      },
    }
  }

  private convertCellToColumn(cell: HTMLElement): UnlayerColumn {
    const contents: UnlayerContent[] = []
    const children = Array.from(cell.children) as HTMLElement[]

    if (children.length === 0) {
      // Cell has only text content
      const textContent = cell.textContent?.trim()
      if (textContent) {
        contents.push(this.createTextContent(cell.innerHTML, cell))
      }
    } else {
      // Process child elements
      for (const child of children) {
        const content = this.convertElementToContent(child)
        if (content) {
          contents.push(content)
        }
      }
    }

    return {
      id: `column-${++this.columnCounter}`,
      contents,
    }
  }

  private convertElementToColumn(element: HTMLElement): UnlayerColumn {
    const contents: UnlayerContent[] = []
    const children = Array.from(element.children) as HTMLElement[]

    if (children.length === 0) {
      // Element has only text content
      const textContent = element.textContent?.trim()
      if (textContent) {
        contents.push(this.createTextContent(element.innerHTML, element))
      }
    } else {
      // Process child elements
      for (const child of children) {
        const content = this.convertElementToContent(child)
        if (content) {
          contents.push(content)
        }
      }
    }

    return {
      id: `column-${++this.columnCounter}`,
      contents,
    }
  }

  private convertElementToContent(element: HTMLElement): UnlayerContent | null {
    const tagName = element.tagName.toLowerCase()
    const styles = this.parseInlineStyles(element.getAttribute("style") || "")

    switch (tagName) {
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        return this.createTextContent(element.innerHTML, element, true)

      case "p":
      case "div":
        // Check if it's a button-like div
        if (this.isButtonLike(element)) {
          return this.createButtonContent(element)
        }
        return this.createTextContent(element.innerHTML, element)

      case "a":
        // Check if it's styled as a button
        if (this.isButtonLike(element)) {
          return this.createButtonContent(element)
        }
        return this.createTextContent(element.outerHTML, element)

      case "img":
        return this.createImageContent(element)

      case "hr":
        return this.createDividerContent(element)

      case "table":
        // Handle nested tables (common in email templates)
        if (this.isButtonTable(element)) {
          return this.createButtonFromTable(element)
        }
        return this.createHtmlContent(element.outerHTML)

      default:
        // For any other element, preserve as HTML
        return this.createHtmlContent(element.outerHTML)
    }
  }

  private createTextContent(html: string, element: HTMLElement, isHeading = false): UnlayerContent {
    const styles = this.parseInlineStyles(element.getAttribute("style") || "")
    const variables = this.extractVariablesFromText(html)

    return {
      id: `text-${++this.contentCounter}`,
      type: "text",
      values: {
        text: html,
        fontSize: styles.fontSize || (isHeading ? "24px" : "16px"),
        fontWeight: styles.fontWeight || (isHeading ? "bold" : "normal"),
        color: styles.color || "#1f2937",
        textAlign: styles.textAlign || "left",
        lineHeight: styles.lineHeight || "1.5",
        containerPadding: styles.padding || "10px",
        variables: variables,
      },
    }
  }

  private createButtonContent(element: HTMLElement): UnlayerContent {
    const styles = this.parseInlineStyles(element.getAttribute("style") || "")
    const href = element.getAttribute("href") || "#"
    const text = element.textContent?.trim() || "Button"

    return {
      id: `button-${++this.contentCounter}`,
      type: "button",
      values: {
        href,
        text,
        backgroundColor: styles.backgroundColor || "#3b82f6",
        color: styles.color || "#ffffff",
        fontSize: styles.fontSize || "16px",
        fontWeight: styles.fontWeight || "normal",
        textAlign: "center",
        borderRadius: styles.borderRadius || "6px",
        containerPadding: "20px",
        buttonPadding: styles.padding || "12px 24px",
      },
    }
  }

  private createImageContent(element: HTMLElement): UnlayerContent {
    const src = element.getAttribute("src") || "/placeholder.svg?height=200&width=400"
    const alt = element.getAttribute("alt") || ""
    const styles = this.parseInlineStyles(element.getAttribute("style") || "")

    return {
      id: `image-${++this.contentCounter}`,
      type: "image",
      values: {
        src: { url: src },
        alt,
        width: styles.width || "auto",
        height: styles.height || "auto",
        textAlign: "center",
        containerPadding: styles.padding || "10px",
      },
    }
  }

  private createDividerContent(element: HTMLElement): UnlayerContent {
    const styles = this.parseInlineStyles(element.getAttribute("style") || "")

    return {
      id: `divider-${++this.contentCounter}`,
      type: "divider",
      values: {
        border: styles.border || "1px solid #e5e7eb",
        width: "100%",
        containerPadding: "20px 10px",
      },
    }
  }

  private createButtonFromTable(table: HTMLElement): UnlayerContent {
    const link = table.querySelector("a")
    if (link) {
      return this.createButtonContent(link)
    }

    // Fallback to HTML content
    return this.createHtmlContent(table.outerHTML)
  }

  private createHtmlContent(html: string): UnlayerContent {
    return {
      id: `html-${++this.contentCounter}`,
      type: "html",
      values: {
        html,
        containerPadding: "10px",
      },
    }
  }

  private createHtmlRow(html: string): UnlayerRow {
    return {
      id: `row-${++this.rowCounter}`,
      cells: [1],
      columns: [
        {
          id: `column-${++this.columnCounter}`,
          contents: [this.createHtmlContent(html)],
        },
      ],
      values: {
        padding: "10px",
      },
    }
  }

  private isBlockElement(element: HTMLElement): boolean {
    const blockElements = ["div", "p", "h1", "h2", "h3", "h4", "h5", "h6", "table", "section", "article"]
    return blockElements.includes(element.tagName.toLowerCase())
  }

  private isButtonLike(element: HTMLElement): boolean {
    const styles = this.parseInlineStyles(element.getAttribute("style") || "")
    const hasButtonStyles =
      styles.backgroundColor && styles.padding && (styles.display === "inline-block" || styles.display === "block")

    const hasButtonClass = element.className.toLowerCase().includes("button")
    const isLink = element.tagName.toLowerCase() === "a"

    return hasButtonStyles || (hasButtonClass && isLink)
  }

  private isButtonTable(table: HTMLElement): boolean {
    // Check if table contains a single link that looks like a button
    const links = table.querySelectorAll("a")
    if (links.length === 1) {
      const link = links[0] as HTMLElement
      return this.isButtonLike(link)
    }
    return false
  }

  private extractVariablesFromText(text: string): string[] {
    const variableRegex = /\{\{([^}]+)\}\}/g
    const variables: string[] = []
    let match

    while ((match = variableRegex.exec(text)) !== null) {
      const variable = match[1].trim()
      if (!variables.includes(variable)) {
        variables.push(variable)
      }
    }

    return variables
  }

  private parseInlineStyles(styleStr: string): Record<string, string> {
    const styles: Record<string, string> = {}
    if (!styleStr) return styles

    styleStr.split(";").forEach((rule) => {
      const [property, value] = rule.split(":").map((s) => s.trim())
      if (property && value) {
        // Convert kebab-case to camelCase
        const camelProperty = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
        styles[camelProperty] = value
      }
    })

    return styles
  }
}

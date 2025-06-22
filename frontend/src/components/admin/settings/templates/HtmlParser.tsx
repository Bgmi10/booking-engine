// HTML Parser utility to convert existing HTML to blocks
import type { EmailBlock } from "./types"

export const parseHtmlToBlocks = (html: string): EmailBlock[] => {
  const blocks: EmailBlock[] = []

  // Create a temporary DOM element to parse HTML
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")

  // Extract meaningful content blocks from the HTML
  const extractBlocks = (element: Element, parentId = "") => {
    const children = Array.from(element.children)

    children.forEach((child, index) => {
      const tagName = child.tagName.toLowerCase()
      const id = `${parentId}-${tagName}-${index}`

      // Extract styles from inline style attribute
      const styleAttr = child.getAttribute("style") || ""
      const styles = parseInlineStyles(styleAttr)

      switch (tagName) {
        case "h1":
        case "h2":
        case "h3":
          blocks.push({
            id,
            type: "header",
            content: {
              text: child.textContent || "",
              alignment: getAlignment(styles.textAlign),
              variables: extractVariables(child.textContent || ""),
            },
            styles: {
              fontSize: styles.fontSize || "24px",
              fontWeight: styles.fontWeight || "bold",
              color: styles.color || "#1f2937",
              textAlign: styles.textAlign || "left",
              padding: styles.padding || "16px",
              backgroundColor: styles.backgroundColor,
              margin: styles.margin || "0px",
            },
          })
          break

        case "p":
        case "div":
          if (child.textContent && child.textContent.trim()) {
            // Check if this div has special styling that makes it look like a button or header
            const hasButtonStyling = styles.display === "inline-block" && styles.padding && styles.backgroundColor
            const hasHeaderStyling =
              styles.fontSize && (Number.parseInt(styles.fontSize) > 18 || styles.fontWeight === "bold")

            let blockType: "text" | "header" | "button" = "text"

            if (hasButtonStyling) {
              blockType = "button"
            } else if (hasHeaderStyling) {
              blockType = "header"
            }

            if (blockType === "button") {
              blocks.push({
                id,
                type: "button",
                content: {
                  buttonText: child.textContent,
                  buttonUrl: "#",
                  alignment: getAlignment(styles.textAlign),
                  variables: extractVariables(child.textContent),
                },
                styles: {
                  backgroundColor: styles.backgroundColor || "#3b82f6",
                  color: styles.color || "#ffffff",
                  textAlign: styles.textAlign || "center",
                  borderRadius: styles.borderRadius || "6px",
                  padding: styles.padding || "12px 24px",
                  fontSize: styles.fontSize || "16px",
                  fontWeight: styles.fontWeight || "normal",
                  margin: styles.margin || "0px",
                },
              })
            } else {
              blocks.push({
                id,
                type: blockType,
                content: {
                  text: child.textContent,
                  alignment: getAlignment(styles.textAlign),
                  variables: extractVariables(child.textContent),
                },
                styles: {
                  fontSize: styles.fontSize || (blockType === "header" ? "24px" : "16px"),
                  fontWeight: styles.fontWeight || (blockType === "header" ? "bold" : "normal"),
                  color: styles.color || "#374151",
                  textAlign: styles.textAlign || "left",
                  padding: styles.padding || "16px",
                  backgroundColor: styles.backgroundColor,
                  margin: styles.margin || "0px",
                },
              })
            }
          }
          break

        case "a":
          const isButton = styles.display === "inline-block" || styles.padding
          if (isButton) {
            blocks.push({
              id,
              type: "button",
              content: {
                buttonText: child.textContent || "Button",
                buttonUrl: child.getAttribute("href") || "#",
                alignment: "center",
                variables: extractVariables(child.textContent || ""),
              },
              styles: {
                backgroundColor: styles.backgroundColor || "#3b82f6",
                color: styles.color || "#ffffff",
                textAlign: "center",
                borderRadius: styles.borderRadius || "6px",
                padding: styles.padding || "12px 24px",
                fontSize: styles.fontSize || "16px",
                fontWeight: styles.fontWeight || "normal",
                margin: styles.margin || "0px",
              },
            })
          }
          break

        case "img":
          blocks.push({
            id,
            type: "image",
            content: {
              url: child.getAttribute("src") || "",
              alt: child.getAttribute("alt") || "",
              alignment: "center",
              variables: [],
            },
            styles: {
              textAlign: "center",
              padding: styles.padding || "16px",
              margin: styles.margin || "0px",
            },
          })
          break

        case "hr":
          blocks.push({
            id,
            type: "divider",
            content: { variables: [] },
            styles: {
              border: styles.border || "1px solid #e5e7eb",
              margin: styles.margin || "20px 0",
            },
          })
          break

        default:
          // Recursively process child elements
          if (child.children.length > 0) {
            extractBlocks(child, id)
          }
          break
      }
    })
  }

  extractBlocks(doc.body)
  return blocks
}

const parseInlineStyles = (styleStr: string): Record<string, string> => {
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

const getAlignment = (textAlign?: string): "left" | "center" | "right" => {
  if (textAlign === "center") return "center"
  if (textAlign === "right") return "right"
  return "left"
}

const extractVariables = (text: string): string[] => {
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

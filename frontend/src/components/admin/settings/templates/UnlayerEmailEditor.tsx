"use client"

import type React from "react"
import { useEffect, useRef, forwardRef, useImperativeHandle } from "react"

interface UnlayerEmailEditorProps {
  onReady: () => void
  options: any
  style: React.CSSProperties
}

export const UnlayerEmailEditor = forwardRef<any, UnlayerEmailEditorProps>(({ onReady, options, style }, ref) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const unlayerRef = useRef<any>(null)
  const initializedRef = useRef(false)

  useImperativeHandle(ref, () => ({
    editor: unlayerRef.current,
    loadDesign: (design: any) => {
      if (unlayerRef.current && typeof unlayerRef.current.loadDesign === 'function') {
        unlayerRef.current.loadDesign(design)
      }
    },
  }))

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const initializeEditor = async () => {
      if (!editorRef.current) return

      try {
        // Wait for Unlayer to be available
        const unlayer = (window as any).unlayer
        if (!unlayer) {
          console.error("Unlayer is not loaded.")
          return
        }

        console.log("Initializing Unlayer editor...")

        // Initialize with the provided options (only once)
        unlayer.init({
          id: "email-editor",
          displayMode: "email",
          appearance: {
            theme: "light",
            panels: {
              tools: {
                dock: "left",
              },
            },
          },
          locale: "en-US",
          features: {
            preview: true,
            imageEditor: true,
            stockImages: false, // Disable to avoid needing additional API setup
            undoRedo: true,
            textEditor: {
              spellChecker: true,
              cleanPaste: true,
            },
          },
          tools: {
            image: {
              enabled: true,
              properties: {
                src: {
                  value: {
                    url: "/placeholder.svg?height=200&width=400",
                  },
                },
              },
            },
            button: {
              enabled: true,
              properties: {
                backgroundColor: {
                  value: "#3b82f6",
                },
                color: {
                  value: "#ffffff",
                },
              },
            },
            text: {
              enabled: true,
              properties: {
                text: {
                  value: "Enter your text here. You can use variables like {{customerName}}.",
                },
              },
            },
            divider: { enabled: true },
            spacer: { enabled: true },
            html: { enabled: true },
            social: { enabled: true },
          },
          mergeTags: options.mergeTags || [],
          ...options,
        })

        // Store reference to unlayer
        unlayerRef.current = unlayer

        console.log("Unlayer editor initialized successfully")

        // Trigger the onReady callback
        onReady()
      } catch (error) {
        console.error("Failed to initialize Unlayer:", error)
      }
    }

    // Load Unlayer script if not already loaded
    if ((window as any).unlayer) {
      initializeEditor()
    } else {
      const script = document.createElement("script")
      script.src = "https://editor.unlayer.com/embed.js"
      script.async = true
      script.onload = () => {
        console.log("Unlayer script loaded")
        // Small delay to ensure Unlayer is fully initialized
        setTimeout(initializeEditor, 100)
      }
      script.onerror = () => {
        console.error("Failed to load Unlayer script")
      }
      document.head.appendChild(script)

      return () => {
        if (document.head.contains(script)) {
          document.head.removeChild(script)
        }
      }
    }

    return () => {
      // Cleanup
      if (unlayerRef.current) {
        try {
          unlayerRef.current.destroy?.()
        } catch (e) {
          console.warn("Error destroying Unlayer:", e)
        }
      }
    }
  // Only run once on mount
  }, [])

  return <div ref={editorRef} id="email-editor" className="unlayer-editor" style={style} />
})

UnlayerEmailEditor.displayName = "UnlayerEmailEditor"

import type React from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import { RiSave3Line, RiArrowLeftLine, RiEyeLine, RiCodeLine, RiDownloadLine, RiMagicLine, RiCheckLine } from "react-icons/ri"
import type { Variable, Template } from "./types"
import { UnlayerEmailEditor } from "./UnlayerEmailEditor"
import { HtmlToUnlayerConverter } from "./HtmlConvertToUnlayer"

interface VisualEmailEditorProps {
  initialData?: Template
  onSave: (template: Partial<Template>) => Promise<Template>
  variables: Record<string, Variable>
  onBack: () => void
}

export const VisualEmailEditor: React.FC<VisualEmailEditorProps> = ({
  initialData,
  onSave,
  variables: propVariables,
  onBack,
}) => {
  const emailEditorRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditorReady, setIsEditorReady] = useState(false)
  const [conversionSuccess, setConversionSuccess] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  // Track the current template data
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(initialData || null)

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    subject: initialData?.subject || "",
    type: initialData?.type || "BOOKING_CONFIRMATION",
  })

  const [templateVariables] = useState<Record<string, Variable>>(propVariables || {})

  // Clear save success message after 3 seconds
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => {
        setSaveSuccess(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [saveSuccess])

  // Smart HTML to Unlayer conversion
  const convertHtmlToUnlayerDesign = useCallback(
    (html: string) => {
      try {
        setIsConverting(true)
        const converter = new HtmlToUnlayerConverter(templateVariables)
        const design = converter.convertHtmlToUnlayerDesign(html)
        setConversionSuccess(true)
        return design
      } catch (error) {
        console.error("Conversion error:", error)
        // Fallback to simple HTML block
        return {
          body: {
            id: "body",
            rows: [
              {
                id: "row-1",
                cells: [1],
                columns: [
                  {
                    id: "column-1",
                    contents: [
                      {
                        id: "content-1",
                        type: "html",
                        values: {
                          html: html,
                          containerPadding: "10px",
                        },
                      },
                    ],
                  },
                ],
                values: {
                  backgroundColor: "#ffffff",
                  padding: "10px",
                },
              },
            ],
            values: {
              backgroundColor: "#f8fafc",
              fontFamily: {
                label: "Arial",
                value: "arial,helvetica,sans-serif",
              },
              textColor: "#1f2937",
              linkColor: "#3b82f6",
              contentWidth: "600px",
              contentAlign: "center",
            },
          },
        }
      } finally {
        setIsConverting(false)
      }
    },
    [templateVariables],
  )

  // Load the email editor
  useEffect(() => {
    let timeoutId: any

    const loadEditor = async () => {
      try {
        setIsLoading(true)
        setError(null)

        timeoutId = setTimeout(() => {
          setError("Editor loading timeout. Please refresh the page.")
          setIsLoading(false)
        }, 10000)

        clearTimeout(timeoutId)
        setIsLoading(false)
      } catch (err) {
        console.error("Failed to load email editor:", err)
        setError("Failed to load email editor. Please check your internet connection.")
        setIsLoading(false)
        clearTimeout(timeoutId)
      }
    }

    loadEditor()

    return () => {
      clearTimeout(timeoutId)
    }
  }, [])

  // Handle editor ready
  const onReady = useCallback(() => {
    console.log("Email editor is ready")
    setIsEditorReady(true)

    // Load initial design with smart conversion
    if (initialData?.design) {
      try {
        let parsedDesign: any = initialData.design;
        if (typeof initialData.design === 'string') {
          parsedDesign = JSON.parse(initialData.design);
        }
        console.log("Parsed design data:", parsedDesign)
        if (parsedDesign.unlayerData) {
          console.log("Loading from existing Unlayer JSON data")
          emailEditorRef.current?.loadDesign(parsedDesign.unlayerData)
        } else if (initialData?.html) {
          console.log("Converting HTML to user-friendly Unlayer blocks...")
          const design = convertHtmlToUnlayerDesign(initialData.html)
          emailEditorRef.current?.loadDesign(design)
        }
      } catch (parseError) {
        console.error("Failed to parse design data:", parseError)
        if (initialData?.html) {
          console.log("Fallback: Converting HTML to user-friendly Unlayer blocks...")
          const design = convertHtmlToUnlayerDesign(initialData.html)
          emailEditorRef.current?.loadDesign(design)
        }
      }
    } else if (initialData?.html) {
      console.log("Converting HTML to user-friendly Unlayer blocks...")
      const design = convertHtmlToUnlayerDesign(initialData.html)
      emailEditorRef.current?.loadDesign(design)
    } else {
      // Load a user-friendly starter template
      console.log("Loading starter template")
      const starterDesign = {
        body: {
          id: "body",
          rows: [
            {
              id: "header-row",
              cells: [1],
              columns: [
                {
                  id: "header-column",
                  contents: [
                    {
                      id: "logo-image",
                      type: "image",
                      values: {
                        src: { url: "/placeholder.svg?height=60&width=200" },
                        alt: "Company Logo",
                        width: "200px",
                        textAlign: "center",
                        containerPadding: "20px",
                      },
                    },
                  ],
                },
              ],
              values: {
                backgroundColor: "#ffffff",
                padding: "20px",
              },
            },
            {
              id: "hero-row",
              cells: [1],
              columns: [
                {
                  id: "hero-column",
                  contents: [
                    {
                      id: "hero-title",
                      type: "text",
                      values: {
                        text: "<h1>Welcome {{customerName}}!</h1>",
                        fontSize: "32px",
                        fontWeight: "bold",
                        color: "#ffffff",
                        textAlign: "center",
                        containerPadding: "40px 20px 20px 20px",
                      },
                    },
                    {
                      id: "hero-subtitle",
                      type: "text",
                      values: {
                        text: "<p>Your booking confirmation is ready</p>",
                        fontSize: "18px",
                        color: "#ffffff",
                        textAlign: "center",
                        containerPadding: "0px 20px 40px 20px",
                      },
                    },
                  ],
                },
              ],
              values: {
                backgroundColor: "#3b82f6",
                backgroundImage: {
                  url: "",
                  fullWidth: true,
                  repeat: false,
                  center: true,
                  cover: false,
                },
                padding: "0px",
              },
            },
            {
              id: "content-row",
              cells: [1],
              columns: [
                {
                  id: "content-column",
                  contents: [
                    {
                      id: "greeting-text",
                      type: "text",
                      values: {
                        text: "<p>Dear {{customerName}},</p><p>Thank you for your booking! Here are your details:</p>",
                        fontSize: "16px",
                        color: "#374151",
                        lineHeight: "1.6",
                        containerPadding: "30px",
                      },
                    },
                    {
                      id: "cta-button",
                      type: "button",
                      values: {
                        href: "#",
                        text: "View Booking Details",
                        backgroundColor: "#10b981",
                        color: "#ffffff",
                        fontSize: "16px",
                        fontWeight: "bold",
                        textAlign: "center",
                        borderRadius: "6px",
                        containerPadding: "20px",
                        buttonPadding: "15px 30px",
                      },
                    },
                  ],
                },
              ],
              values: {
                backgroundColor: "#ffffff",
                padding: "0px",
              },
            },
          ],
          values: {
            backgroundColor: "#f8fafc",
            fontFamily: {
              label: "Arial",
              value: "arial,helvetica,sans-serif",
            },
            textColor: "#374151",
            linkColor: "#3b82f6",
            contentWidth: "600px",
            contentAlign: "center",
          },
        },
      }
      emailEditorRef.current?.loadDesign(starterDesign)
    }
  }, [initialData, convertHtmlToUnlayerDesign])

  // Improved export function with better error handling
  const exportEditorContent = useCallback((): Promise<{ design: any; html: string }> => {
    return new Promise((resolve, reject) => {
      // Check if editor is ready
      if (!emailEditorRef.current?.editor || !isEditorReady) {
        reject(new Error("Editor not ready"))
        return
      }

      const editor = emailEditorRef.current.editor
      
      // Validate editor has the exportHtml method
      if (typeof editor.exportHtml !== 'function') {
        reject(new Error("Editor exportHtml method not available"))
        return
      }

      let timeoutId: any
      let callbackCalled = false

      // Set a timeout for the export operation
      timeoutId = setTimeout(() => {
        if (!callbackCalled) {
          callbackCalled = true
          reject(new Error("Export operation timed out"))
        }
      }, 15000) // Increased to 15 seconds

      try {
        // Call exportHtml with error handling
        editor.exportHtml((data: any) => {
          // Prevent multiple callback executions
          if (callbackCalled) return
          callbackCalled = true
          
          // Clear timeout since we got a response
          if (timeoutId) {
            clearTimeout(timeoutId)
          }
          
          // Validate response data
          if (!data) {
            reject(new Error("No data returned from editor"))
            return
          }

          if (!data.html) {
            reject(new Error("No HTML content generated"))
            return
          }

          resolve({
            design: data.design || {},
            html: data.html
          })
        }, (error: any) => {
          // Handle export error callback if Unlayer provides one
          if (!callbackCalled) {
            callbackCalled = true
            if (timeoutId) {
              clearTimeout(timeoutId)
            }
            console.error("Unlayer export error:", error)
            reject(new Error(`Export failed: ${error?.message || 'Unknown error'}`))
          }
        })
      } catch (error) {
        if (!callbackCalled) {
          callbackCalled = true
          if (timeoutId) {
            clearTimeout(timeoutId)
          }
          console.error("Export error:", error)
          reject(error)
        }
      }
    })
  }, [isEditorReady])

  // Alternative approach using retry logic
  const exportEditorContentWithRetry = useCallback(async (maxRetries = 3): Promise<{ design: any; html: string }> => {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Export attempt ${attempt}/${maxRetries}`)
        
        // Add a small delay between retries
        if (attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
        const result = await exportEditorContent()
        console.log(`Export successful on attempt ${attempt}`)
        return result
      } catch (error: any) {
        console.error(`Export attempt ${attempt} failed:`, error.message)
        lastError = error
        
        // Don't retry if it's a fundamental issue
        if (error.message.includes("Editor not ready") || 
            error.message.includes("exportHtml method not available")) {
          throw error
        }
      }
    }
    
    throw lastError || new Error("Export failed after multiple attempts")
  }, [exportEditorContent])

  // FIXED: Updated handleSave function to properly get current editor state
  const handleSave = async () => {
    console.log("=== SAVE OPERATION STARTED ===")
    
    // Reset states
    setIsSaving(true)
    setError(null)
    setSaveSuccess(false)

    try {
      // Validate required fields first
      if (!formData.name.trim()) {
        throw new Error("Please enter a template name.")
      }

      if (!formData.subject.trim()) {
        throw new Error("Please enter an email subject.")
      }

      if (!emailEditorRef.current?.editor || !isEditorReady) {
        throw new Error("Editor not ready. Please wait a moment and try again.")
      }

      console.log("Form validation passed, exporting content...")

      // CRITICAL FIX: Export the CURRENT state from the editor
      const exportData = await exportEditorContentWithRetry(3)
      console.log("Content exported successfully")

      const { design, html } = exportData

      // Validate exported content
      if (!html || html.trim().length === 0) {
        throw new Error("No content to save. Please add some content to your email template.")
      }

      // Create final HTML with proper email structure
      const finalHtml = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${formData.subject}</title>
    <!--[if mso]>
    <noscript>
      <xml>
        <o:OfficeDocumentSettings>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
    </noscript>
    <![endif]-->
  </head>
  <body style="margin: 0; padding: 0;">
    ${html}
  </body>
</html>`

      // FIXED: Prepare template data using the EXPORTED design, not the initial data
      const templateData = {
        // Include the template ID if we're editing an existing template
        ...(currentTemplate?.id && { id: currentTemplate.id }),
        // Use current form data
        name: formData.name,
        subject: formData.subject,
        type: formData.type,
        // Use the EXPORTED HTML from the current editor state
        html: finalHtml,
        // Use the provided variables
        variables: templateVariables,
        // Preserve existing properties
        isActive: currentTemplate?.isActive || false,
        version: (currentTemplate?.version || 0) + 1,
        // CRITICAL: Use the EXPORTED design from the current editor state
        design: {
          version: "2.0",
          unlayerData: design, // This is the current state from the editor
          blocks: [],
          body: {
            backgroundColor: design.body?.values?.backgroundColor || "#f8fafc",
            fontFamily: design.body?.values?.fontFamily?.value || "Arial, sans-serif",
            fontSize: "14px",
            lineHeight: "1.5",
            color: design.body?.values?.textColor || "#1f2937",
          },
        }
      }

      console.log("Template data prepared:", {
        name: templateData.name,
        subject: templateData.subject,
        type: templateData.type,
        hasHtml: !!templateData.html,
        hasDesign: !!templateData.design,
        designVersion: templateData.design?.version
      })
      
      // Make the API call through the onSave prop
      const savedTemplate = await onSave(templateData)
      
      // Update current template with the saved data
      setCurrentTemplate(savedTemplate)
      
      // FIXED: Update form data with the saved template data
      if (savedTemplate.name && savedTemplate.name !== formData.name) {
        setFormData(prev => ({ ...prev, name: savedTemplate.name }))
      }
      if (savedTemplate.subject && savedTemplate.subject !== formData.subject) {
        setFormData(prev => ({ ...prev, subject: savedTemplate.subject }))
      }
      if (savedTemplate.type && savedTemplate.type !== formData.type) {
        setFormData(prev => ({ ...prev, type: savedTemplate.type }))
      }

      // Show success message
      setSaveSuccess(true)
      console.log("=== SAVE OPERATION COMPLETED SUCCESSFULLY ===")

    } catch (err: any) {
      console.error("=== SAVE OPERATION FAILED ===")
      console.error("Error details:", {
        name: err.name,
        message: err.message,
        stack: err.stack,
        response: err.response?.data || err.response,
        status: err.response?.status
      })
      
      // Handle different types of errors with more specific messages
      let errorMessage = "Failed to save template. Please try again."
      
      if (err.message.includes("template name") || err.message.includes("email subject")) {
        errorMessage = err.message
      } else if (err.message.includes("Editor not ready")) {
        errorMessage = "Editor is still loading. Please wait a moment and try again."
      } else if (err.message.includes("Export operation timed out")) {
        errorMessage = "Export operation timed out. Please try refreshing the page and trying again."
      } else if (err.message.includes("No data returned") || err.message.includes("No HTML content")) {
        errorMessage = "Failed to export email content. Please check your design and try again."
      } else if (err.message.includes("No content to save")) {
        errorMessage = err.message
      } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = "Network error: Please check your internet connection and try again."
      } else if (err.response) {
        switch (err.response.status) {
          case 401:
            errorMessage = "Authentication error: Please log in again."
            break
          case 403:
            errorMessage = "Permission denied: You don't have permission to save this template."
            break
          case 400:
            errorMessage = `Bad request: ${err.response.data?.message || 'Invalid data provided'}`
            break
          case 422:
            errorMessage = `Validation error: ${err.response.data?.message || 'Please check your input'}`
            break
          case 500:
          case 502:
          case 503:
          case 504:
            errorMessage = "Server error: Please try again later."
            break
          default:
            errorMessage = `Server error (${err.response.status}): ${err.response.data?.message || 'Please try again'}`
        }
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePreview = async () => {
    try {
      setError(null)
      const { html } = await exportEditorContent()
      
      const previewWindow = window.open("", "_blank")
      if (previewWindow) {
        previewWindow.document.write(`
          <html>
            <head>
              <title>Email Preview</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 20px; background-color: #f8fafc;">
              ${html}
            </body>
          </html>
        `)
        previewWindow.document.close()
      } else {
        setError("Could not open preview window. Please check your popup blocker settings.")
      }
    } catch (err: any) {
      console.error("Preview error:", err)
      setError(`Failed to generate preview: ${err.message}`)
    }
  }

  const handleViewCode = async () => {
    try {
      setError(null)
      const { html } = await exportEditorContent()
      
      const finalHtml = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${formData.subject}</title>
</head>
<body style="margin: 0; padding: 0;">
${html}
</body>
</html>`

      const codeWindow = window.open("", "_blank")
      if (codeWindow) {
        codeWindow.document.write(`
          <html>
            <head><title>Template Code</title></head>
            <body style="font-family: monospace; padding: 20px;">
              <h2>Email HTML Code</h2>
              <textarea style="width: 100%; height: 80vh; font-family: monospace; font-size: 12px;" readonly>${finalHtml}</textarea>
            </body>
          </html>
        `)
        codeWindow.document.close()
      } else {
        setError("Could not open code window. Please check your popup blocker settings.")
      }
    } catch (err: any) {
      console.error("View code error:", err)
      setError(`Failed to generate code view: ${err.message}`)
    }
  }

  const handleExport = async () => {
    try {
      setError(null)
      const { html } = await exportEditorContent()
      
      const finalHtml = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${formData.subject}</title>
</head>
<body style="margin: 0; padding: 0;">
${html}
</body>
</html>`

      const blob = new Blob([finalHtml], { type: "text/html" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${formData.name || "email-template"}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error("Export error:", err)
      setError(`Failed to export template: ${err.message}`)
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Unlayer Email Editor...</p>
          <p className="text-xs text-gray-500 mt-2">Preparing user-friendly interface...</p>
        </div>
      </div>
    )
  }

  if (error && !isEditorReady) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4 text-4xl">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Editor Loading Failed</h2>
          <p className="text-red-600 mb-4 text-sm">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mr-2"
            >
              Retry
            </button>
            <button onClick={onBack} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <RiArrowLeftLine className="w-4 h-4 mr-2" />
              Back
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {currentTemplate ? "Edit Template" : "Create Template"}
              </h1>
              <p className="text-sm text-gray-500">
                {conversionSuccess ? "✨ HTML converted to user-friendly blocks" : "Drag & drop email editor"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Template name"
                required
              />
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Email subject"
                required
              />
            </div>

            <button
              onClick={handlePreview}
              disabled={!isEditorReady}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <RiEyeLine className="w-4 h-4 mr-2" />
              Preview
            </button>

            <button
              onClick={handleViewCode}
              disabled={!isEditorReady}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <RiCodeLine className="w-4 h-4 mr-2" />
              Code
            </button>

            <button
              onClick={handleExport}
              disabled={!isEditorReady}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <RiDownloadLine className="w-4 h-4 mr-2" />
              Export
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving || !isEditorReady}
              className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                isSaving || !isEditorReady ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <RiSave3Line className="w-4 h-4 mr-2" />
                  Save Template
                </>
              )}
            </button>
          </div>
        </div>

        {/* Success Message */}
        {saveSuccess && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center">
              <RiCheckLine className="w-4 h-4 text-green-600 mr-2" />
              <p className="text-sm text-green-700">
                <strong>Template saved successfully!</strong> Your changes have been saved and are ready to use.
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Conversion Success Message */}
        {conversionSuccess && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center">
              <RiMagicLine className="w-4 h-4 text-green-600 mr-2" />
              <p className="text-sm text-green-700">
                <strong>Smart Conversion Complete!</strong> Your HTML template has been converted into user-friendly
                drag & drop blocks. Non-technical users can now easily edit text, buttons, images, and colors without
                touching code.
              </p>
            </div>
          </div>
        )}

        {/* Variables Info */}
        {Object.keys(templateVariables).length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700 font-medium mb-2">Available Variables (drag into text blocks):</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(templateVariables).map(([name, variable]) => (
                <code
                  key={name}
                  className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded cursor-pointer hover:bg-blue-200"
                  title={`Click to copy {{${name}}}`}
                >
                  {`{{${name}}}`} ({variable.type})
                </code>
              ))}
            </div>
          </div>
        )}

        {/* Loading States */}
        {isConverting && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
              <p className="text-sm text-yellow-700">Converting HTML to user-friendly blocks...</p>
            </div>
          </div>
        )}

        {!isEditorReady && !isConverting && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-700">Editor is loading... Please wait before using the buttons above.</p>
          </div>
        )}
      </div>

      {/* Unlayer Email Editor */}
      <div className="flex-1">
        {!isLoading && (
          <UnlayerEmailEditor
            ref={emailEditorRef}
            onReady={onReady}
            options={{
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
                stockImages: false,
                undoRedo: true,
                textEditor: {
                  spellChecker: true,
                  cleanPaste: true,
                },
              },
              mergeTags: Object.keys(templateVariables).map((key) => ({
                name: key,
                value: `{{${key}}}`,
                sample: templateVariables[key].example || `Sample ${key}`,
              })),
            }}
            style={{ height: "100%" }}
          />
        )}
      </div>
    </div>
  )
}

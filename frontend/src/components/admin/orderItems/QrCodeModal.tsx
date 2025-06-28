import { RiCloseLine, RiDownloadLine, RiPrinterLine } from "react-icons/ri"
import { QRCodeSVG } from "qrcode.react"
import { useRef } from "react"

interface Category {
  id: string
  name: string
  description: string
  imageUrl: string
  isAvailable: boolean
  createdAt: string
  updatedAt: string
}

interface Location {
  id: string
  name: string
  orderCategories: Category[]
  createdAt: string
  updatedAt: string
}

interface QrCodeModalProps {
  isOpen: boolean
  onClose: () => void
  location: Location | null
}

export default function QrCodeModal({ 
  isOpen, 
  onClose, 
  location 
}: QrCodeModalProps) {
  const qrRef = useRef<HTMLDivElement>(null)
  
  if (!isOpen || !location) return null

  // Generate the URL for the QR code
  const frontendBaseUrl = window.location.origin
  const qrCodeUrl = `${frontendBaseUrl}/customers/order-items?location=${encodeURIComponent(location.name)}`

  const downloadQRCode = () => {
    if (qrRef.current) {
      const svg = qrRef.current.querySelector('svg')
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg)
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const img = new Image()
        
        canvas.width = 300
        canvas.height = 300
        
        img.onload = () => {
          if (ctx) {
            ctx.fillStyle = 'white'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(img, 0, 0, 300, 300)
            
            const link = document.createElement('a')
            link.download = `qr-code-${location.name}.png`
            link.href = canvas.toDataURL('image/png')
            link.click()
          }
        }
        
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
      }
    }
  }

  const printQRCode = () => {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      // Create a temporary div to render the QR code
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = `
        <div style="display: none;">
          <svg id="qr-svg" width="400" height="400" viewBox="0 0 400 400">
            ${qrRef.current?.querySelector('svg')?.innerHTML || ''}
          </svg>
        </div>
      `
      document.body.appendChild(tempDiv)
      
      const svgElement = tempDiv.querySelector('#qr-svg')
      const svgData = svgElement ? new XMLSerializer().serializeToString(svgElement) : ''
      
      // Remove temporary div
      document.body.removeChild(tempDiv)
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>QR Code - ${location.name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 40px;
              margin: 0;
              background: white;
            }
            .qr-container {
              display: inline-block;
              padding: 40px;
              border: 2px solid #000;
              border-radius: 12px;
              background: white;
              max-width: 500px;
            }
            .location-name {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 20px;
              color: #000;
              text-transform: uppercase;
            }
            .qr-code {
              margin: 20px 0;
              display: flex;
              justify-content: center;
            }
            .qr-code svg {
              width: 400px;
              height: 400px;
            }
            .qr-url {
              font-size: 12px;
              color: #666;
              margin-top: 20px;
              word-break: break-all;
              max-width: 400px;
              line-height: 1.4;
            }
            .instructions {
              font-size: 14px;
              color: #333;
              margin-top: 15px;
              font-style: italic;
            }
            @media print {
              body { 
                margin: 0; 
                padding: 20px;
              }
              .qr-container { 
                border: 2px solid #000; 
                page-break-inside: avoid;
                box-shadow: none;
              }
              .location-name {
                font-size: 28px;
              }
              .qr-code svg {
                width: 400px;
                height: 400px;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="location-name">${location.name}</div>
            <div class="qr-code">
              ${svgData}
            </div>
            <div class="instructions">Scan this QR code to view order items for this location</div>
            <div class="qr-url">${qrCodeUrl}</div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 200);
            };
          </script>
        </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex justify-between items-center border-b p-4">
          <h3 className="text-xl font-semibold text-gray-900">QR Code for {location.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <RiCloseLine size={24} />
          </button>
        </div>
        
        <div className="p-6">
          <div className="text-center">
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Scan this QR code to access order items for this location
              </p>
              <p className="text-xs text-gray-500 break-all">
                {qrCodeUrl}
              </p>
            </div>
            
            <div className="flex justify-center mb-4" ref={qrRef}>
              <div className="bg-white p-4 border border-gray-200 rounded-lg">
                <QRCodeSVG
                  value={qrCodeUrl}
                  size={200}
                  level="M"
                  includeMargin={true}
                />
              </div>
            </div>
            
            <div className="flex justify-center space-x-3">
              <button
                onClick={downloadQRCode}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              >
                <RiDownloadLine className="mr-2 h-4 w-4" />
                Download
              </button>
              <button
                onClick={printQRCode}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
              >
                <RiPrinterLine className="mr-2 h-4 w-4" />
                Print
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-3 rounded-b-lg">
          <button
            type="button"
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
} 
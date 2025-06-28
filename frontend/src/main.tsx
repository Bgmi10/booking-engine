import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { CustomerProvider } from './context/CustomerContext.tsx'
import { Toaster } from 'react-hot-toast'

createRoot(document.getElementById('root')!).render(
    <AuthProvider>    
        <CustomerProvider>
            <App />
            <Toaster position="bottom-right" />
        </CustomerProvider>
    </AuthProvider>
)

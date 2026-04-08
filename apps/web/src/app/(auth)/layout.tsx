import { Toaster } from 'react-hot-toast'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="top-center" toastOptions={{
        style: { background: '#1f2937', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
      }} />
    </>
  )
}

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Apply from './pages/Apply'
import Results from './pages/Results'
import Admin from './pages/Admin'
import Review from './pages/Review'

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ margin:0, padding:0, background:'#1a1d23', minHeight:'100vh', width:'100%' }}>
        <Routes>
          <Route path="/admin" element={<Admin />} />
          <Route path="/apply/:token" element={<Apply />} />
          <Route path="/results/:token" element={<Results />} />
          <Route path="/review/:token" element={<Review />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
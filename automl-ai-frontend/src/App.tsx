// src/App.tsx
import { useState, useRef, useEffect } from "react"
import { BrowserRouter } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useWindowSize } from "react-use"

import Header from "./components/Header"
import Footer from "./components/Footer"
import HomePage from "./components/HomePage"
import PipelineNavigator from "./components/PipelineNavigator"
import ChatAssistant from "./components/ChatAssistant"

export default function App() {
  const [showNav, setShowNav] = useState(false)
  const { width } = useWindowSize()
  const isMobile = width < 768

  // Refs to the two flipping faces
  const homeRef = useRef<HTMLDivElement>(null)
  const navRef  = useRef<HTMLDivElement>(null)

  // Fix wheel‐scroll inside each face
  useEffect(() => {
    const cleanupFns: (() => void)[] = []
    ;[homeRef.current, navRef.current].forEach((el) => {
      if (!el) return
      const onWheel = (e: WheelEvent) => {
        e.preventDefault()
        el.scrollTop += e.deltaY
      }
      el.addEventListener("wheel", onWheel, { passive: false })
      cleanupFns.push(() => el.removeEventListener("wheel", onWheel))
    })
    return () => {
      cleanupFns.forEach((fn) => fn())
    }
  }, [])

  // 3D flip variants
  const variants = {
    home: { rotateY: 0 },
    nav:  { rotateY: 180 },
  }

  return (
    <BrowserRouter>
      <div className="relative flex flex-col bg-black text-white h-screen">
        {/* fixed header */}
        <Header onLogoClick={() => setShowNav(false)} />

        {/* content area */}
        <div className="flex-1 pt-16 pb-10">
          {!isMobile ? (
            // DESKTOP: 3D flip
            <div className="w-full h-full perspective-1000">
              <motion.div
                initial={false}
                animate={showNav ? "nav" : "home"}
                variants={variants}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                style={{
                  width: "100%",
                  height: "100%",
                  transformStyle: "preserve-3d",
                  position: "relative",
                }}
              >
                {/* HOME SIDE */}
                <div
                  ref={homeRef}
                  className="absolute inset-0 overflow-auto bg-black"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <HomePage onEnter={() => setShowNav(true)} />
                </div>

                {/* NAVIGATOR SIDE */}
                <div
                  ref={navRef}
                  className="absolute inset-0 overflow-auto bg-black"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  <PipelineNavigator />
                </div>
              </motion.div>
            </div>
          ) : (
            // MOBILE: slide panels
            <AnimatePresence initial={false}>
              {showNav ? (
                <motion.div
                  key="nav"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full overflow-auto bg-black"
                  ref={navRef}
                >
                  <PipelineNavigator />
                </motion.div>
              ) : (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full overflow-auto bg-black"
                  ref={homeRef}
                >
                  <HomePage onEnter={() => setShowNav(true)} />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        <Footer />
        <ChatAssistant />
      </div>
    </BrowserRouter>
  )
}

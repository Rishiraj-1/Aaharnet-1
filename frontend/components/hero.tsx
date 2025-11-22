"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Hero3DScene } from "./3d-hero-scene"
import { ThemeToggle } from "./theme-toggle"
import { useAuth } from "@/context/AuthContext"
import { LogOut, User } from "lucide-react"

export function Hero() {
  const { user, signOut } = useAuth()
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8 },
    },
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden">
      <Hero3DScene />

      <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
        {user ? (
          <>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <User className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </>
        ) : (
          <>
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm">
                Sign Up
              </Button>
            </Link>
          </>
        )}
        <ThemeToggle />
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="text-center max-w-4xl">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-balance mb-6">
            <span className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 dark:from-primary dark:via-primary-light dark:to-accent bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)] dark:drop-shadow-none">
              Connecting Food
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              with AAHARNET.AI
            </span>
          </h1>
        </motion.div>

        <motion.div variants={itemVariants} className="text-center max-w-2xl">
          <p className="text-lg sm:text-xl text-muted-foreground mb-8">
            AAHARNET.AI bridges the gap between food donors and communities in need. Reduce waste, fight hunger, and
            make a real impact with AI-powered food redistribution.
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/donor">
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              I'm a Donor
            </Button>
          </Link>
          <Link href="/ngo">
            <Button size="lg" variant="outline">
              I'm an NGO
            </Button>
          </Link>
          <Link href="/volunteer">
            <Button size="lg" variant="outline">
              I'm a Volunteer
            </Button>
          </Link>
        </motion.div>

        <motion.div variants={itemVariants} className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-8 w-full max-w-3xl">
          {[
            { label: "Donations", value: "12K+" },
            { label: "Food Saved", value: "45T" },
            { label: "Volunteers", value: "156" },
            { label: "Lives Helped", value: "8.9K" },
          ].map((stat, i) => (
            <motion.div key={i} className="text-center" whileHover={{ scale: 1.05 }}>
              <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
      >
        <div className="w-6 h-10 border-2 border-primary rounded-full flex items-start justify-center p-2">
          <motion.div
            className="w-1 h-2 bg-primary rounded-full"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          />
        </div>
      </motion.div>
    </div>
  )
}

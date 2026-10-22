import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Check,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  User,
  Shield,
  LogOut,
  Sparkles,
  Laptop,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useNotifications } from '../context/NotificationContext'

export default function Settings() {
  const { user, logout } = useAuth()
  const { theme, setTheme, isDark } = useTheme()
  const {
    permission,
    soundEnabled,
    requestPermission,
    toggleSound,
    playChime,
  } = useNotifications()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          to="/"
          className="btn-secondary p-2.5 flex items-center justify-center hover:scale-105 transition-transform"
          title="Back to Chat"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <SettingsIcon size={24} className="text-brand-400" /> Settings
          </h1>
          <p className="text-gray-500 text-sm">
            Customize appearance, notifications, and manage your account
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* ======================================================== */}
        {/* 1. THEME & APPEARANCE SECTION */}
        {/* ======================================================== */}
        <section className="glass-card p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-600/20 text-brand-400 border border-brand-500/30 flex items-center justify-center">
                <Sparkles size={18} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Theme & Appearance</h2>
                <p className="text-xs text-gray-500">
                  Select your preferred color theme for ChatApp
                </p>
              </div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20">
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
          </div>

          {/* Theme Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {/* Dark Theme Option */}
            <div
              id="theme-dark-btn"
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 border relative ${
                theme === 'dark'
                  ? 'bg-dark-500/80 border-brand-500 ring-2 ring-brand-500/30 shadow-lg shadow-brand-900/20'
                  : 'bg-dark-500/30 border-white/5 hover:border-white/20 hover:bg-dark-500/50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-dark-400 text-indigo-300 flex items-center justify-center">
                    <Moon size={16} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">Dark Theme</h3>
                    <p className="text-[11px] text-gray-400">Deep & Relaxing</p>
                  </div>
                </div>
                {theme === 'dark' && (
                  <div className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center">
                    <Check size={12} />
                  </div>
                )}
              </div>

              {/* Visual Preview Miniature */}
              <div className="p-2.5 rounded-xl bg-[#0d0e1a] border border-white/5 space-y-1.5 pointer-events-none">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-brand-600" />
                  <div className="h-2 w-16 bg-white/20 rounded" />
                </div>
                <div className="flex justify-end">
                  <div className="h-4 w-24 bg-brand-600 rounded-lg rounded-br-sm" />
                </div>
                <div className="flex justify-start">
                  <div className="h-4 w-20 bg-dark-400 rounded-lg rounded-bl-sm" />
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-3">
                Dark background with vibrant accents, easy on the eyes in low light.
              </p>
            </div>

            {/* Light Theme Option */}
            <div
              id="theme-light-btn"
              onClick={() => setTheme('light')}
              className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 border relative ${
                theme === 'light'
                  ? 'bg-dark-500/80 border-brand-500 ring-2 ring-brand-500/30 shadow-lg shadow-brand-900/20'
                  : 'bg-dark-500/30 border-white/5 hover:border-white/20 hover:bg-dark-500/50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Sun size={16} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">Light Theme</h3>
                    <p className="text-[11px] text-gray-400">Bright & Clean</p>
                  </div>
                </div>
                {theme === 'light' && (
                  <div className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center">
                    <Check size={12} />
                  </div>
                )}
              </div>

              {/* Visual Preview Miniature */}
              <div className="p-2.5 rounded-xl bg-[#f8fafc] border border-gray-200 space-y-1.5 pointer-events-none">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-brand-600" />
                  <div className="h-2 w-16 bg-gray-300 rounded" />
                </div>
                <div className="flex justify-end">
                  <div className="h-4 w-24 bg-brand-600 rounded-lg rounded-br-sm" />
                </div>
                <div className="flex justify-start">
                  <div className="h-4 w-20 bg-gray-200 rounded-lg rounded-bl-sm" />
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-3">
                Clean white and light slate interface with high contrast for daytime clarity.
              </p>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 2. NOTIFICATIONS & SOUNDS SECTION */}
        {/* ======================================================== */}
        <section className="glass-card p-6 border border-white/5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <BellRing size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Notifications & Audio</h2>
              <p className="text-xs text-gray-500">
                Control desktop push alerts and sound effects
              </p>
            </div>
          </div>

          <div className="divide-y divide-white/5">
            {/* Desktop Push Notifications */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-white text-sm flex items-center gap-2">
                  Desktop Push Notifications
                  {permission === 'granted' ? (
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
                      Not Enabled
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Receive browser notifications when friends send you messages
                </p>
              </div>
              <button
                id="btn-request-permission"
                onClick={requestPermission}
                className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 flex-shrink-0 ${
                  permission === 'granted'
                    ? 'btn-secondary text-emerald-400'
                    : 'btn-primary'
                }`}
              >
                {permission === 'granted' ? <Check size={14} /> : <Bell size={14} />}
                {permission === 'granted' ? 'Enabled' : 'Enable Push'}
              </button>
            </div>

            {/* Audio Chime */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-white text-sm flex items-center gap-2">
                  Notification Sound Chime
                  {soundEnabled ? (
                    <span className="text-[10px] bg-brand-500/15 text-brand-400 border border-brand-500/30 px-2 py-0.5 rounded-full font-medium">
                      On
                    </span>
                  ) : (
                    <span className="text-[10px] bg-gray-500/15 text-gray-400 border border-gray-500/30 px-2 py-0.5 rounded-full font-medium">
                      Muted
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Play a melodic synthesized chime when new messages arrive
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={playChime}
                  className="btn-secondary text-xs px-3 py-2 flex items-center gap-1"
                  title="Test Sound"
                >
                  <Volume2 size={13} /> Test
                </button>
                <button
                  id="btn-toggle-sound"
                  onClick={toggleSound}
                  className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                    soundEnabled ? 'btn-primary' : 'btn-secondary text-gray-400'
                  }`}
                >
                  {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  {soundEnabled ? 'Sound On' : 'Muted'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 3. ACCOUNT & PROFILE SECTION */}
        {/* ======================================================== */}
        <section className="glass-card p-6 border border-white/5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <User size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Account Details</h2>
              <p className="text-xs text-gray-500">Your profile and credentials</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-dark-500/40 border border-white/5">
            <div className="w-16 h-16 rounded-2xl avatar text-2xl shadow-xl shadow-brand-900/30 flex-shrink-0">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h3 className="text-lg font-bold text-white truncate">{user?.username}</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit mx-auto sm:mx-0">
                  Online
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">{user?.email}</p>
              <p className="text-xs text-gray-500 mt-0.5">User ID: #{user?.id}</p>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 4. LOGOUT & SESSION */}
        {/* ======================================================== */}
        <div className="flex justify-end gap-3 pt-2">
          <Link to="/" className="btn-secondary text-sm">
            Done
          </Link>
          <button
            onClick={handleLogout}
            className="btn-danger text-sm flex items-center gap-2"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

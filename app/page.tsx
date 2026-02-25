'use client'

import React, { useState, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  RiDashboardLine, RiHistoryLine, RiSettings3Line,
  RiAlarmWarningLine, RiShieldFlashLine, RiSoundModuleLine,
  RiAlertLine, RiCheckLine, RiCloseLine, RiRefreshLine,
  RiUserLine, RiTimeLine, RiMapPinLine, RiSlackLine,
  RiFileListLine, RiDownloadLine, RiAddLine, RiDeleteBinLine,
  RiEditLine, RiVolumeUpLine, RiSignalWifiLine, RiSearchLine
} from 'react-icons/ri'

// ============================================================
// TYPES
// ============================================================

interface Alert {
  id: string
  distress_type: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  zone: string
  timestamp: string
  confidence_score: number
  recommended_action: string
  alert_message: string
  slack_status: string
  status: 'New' | 'Acknowledged' | 'Resolved'
  responder?: string
  resolution_notes?: string
  response_time?: number
}

interface Zone {
  id: string
  name: string
  description: string
  active: boolean
  sensitivity: number
}

// ============================================================
// CONSTANTS
// ============================================================

const CLASSIFICATION_AGENT_ID = '699eb9968ea4061304f00c4e'
const SUMMARY_AGENT_ID = '699eb982fb412608ab72348a'

const REF_TIME = '2026-02-25T10:00:00.000Z'

function offsetTs(minutesAgo: number): string {
  const d = new Date(REF_TIME)
  d.setMinutes(d.getMinutes() - minutesAgo)
  return d.toISOString()
}

const SAMPLE_ALERTS: Alert[] = [
  {
    id: 'sa-1',
    distress_type: 'Medical Distress',
    severity: 'Critical',
    zone: 'ICU Ward',
    timestamp: offsetTs(5),
    confidence_score: 0.94,
    recommended_action: 'Immediate medical response required',
    alert_message: 'Medical distress detected in ICU Ward',
    slack_status: 'sent',
    status: 'New',
  },
  {
    id: 'sa-2',
    distress_type: 'Scream',
    severity: 'High',
    zone: 'Room 204',
    timestamp: offsetTs(15),
    confidence_score: 0.87,
    recommended_action: 'Send nearest available staff',
    alert_message: 'Scream detected in Room 204',
    slack_status: 'sent',
    status: 'Acknowledged',
    responder: 'Nurse Johnson',
  },
  {
    id: 'sa-3',
    distress_type: 'Glass Break',
    severity: 'Medium',
    zone: 'Hallway B',
    timestamp: offsetTs(45),
    confidence_score: 0.72,
    recommended_action: 'Investigate and secure area',
    alert_message: 'Glass breaking sound detected in Hallway B',
    slack_status: 'sent',
    status: 'Resolved',
    responder: 'Security Team',
    resolution_notes: 'Dropped equipment, area cleared',
    response_time: 3,
  },
  {
    id: 'sa-4',
    distress_type: 'Aggression',
    severity: 'High',
    zone: 'Emergency Bay',
    timestamp: offsetTs(30),
    confidence_score: 0.89,
    recommended_action: 'Security and de-escalation team to Emergency Bay',
    alert_message: 'Aggressive behavior detected in Emergency Bay',
    slack_status: 'sent',
    status: 'Acknowledged',
    responder: 'Security Lead Martinez',
  },
  {
    id: 'sa-5',
    distress_type: 'Medical Distress',
    severity: 'Critical',
    zone: 'Room 112',
    timestamp: offsetTs(60),
    confidence_score: 0.96,
    recommended_action: 'Code Blue - immediate response',
    alert_message: 'Severe medical distress detected in Room 112',
    slack_status: 'sent',
    status: 'Resolved',
    responder: 'Dr. Chen',
    resolution_notes: 'Patient stabilized, transferred to ICU',
    response_time: 2,
  },
  {
    id: 'sa-6',
    distress_type: 'Scream',
    severity: 'Medium',
    zone: 'Lobby',
    timestamp: offsetTs(90),
    confidence_score: 0.65,
    recommended_action: 'Check lobby area for disturbance',
    alert_message: 'Possible scream detected in Lobby',
    slack_status: 'sent',
    status: 'Resolved',
    responder: 'Front Desk Staff',
    resolution_notes: 'Child crying, parent calmed situation',
    response_time: 5,
  },
  {
    id: 'sa-7',
    distress_type: 'Glass Break',
    severity: 'Low',
    zone: 'Hallway B',
    timestamp: offsetTs(120),
    confidence_score: 0.52,
    recommended_action: 'Monitor zone, low confidence event',
    alert_message: 'Possible glass break sound in Hallway B',
    slack_status: 'sent',
    status: 'Resolved',
    responder: 'Maintenance',
    resolution_notes: 'False positive - cart collision',
    response_time: 8,
  },
]

const INITIAL_ZONES: Zone[] = [
  { id: '1', name: 'Room 204', description: 'Patient Room - Floor 2', active: true, sensitivity: 0.7 },
  { id: '2', name: 'Hallway B', description: 'Main Corridor - Floor 1', active: true, sensitivity: 0.8 },
  { id: '3', name: 'Lobby', description: 'Main Entrance', active: true, sensitivity: 0.6 },
  { id: '4', name: 'ICU Ward', description: 'Intensive Care Unit', active: true, sensitivity: 0.9 },
  { id: '5', name: 'Emergency Bay', description: 'Emergency Department', active: true, sensitivity: 0.85 },
  { id: '6', name: 'Room 112', description: 'Patient Room - Floor 1', active: true, sensitivity: 0.7 },
]

// ============================================================
// HELPERS
// ============================================================

function severityColor(severity: string) {
  switch (severity) {
    case 'Critical': return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500', dot: 'bg-red-500' }
    case 'High': return { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500', dot: 'bg-orange-500' }
    case 'Medium': return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500', dot: 'bg-yellow-500' }
    case 'Low': return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500', dot: 'bg-blue-500' }
    default: return { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border', dot: 'bg-muted-foreground' }
  }
}

function distressIcon(type: string) {
  switch (type) {
    case 'Scream': return <RiVolumeUpLine className="w-4 h-4" />
    case 'Glass Break': return <RiAlarmWarningLine className="w-4 h-4" />
    case 'Aggression': return <RiShieldFlashLine className="w-4 h-4" />
    case 'Medical Distress': return <RiAlertLine className="w-4 h-4" />
    default: return <RiSoundModuleLine className="w-4 h-4" />
  }
}

function fmtTime(ts: string): string {
  try {
    const d = new Date(ts)
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  } catch {
    return ts
  }
}

function fmtDate(ts: string): string {
  try {
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return ts
  }
}

function timeAgo(ts: string): string {
  try {
    const now = new Date(REF_TIME).getTime()
    const then = new Date(ts).getTime()
    const diff = Math.floor((now - then) / 60000)
    if (diff < 1) return 'Just now'
    if (diff < 60) return `${diff}m ago`
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
    return `${Math.floor(diff / 1440)}d ago`
  } catch {
    return ''
  }
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## '))
          return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# '))
          return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-4 list-disc text-sm">{fmtInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line))
          return <li key={i} className="ml-4 list-decimal text-sm">{fmtInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{fmtInline(line)}</p>
      })}
    </div>
  )
}

function fmtInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  )
}

function parseClassificationResponse(result: any) {
  if (!result?.success) return null
  const responseData = result?.response?.result || result?.response || {}
  let parsed = responseData
  if (typeof responseData === 'string') {
    try { parsed = JSON.parse(responseData) } catch { parsed = { text: responseData } }
  }
  return {
    distress_type: parsed?.distress_type || parsed?.distressType || 'Unknown',
    severity: parsed?.severity || 'Medium',
    zone: parsed?.zone || 'Unknown',
    timestamp: parsed?.timestamp || new Date().toISOString(),
    confidence_score: typeof parsed?.confidence_score === 'number' ? parsed.confidence_score : 0,
    recommended_action: parsed?.recommended_action || parsed?.recommendedAction || '',
    alert_message: parsed?.alert_message || parsed?.alertMessage || '',
    slack_status: parsed?.slack_status || parsed?.slackStatus || 'unknown',
  }
}

function parseSummaryResponse(result: any) {
  if (!result?.success) return null
  const responseData = result?.response?.result || result?.response || {}
  let parsed = responseData
  if (typeof responseData === 'string') {
    try { parsed = JSON.parse(responseData) } catch { parsed = { summary: responseData } }
  }
  return {
    summary: parsed?.summary || '',
    total_events_analyzed: typeof parsed?.total_events_analyzed === 'number' ? parsed.total_events_analyzed : 0,
    date_range: parsed?.date_range || '',
    type_distribution: parsed?.type_distribution || '',
    severity_distribution: parsed?.severity_distribution || '',
    zone_analysis: parsed?.zone_analysis || '',
    avg_response_time: parsed?.avg_response_time || '',
    trends: parsed?.trends || '',
    recommendations: parsed?.recommendations || '',
  }
}

// ============================================================
// ErrorBoundary
// ============================================================

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function StatCard({ label, value, icon, trend }: { label: string; value: string | number; icon: React.ReactNode; trend?: string }) {
  return (
    <Card className="border border-border shadow-none">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</span>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <div className="font-mono text-2xl font-semibold text-foreground">{value}</div>
        {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
      </CardContent>
    </Card>
  )
}

function AlertCard({
  alert,
  onAcknowledge,
  onResolve,
}: {
  alert: Alert
  onAcknowledge: (id: string) => void
  onResolve: (id: string, notes: string) => void
}) {
  const [showResolve, setShowResolve] = useState(false)
  const [notes, setNotes] = useState('')
  const sc = severityColor(alert.severity)
  const isNew = alert.status === 'New'
  const isResolved = alert.status === 'Resolved'

  return (
    <div className={`border-l-4 ${sc.border} bg-card rounded border border-border p-3 mb-2 ${isResolved ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={sc.text}>{distressIcon(alert.distress_type)}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">{alert.distress_type}</span>
              <Badge variant="outline" className={`${sc.bg} ${sc.text} border-0 text-[10px] px-1.5 py-0`}>{alert.severity}</Badge>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${isNew ? 'border-green-500/40 text-green-400' : ''}`}>{alert.status}</Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><RiMapPinLine className="w-3 h-3" />{alert.zone}</span>
              <span className="flex items-center gap-1"><RiTimeLine className="w-3 h-3" />{timeAgo(alert.timestamp)}</span>
              <span className="font-mono">{(alert.confidence_score * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {alert.slack_status === 'sent' && <RiSlackLine className="w-3.5 h-3.5 text-green-400" title="Slack notified" />}
          {alert.slack_status === 'failed' && <RiSlackLine className="w-3.5 h-3.5 text-red-400" title="Slack failed" />}
          {isNew && <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />}
        </div>
      </div>

      {alert.recommended_action && (
        <p className="text-xs text-muted-foreground mt-2 pl-6">{alert.recommended_action}</p>
      )}

      {alert.responder && (
        <p className="text-xs text-muted-foreground mt-1 pl-6 flex items-center gap-1"><RiUserLine className="w-3 h-3" />{alert.responder}</p>
      )}
      {alert.resolution_notes && (
        <p className="text-xs text-muted-foreground mt-1 pl-6 italic">{alert.resolution_notes}</p>
      )}
      {typeof alert.response_time === 'number' && (
        <p className="text-xs text-muted-foreground mt-1 pl-6 font-mono">Response: {alert.response_time}m</p>
      )}

      {isNew && (
        <div className="flex gap-2 mt-2 pl-6">
          <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => onAcknowledge(alert.id)}>
            <RiCheckLine className="w-3 h-3 mr-1" /> Acknowledge
          </Button>
          <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => setShowResolve(true)}>
            <RiCloseLine className="w-3 h-3 mr-1" /> Resolve
          </Button>
        </div>
      )}
      {alert.status === 'Acknowledged' && (
        <div className="flex gap-2 mt-2 pl-6">
          <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => setShowResolve(true)}>
            <RiCloseLine className="w-3 h-3 mr-1" /> Resolve
          </Button>
        </div>
      )}

      {showResolve && (
        <div className="mt-2 pl-6 flex gap-2 items-end">
          <div className="flex-1">
            <Input placeholder="Resolution notes..." value={notes} onChange={(e) => setNotes(e.target.value)} className="h-7 text-xs" />
          </div>
          <Button size="sm" className="h-7 text-xs px-2" onClick={() => { onResolve(alert.id, notes); setShowResolve(false); setNotes('') }}>
            Save
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => { setShowResolve(false); setNotes('') }}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}

function ZoneTile({ zone, alertStatus }: { zone: Zone; alertStatus: 'clear' | 'recent' | 'critical' }) {
  const statusColor = alertStatus === 'critical' ? 'border-red-500 bg-red-500/10' :
    alertStatus === 'recent' ? 'border-yellow-500 bg-yellow-500/10' :
    'border-green-500/30 bg-green-500/5'
  const dotColor = alertStatus === 'critical' ? 'bg-red-500' :
    alertStatus === 'recent' ? 'bg-yellow-500' :
    'bg-green-500'

  return (
    <div className={`border ${statusColor} rounded p-2`}>
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${dotColor} flex-shrink-0`} />
        <span className="text-xs font-medium text-foreground truncate">{zone.name}</span>
      </div>
      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{zone.description}</p>
    </div>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function Page() {
  const [activeScreen, setActiveScreen] = useState<'dashboard' | 'history' | 'settings'>('dashboard')

  // Alerts
  const [alerts, setAlerts] = useState<Alert[]>(SAMPLE_ALERTS)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')
  const [analyzeSuccess, setAnalyzeSuccess] = useState('')

  // Analyze Event Form
  const [analyzeOpen, setAnalyzeOpen] = useState(false)
  const [eventForm, setEventForm] = useState({
    sound_type: 'Scream',
    confidence_score: 0.85,
    zone: 'Room 204',
    slack_channel: '#emergency-alerts',
  })

  // Zones
  const [zones, setZones] = useState<Zone[]>(INITIAL_ZONES)
  const [addZoneOpen, setAddZoneOpen] = useState(false)
  const [newZone, setNewZone] = useState({ name: '', description: '', sensitivity: 0.7 })
  const [editZoneId, setEditZoneId] = useState<string | null>(null)

  // Settings
  const [slackChannels, setSlackChannels] = useState({
    Critical: '#emergency-alerts',
    High: '#facility-alerts',
    Medium: '#facility-alerts',
    Low: '#monitoring-log',
  })
  const [soundNotifs, setSoundNotifs] = useState({ Critical: true, High: true, Medium: false, Low: false })
  const [settingsMsg, setSettingsMsg] = useState('')

  // Reports
  const [reportData, setReportData] = useState<any>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [reportError, setReportError] = useState('')

  // History filters
  const [historyFilter, setHistoryFilter] = useState({ zone: 'all', type: 'all', severity: 'all', search: '' })

  // Agent activity
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // Connection status
  const [connected] = useState(true)

  // Sample data toggle
  const [showSampleData, setShowSampleData] = useState(true)

  // Derived data
  const displayAlerts = showSampleData ? alerts : alerts.filter(a => !a.id.startsWith('sa-'))
  const activeAlertsList = displayAlerts.filter(a => a.status !== 'Resolved')
  const criticalCount = displayAlerts.filter(a => a.severity === 'Critical' && a.status !== 'Resolved').length
  const avgResponseTime = (() => {
    const resolved = displayAlerts.filter(a => typeof a.response_time === 'number')
    if (resolved.length === 0) return '--'
    const avg = resolved.reduce((sum, a) => sum + (a.response_time ?? 0), 0) / resolved.length
    return avg.toFixed(1) + 'm'
  })()
  const activeZonesCount = zones.filter(z => z.active).length

  const getZoneStatus = useCallback((zoneName: string): 'clear' | 'recent' | 'critical' => {
    const zoneAlerts = displayAlerts.filter(a => a.zone === zoneName && a.status !== 'Resolved')
    if (zoneAlerts.some(a => a.severity === 'Critical' || a.severity === 'High')) return 'critical'
    if (zoneAlerts.length > 0) return 'recent'
    const recentResolved = displayAlerts.filter(a => a.zone === zoneName && a.status === 'Resolved')
    if (recentResolved.length > 0) {
      const latestTs = new Date(recentResolved[0]?.timestamp ?? '').getTime()
      const refTime = new Date(REF_TIME).getTime()
      if (refTime - latestTs < 3600000) return 'recent'
    }
    return 'clear'
  }, [displayAlerts])

  const filteredHistory = displayAlerts.filter(a => {
    if (historyFilter.zone !== 'all' && a.zone !== historyFilter.zone) return false
    if (historyFilter.type !== 'all' && a.distress_type !== historyFilter.type) return false
    if (historyFilter.severity !== 'all' && a.severity !== historyFilter.severity) return false
    if (historyFilter.search) {
      const s = historyFilter.search.toLowerCase()
      const searchable = `${a.distress_type} ${a.zone} ${a.responder ?? ''} ${a.resolution_notes ?? ''}`.toLowerCase()
      if (!searchable.includes(s)) return false
    }
    return true
  })

  const sortedAlerts = [...displayAlerts].sort((a, b) => {
    const sevOrd: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }
    const statusOrd: Record<string, number> = { New: 0, Acknowledged: 1, Resolved: 2 }
    const sDiff = (statusOrd[a.status] ?? 2) - (statusOrd[b.status] ?? 2)
    if (sDiff !== 0) return sDiff
    const vDiff = (sevOrd[a.severity] ?? 3) - (sevOrd[b.severity] ?? 3)
    if (vDiff !== 0) return vDiff
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })

  // Handlers
  const handleAnalyzeEvent = async () => {
    setIsAnalyzing(true)
    setAnalyzeError('')
    setAnalyzeSuccess('')
    setActiveAgentId(CLASSIFICATION_AGENT_ID)
    try {
      const message = JSON.stringify({
        sound_type: eventForm.sound_type,
        confidence_score: eventForm.confidence_score,
        zone: eventForm.zone,
        timestamp: new Date().toISOString(),
        slack_channel: eventForm.slack_channel,
      })
      const result = await callAIAgent(message, CLASSIFICATION_AGENT_ID)
      if (!result) {
        setAnalyzeError('No response received from agent. Please try again.')
        return
      }
      if (!result.success) {
        const errMsg = result.error || result.response?.message || 'Agent returned an error.'
        setAnalyzeError(errMsg)
        return
      }
      const parsed = parseClassificationResponse(result)
      if (parsed) {
        const validSeverities = ['Critical', 'High', 'Medium', 'Low'] as const
        const sev = validSeverities.find(s => s === parsed.severity) || 'Medium'
        const newAlert: Alert = {
          id: `alert-${Date.now()}`,
          distress_type: parsed.distress_type,
          severity: sev,
          zone: parsed.zone || eventForm.zone,
          timestamp: parsed.timestamp || new Date().toISOString(),
          confidence_score: typeof parsed.confidence_score === 'number' ? parsed.confidence_score : eventForm.confidence_score,
          recommended_action: parsed.recommended_action,
          alert_message: parsed.alert_message,
          slack_status: parsed.slack_status,
          status: 'New',
        }
        setAlerts(prev => [newAlert, ...prev])
        setAnalyzeSuccess(`Alert classified: ${parsed.distress_type} - ${sev}`)
        setAnalyzeOpen(false)
      } else {
        setAnalyzeError('Failed to parse agent response. Please try again.')
      }
    } catch (err: any) {
      setAnalyzeError(err?.message || 'An error occurred during analysis.')
    } finally {
      setIsAnalyzing(false)
      setActiveAgentId(null)
    }
  }

  const handleAcknowledge = (id: string) => {
    setAlerts(prev => prev.map(a =>
      a.id === id ? { ...a, status: 'Acknowledged' as const, responder: 'Current User' } : a
    ))
  }

  const handleResolve = (id: string, notesText: string) => {
    setAlerts(prev => prev.map(a =>
      a.id === id ? { ...a, status: 'Resolved' as const, resolution_notes: notesText || 'Resolved', response_time: 4 } : a
    ))
  }

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true)
    setReportError('')
    setReportData(null)
    setActiveAgentId(SUMMARY_AGENT_ID)
    try {
      const message = JSON.stringify({
        alerts: filteredHistory.map(a => ({
          distress_type: a.distress_type,
          severity: a.severity,
          zone: a.zone,
          timestamp: a.timestamp,
          confidence_score: a.confidence_score,
          status: a.status,
          response_time: a.response_time,
          responder: a.responder || '',
          resolution_notes: a.resolution_notes || '',
        })),
        dateRange: 'Last 7 days',
        totalAlerts: filteredHistory.length,
      })
      const result = await callAIAgent(message, SUMMARY_AGENT_ID)
      if (!result) {
        setReportError('No response received from agent. Please try again.')
        return
      }
      if (!result.success) {
        const errMsg = result.error || result.response?.message || 'Agent returned an error.'
        setReportError(errMsg)
        return
      }
      const parsed = parseSummaryResponse(result)
      if (parsed && parsed.summary) {
        setReportData(parsed)
      } else {
        setReportError('Failed to generate report. The agent returned an incomplete response.')
      }
    } catch (err: any) {
      setReportError(err?.message || 'An error occurred generating the report.')
    } finally {
      setIsGeneratingReport(false)
      setActiveAgentId(null)
    }
  }

  const handleExportJSON = () => {
    if (!reportData) return
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'alert-report.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleAddZone = () => {
    if (!newZone.name.trim()) return
    const zone: Zone = {
      id: `z-${Date.now()}`,
      name: newZone.name,
      description: newZone.description,
      active: true,
      sensitivity: newZone.sensitivity,
    }
    setZones(prev => [...prev, zone])
    setNewZone({ name: '', description: '', sensitivity: 0.7 })
    setAddZoneOpen(false)
  }

  const handleDeleteZone = (id: string) => {
    setZones(prev => prev.filter(z => z.id !== id))
  }

  const handleToggleZone = (id: string) => {
    setZones(prev => prev.map(z => z.id === id ? { ...z, active: !z.active } : z))
  }

  // Navigation items
  const navItems = [
    { key: 'dashboard' as const, label: 'Monitoring', icon: <RiDashboardLine className="w-5 h-5" /> },
    { key: 'history' as const, label: 'Alert History', icon: <RiHistoryLine className="w-5 h-5" /> },
    { key: 'settings' as const, label: 'Settings', icon: <RiSettings3Line className="w-5 h-5" /> },
  ]

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground flex">
        {/* LEFT SIDEBAR */}
        <aside className="w-[180px] min-h-screen border-r border-border flex flex-col flex-shrink-0" style={{ background: 'hsl(220, 24%, 8%)' }}>
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-2">
              <RiShieldFlashLine className="w-6 h-6 text-primary" />
              <span className="font-semibold text-sm text-foreground tracking-tight">MedGuard</span>
            </div>
          </div>
          <nav className="flex-1 p-2 space-y-1">
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => setActiveScreen(item.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors ${activeScreen === item.key ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
          {/* Agent Info */}
          <div className="p-3 border-t border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-medium">Agents</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeAgentId === CLASSIFICATION_AGENT_ID ? 'bg-green-400 animate-pulse' : 'bg-muted-foreground/40'}`} />
                <span className="text-[10px] text-muted-foreground truncate">Classification</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeAgentId === SUMMARY_AGENT_ID ? 'bg-green-400 animate-pulse' : 'bg-muted-foreground/40'}`} />
                <span className="text-[10px] text-muted-foreground truncate">Summary</span>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* TOP HEADER */}
          <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-card flex-shrink-0">
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-semibold text-foreground">MedGuard Alert System</h1>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-[10px] text-muted-foreground">{connected ? 'Connected' : 'Disconnected'}</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-1.5">
                <RiSignalWifiLine className={`w-3.5 h-3.5 ${connected ? 'text-green-400' : 'text-red-400'}`} />
                <span className="text-[10px] text-muted-foreground">Audio Pipeline: {connected ? 'Healthy' : 'Error'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="sample-toggle" className="text-[10px] text-muted-foreground cursor-pointer">Sample Data</Label>
              <Switch id="sample-toggle" checked={showSampleData} onCheckedChange={setShowSampleData} />
            </div>
          </header>

          {/* SCREEN CONTENT */}
          <main className="flex-1 overflow-y-auto">

            {/* ======== DASHBOARD ======== */}
            {activeScreen === 'dashboard' && (
              <div className="p-4 space-y-4">
                {/* Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard label="Active Alerts" value={activeAlertsList.length} icon={<RiAlarmWarningLine className="w-4 h-4" />} trend={`${displayAlerts.length} total`} />
                  <StatCard label="Critical" value={criticalCount} icon={<RiAlertLine className="w-4 h-4 text-red-400" />} trend="Requires immediate action" />
                  <StatCard label="Avg Response" value={avgResponseTime} icon={<RiTimeLine className="w-4 h-4" />} trend="Minutes to acknowledge" />
                  <StatCard label="Zones Online" value={`${activeZonesCount}/${zones.length}`} icon={<RiMapPinLine className="w-4 h-4" />} trend="Monitored zones" />
                </div>

                {/* Two column */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
                  {/* Live Alert Feed */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <RiSoundModuleLine className="w-4 h-4 text-primary" />
                        Live Alert Feed
                      </h2>
                      <Dialog open={analyzeOpen} onOpenChange={setAnalyzeOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="h-7 text-xs">
                            <RiSoundModuleLine className="w-3.5 h-3.5 mr-1" /> Analyze Event
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-border max-w-md">
                          <DialogHeader>
                            <DialogTitle className="text-foreground">Analyze Audio Event</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-2">
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">Sound Type *</Label>
                              <Select value={eventForm.sound_type} onValueChange={v => setEventForm(prev => ({ ...prev, sound_type: v }))}>
                                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Scream">Scream</SelectItem>
                                  <SelectItem value="Glass Break">Glass Break</SelectItem>
                                  <SelectItem value="Aggression">Aggression</SelectItem>
                                  <SelectItem value="Medical Distress">Medical Distress</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">Confidence Score: {eventForm.confidence_score.toFixed(2)}</Label>
                              <Slider value={[eventForm.confidence_score]} min={0} max={1} step={0.01} onValueChange={v => setEventForm(prev => ({ ...prev, confidence_score: v[0] ?? 0.5 }))} />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">Zone *</Label>
                              <Select value={eventForm.zone} onValueChange={v => setEventForm(prev => ({ ...prev, zone: v }))}>
                                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {zones.filter(z => z.active).map(z => (
                                    <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">Slack Channel</Label>
                              <Input value={eventForm.slack_channel} onChange={e => setEventForm(prev => ({ ...prev, slack_channel: e.target.value }))} className="h-8 text-sm" placeholder="#channel-name" />
                            </div>
                            {analyzeError && <p className="text-xs text-red-400 bg-red-500/10 rounded p-2">{analyzeError}</p>}
                            {analyzeSuccess && <p className="text-xs text-green-400 bg-green-500/10 rounded p-2">{analyzeSuccess}</p>}
                            <Button className="w-full h-8 text-sm" onClick={handleAnalyzeEvent} disabled={isAnalyzing}>
                              {isAnalyzing ? (
                                <><RiRefreshLine className="w-3.5 h-3.5 mr-1 animate-spin" /> Analyzing...</>
                              ) : (
                                <><RiSoundModuleLine className="w-3.5 h-3.5 mr-1" /> Classify and Alert</>
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <ScrollArea className="h-[calc(100vh-260px)]">
                      {sortedAlerts.length === 0 ? (
                        <Card className="border border-border shadow-none">
                          <CardContent className="p-8 text-center">
                            <RiSoundModuleLine className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No alerts detected. Use "Analyze Event" to simulate an audio event.</p>
                          </CardContent>
                        </Card>
                      ) : (
                        sortedAlerts.map(alert => (
                          <AlertCard key={alert.id} alert={alert} onAcknowledge={handleAcknowledge} onResolve={handleResolve} />
                        ))
                      )}
                    </ScrollArea>
                  </div>

                  {/* Zone Status Panel */}
                  <div>
                    <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                      <RiMapPinLine className="w-4 h-4 text-primary" />
                      Zone Status
                    </h2>
                    <div className="grid grid-cols-2 gap-2">
                      {zones.filter(z => z.active).map(zone => (
                        <ZoneTile key={zone.id} zone={zone} alertStatus={getZoneStatus(zone.name)} />
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" /> Clear</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" /> Recent</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" /> Critical</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======== HISTORY ======== */}
            {activeScreen === 'history' && (
              <div className="p-4 space-y-4">
                {/* Filter Bar */}
                <Card className="border border-border shadow-none">
                  <CardContent className="p-3">
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="flex-1 min-w-[150px]">
                        <Label className="text-[10px] text-muted-foreground mb-1 block">Search</Label>
                        <div className="relative">
                          <RiSearchLine className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <Input placeholder="Search alerts..." value={historyFilter.search} onChange={e => setHistoryFilter(prev => ({ ...prev, search: e.target.value }))} className="h-8 text-sm pl-7" />
                        </div>
                      </div>
                      <div className="min-w-[120px]">
                        <Label className="text-[10px] text-muted-foreground mb-1 block">Zone</Label>
                        <Select value={historyFilter.zone} onValueChange={v => setHistoryFilter(prev => ({ ...prev, zone: v }))}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Zones</SelectItem>
                            {zones.map(z => <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="min-w-[120px]">
                        <Label className="text-[10px] text-muted-foreground mb-1 block">Type</Label>
                        <Select value={historyFilter.type} onValueChange={v => setHistoryFilter(prev => ({ ...prev, type: v }))}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="Scream">Scream</SelectItem>
                            <SelectItem value="Glass Break">Glass Break</SelectItem>
                            <SelectItem value="Aggression">Aggression</SelectItem>
                            <SelectItem value="Medical Distress">Medical Distress</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="min-w-[120px]">
                        <Label className="text-[10px] text-muted-foreground mb-1 block">Severity</Label>
                        <Select value={historyFilter.severity} onValueChange={v => setHistoryFilter(prev => ({ ...prev, severity: v }))}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="Critical">Critical</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setHistoryFilter({ zone: 'all', type: 'all', severity: 'all', search: '' })}>
                        <RiRefreshLine className="w-3 h-3 mr-1" /> Reset
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* History Table */}
                <Card className="border border-border shadow-none">
                  <CardHeader className="py-2 px-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">Alert History ({filteredHistory.length})</CardTitle>
                      <Button size="sm" className="h-7 text-xs" onClick={handleGenerateReport} disabled={isGeneratingReport || filteredHistory.length === 0}>
                        {isGeneratingReport ? (
                          <><RiRefreshLine className="w-3 h-3 mr-1 animate-spin" /> Generating...</>
                        ) : (
                          <><RiFileListLine className="w-3 h-3 mr-1" /> Generate Report</>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="max-h-[350px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border">
                            <TableHead className="text-[10px] text-muted-foreground px-3 py-1.5">Timestamp</TableHead>
                            <TableHead className="text-[10px] text-muted-foreground px-3 py-1.5">Zone</TableHead>
                            <TableHead className="text-[10px] text-muted-foreground px-3 py-1.5">Type</TableHead>
                            <TableHead className="text-[10px] text-muted-foreground px-3 py-1.5">Severity</TableHead>
                            <TableHead className="text-[10px] text-muted-foreground px-3 py-1.5">Confidence</TableHead>
                            <TableHead className="text-[10px] text-muted-foreground px-3 py-1.5">Status</TableHead>
                            <TableHead className="text-[10px] text-muted-foreground px-3 py-1.5">Responder</TableHead>
                            <TableHead className="text-[10px] text-muted-foreground px-3 py-1.5">Response</TableHead>
                            <TableHead className="text-[10px] text-muted-foreground px-3 py-1.5">Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredHistory.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center py-8 text-sm text-muted-foreground">No alerts match the current filters.</TableCell>
                            </TableRow>
                          ) : (
                            filteredHistory.map(alert => {
                              const sc = severityColor(alert.severity)
                              return (
                                <TableRow key={alert.id} className="border-border">
                                  <TableCell className="text-xs px-3 py-1.5 font-mono whitespace-nowrap">{fmtDate(alert.timestamp)} {fmtTime(alert.timestamp)}</TableCell>
                                  <TableCell className="text-xs px-3 py-1.5">{alert.zone}</TableCell>
                                  <TableCell className="text-xs px-3 py-1.5">
                                    <span className="flex items-center gap-1">{distressIcon(alert.distress_type)} {alert.distress_type}</span>
                                  </TableCell>
                                  <TableCell className="text-xs px-3 py-1.5">
                                    <Badge variant="outline" className={`${sc.bg} ${sc.text} border-0 text-[10px] px-1.5 py-0`}>{alert.severity}</Badge>
                                  </TableCell>
                                  <TableCell className="text-xs px-3 py-1.5 font-mono">{(alert.confidence_score * 100).toFixed(0)}%</TableCell>
                                  <TableCell className="text-xs px-3 py-1.5">
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{alert.status}</Badge>
                                  </TableCell>
                                  <TableCell className="text-xs px-3 py-1.5">{alert.responder ?? '--'}</TableCell>
                                  <TableCell className="text-xs px-3 py-1.5 font-mono">{typeof alert.response_time === 'number' ? `${alert.response_time}m` : '--'}</TableCell>
                                  <TableCell className="text-xs px-3 py-1.5 max-w-[120px] truncate">{alert.resolution_notes ?? '--'}</TableCell>
                                </TableRow>
                              )
                            })
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Report Error */}
                {reportError && (
                  <Card className="border border-red-500/30 shadow-none">
                    <CardContent className="p-3">
                      <p className="text-xs text-red-400">{reportError}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Report Output */}
                {reportData && (
                  <Card className="border border-border shadow-none">
                    <CardHeader className="py-2 px-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">Alert Summary Report</CardTitle>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleExportJSON}>
                          <RiDownloadLine className="w-3 h-3 mr-1" /> Export JSON
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 space-y-4">
                      {/* Executive Summary */}
                      {reportData.summary && (
                        <div>
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Executive Summary</h3>
                          <div className="bg-secondary/50 rounded p-3">{renderMarkdown(reportData.summary)}</div>
                        </div>
                      )}

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-secondary/50 rounded p-2">
                          <p className="text-[10px] text-muted-foreground uppercase">Events Analyzed</p>
                          <p className="font-mono text-lg font-semibold">{reportData.total_events_analyzed ?? 0}</p>
                        </div>
                        <div className="bg-secondary/50 rounded p-2">
                          <p className="text-[10px] text-muted-foreground uppercase">Date Range</p>
                          <p className="text-sm">{reportData.date_range || '--'}</p>
                        </div>
                        <div className="bg-secondary/50 rounded p-2">
                          <p className="text-[10px] text-muted-foreground uppercase">Avg Response</p>
                          <p className="text-sm">{reportData.avg_response_time || '--'}</p>
                        </div>
                        <div className="bg-secondary/50 rounded p-2">
                          <p className="text-[10px] text-muted-foreground uppercase">Report Status</p>
                          <Badge variant="outline" className="bg-green-500/20 text-green-400 border-0 text-[10px]">Complete</Badge>
                        </div>
                      </div>

                      {reportData.type_distribution && (
                        <div>
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Type Distribution</h3>
                          <div className="bg-secondary/50 rounded p-3">{renderMarkdown(reportData.type_distribution)}</div>
                        </div>
                      )}

                      {reportData.severity_distribution && (
                        <div>
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Severity Distribution</h3>
                          <div className="bg-secondary/50 rounded p-3">{renderMarkdown(reportData.severity_distribution)}</div>
                        </div>
                      )}

                      {reportData.zone_analysis && (
                        <div>
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Zone Analysis</h3>
                          <div className="bg-secondary/50 rounded p-3">{renderMarkdown(reportData.zone_analysis)}</div>
                        </div>
                      )}

                      {reportData.trends && (
                        <div>
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Trends</h3>
                          <div className="bg-secondary/50 rounded p-3">{renderMarkdown(reportData.trends)}</div>
                        </div>
                      )}

                      {reportData.recommendations && (
                        <div>
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Recommendations</h3>
                          <div className="bg-secondary/50 rounded p-3">{renderMarkdown(reportData.recommendations)}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* ======== SETTINGS ======== */}
            {activeScreen === 'settings' && (
              <div className="p-4">
                <Tabs defaultValue="zones">
                  <TabsList className="bg-secondary mb-4">
                    <TabsTrigger value="zones" className="text-xs"><RiMapPinLine className="w-3.5 h-3.5 mr-1" /> Zones</TabsTrigger>
                    <TabsTrigger value="notifications" className="text-xs"><RiSlackLine className="w-3.5 h-3.5 mr-1" /> Notifications</TabsTrigger>
                  </TabsList>

                  {/* ZONES TAB */}
                  <TabsContent value="zones" className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold">Monitored Zones ({zones.length})</h2>
                      <Dialog open={addZoneOpen} onOpenChange={setAddZoneOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="h-7 text-xs"><RiAddLine className="w-3.5 h-3.5 mr-1" /> Add Zone</Button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-border max-w-sm">
                          <DialogHeader>
                            <DialogTitle className="text-foreground text-sm">Add New Zone</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3 mt-2">
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">Zone Name *</Label>
                              <Input value={newZone.name} onChange={e => setNewZone(prev => ({ ...prev, name: e.target.value }))} className="h-8 text-sm" placeholder="e.g. Room 301" />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">Description</Label>
                              <Input value={newZone.description} onChange={e => setNewZone(prev => ({ ...prev, description: e.target.value }))} className="h-8 text-sm" placeholder="e.g. Patient Room - Floor 3" />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">Sensitivity: {newZone.sensitivity.toFixed(2)}</Label>
                              <Slider value={[newZone.sensitivity]} min={0} max={1} step={0.05} onValueChange={v => setNewZone(prev => ({ ...prev, sensitivity: v[0] ?? 0.7 }))} />
                            </div>
                            <Button className="w-full h-8 text-sm" onClick={handleAddZone} disabled={!newZone.name.trim()}>
                              <RiAddLine className="w-3.5 h-3.5 mr-1" /> Add Zone
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="space-y-2">
                      {zones.map(zone => (
                        <Card key={zone.id} className="border border-border shadow-none">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 min-w-0">
                                <Switch checked={zone.active} onCheckedChange={() => handleToggleZone(zone.id)} />
                                <div className="min-w-0">
                                  <p className={`text-sm font-medium ${zone.active ? 'text-foreground' : 'text-muted-foreground line-through'}`}>{zone.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{zone.description}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="text-right">
                                  <p className="text-[10px] text-muted-foreground">Sensitivity</p>
                                  <p className="text-xs font-mono">{(zone.sensitivity * 100).toFixed(0)}%</p>
                                </div>
                                {editZoneId === zone.id ? (
                                  <div className="flex items-center gap-1">
                                    <Slider value={[zone.sensitivity]} min={0} max={1} step={0.05} className="w-20" onValueChange={v => setZones(prev => prev.map(z => z.id === zone.id ? { ...z, sensitivity: v[0] ?? 0.7 } : z))} />
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setEditZoneId(null)}><RiCheckLine className="w-3.5 h-3.5" /></Button>
                                  </div>
                                ) : (
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setEditZoneId(zone.id)}><RiEditLine className="w-3.5 h-3.5" /></Button>
                                )}
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-300" onClick={() => handleDeleteZone(zone.id)}><RiDeleteBinLine className="w-3.5 h-3.5" /></Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  {/* NOTIFICATIONS TAB */}
                  <TabsContent value="notifications" className="space-y-4">
                    <Card className="border border-border shadow-none">
                      <CardHeader className="py-2 px-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2"><RiSlackLine className="w-4 h-4" /> Slack Channels by Severity</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 space-y-3">
                        {(['Critical', 'High', 'Medium', 'Low'] as const).map(sev => {
                          const sc = severityColor(sev)
                          return (
                            <div key={sev} className="flex items-center gap-3">
                              <Badge variant="outline" className={`${sc.bg} ${sc.text} border-0 text-[10px] px-2 py-0.5 w-16 text-center justify-center`}>{sev}</Badge>
                              <Input value={slackChannels[sev]} onChange={e => setSlackChannels(prev => ({ ...prev, [sev]: e.target.value }))} className="h-8 text-sm flex-1" placeholder="#channel-name" />
                            </div>
                          )
                        })}
                      </CardContent>
                    </Card>

                    <Card className="border border-border shadow-none">
                      <CardHeader className="py-2 px-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2"><RiVolumeUpLine className="w-4 h-4" /> In-App Sound Notifications</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 space-y-3">
                        {(['Critical', 'High', 'Medium', 'Low'] as const).map(sev => {
                          const sc = severityColor(sev)
                          return (
                            <div key={sev} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={`${sc.bg} ${sc.text} border-0 text-[10px] px-2 py-0.5 w-16 text-center justify-center`}>{sev}</Badge>
                                <span className="text-xs text-muted-foreground">Play alert sound</span>
                              </div>
                              <Switch checked={soundNotifs[sev]} onCheckedChange={v => setSoundNotifs(prev => ({ ...prev, [sev]: v }))} />
                            </div>
                          )
                        })}
                      </CardContent>
                    </Card>

                    <div className="flex gap-2">
                      <Button size="sm" className="h-8 text-xs" onClick={() => setSettingsMsg('Settings saved successfully.')}>
                        <RiCheckLine className="w-3 h-3 mr-1" /> Save Settings
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => {
                        setSlackChannels({ Critical: '#emergency-alerts', High: '#facility-alerts', Medium: '#facility-alerts', Low: '#monitoring-log' })
                        setSoundNotifs({ Critical: true, High: true, Medium: false, Low: false })
                        setSettingsMsg('Settings reset to defaults.')
                      }}>
                        <RiRefreshLine className="w-3 h-3 mr-1" /> Discard Changes
                      </Button>
                    </div>
                    {settingsMsg && <p className="text-xs text-green-400 bg-green-500/10 rounded p-2 mt-2">{settingsMsg}</p>}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}

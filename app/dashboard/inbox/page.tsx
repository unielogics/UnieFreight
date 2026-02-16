'use client'

import { useState, useEffect, useMemo } from 'react'
import { Loader2, Mail, Send, AlertCircle } from 'lucide-react'
import { fetchMailbox, sendMailboxEmail, markMessageRead } from '@/lib/api/mailbox'

type InboxTab = 'messages' | 'disputes'

function getThreadKey(m: any): string {
  if (m.threadId && String(m.threadId).startsWith('freight-dispute:')) return m.threadId
  if (m.threadId && String(m.threadId).startsWith('freight:')) return m.threadId
  if (m.metadata?.freightJobId && m.metadata?.freightCarrierId) return `freight:${m.metadata.freightJobId}:${m.metadata.freightCarrierId}`
  return m.threadId || m.inReplyTo || m.messageId || m._id || ''
}

export default function InboxPage() {
  const [inboxTab, setInboxTab] = useState<InboxTab>('messages')
  const [messages, setMessages] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [disputeThreadInfo, setDisputeThreadInfo] = useState<Record<string, { disputeId: string; warehouseCode: string; carrierName: string; status: string; reasonCategory?: string }>>({})
  const [loading, setLoading] = useState(true)
  const [selectedThreadKey, setSelectedThreadKey] = useState<string | null>(null)
  const [composeBody, setComposeBody] = useState('')
  const [sending, setSending] = useState(false)

  const load = () => {
    setLoading(true)
    const context = inboxTab === 'disputes' ? 'disputes' : inboxTab === 'messages' ? 'freight' : undefined
    fetchMailbox({ limit: 100, context })
      .then((r: any) => {
        const list = r.messages || []
        setMessages(list)
        setTotal(r.total ?? 0)
        setUnreadCount(r.unreadCount ?? 0)
        setDisputeThreadInfo(r.disputeThreadInfo || {})
      })
      .catch(() => {
        setMessages([])
        setTotal(0)
        setUnreadCount(0)
        setDisputeThreadInfo({})
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [inboxTab])

  const threads = useMemo(() => {
    const byKey = new Map<string, any[]>()
    for (const m of messages) {
      const key = getThreadKey(m)
      if (!key) continue
      if (!byKey.has(key)) byKey.set(key, [])
      byKey.get(key)!.push(m)
    }
    return Array.from(byKey.entries()).map(([threadKey, msgs]) => {
      const sorted = [...msgs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      const latest = sorted[sorted.length - 1]
      const unread = msgs.some((m: any) => !m.read)
      return { threadKey, messages: sorted, latest, unread }
    }).sort((a, b) => new Date(b.latest.createdAt).getTime() - new Date(a.latest.createdAt).getTime())
  }, [messages])

  const threadMessages = useMemo(() => {
    if (!selectedThreadKey) return []
    const t = threads.find((x) => x.threadKey === selectedThreadKey)
    return t ? t.messages : []
  }, [threads, selectedThreadKey])

  const selectedThread = selectedThreadKey ? threads.find((t) => t.threadKey === selectedThreadKey) : null
  const replyToEmail = selectedThread?.messages?.find((m: any) => m.direction === 'inbound')?.fromEmail || selectedThread?.latest?.toEmails?.[0] || ''
  const replySubject = selectedThread?.latest?.subject ? (selectedThread.latest.subject.startsWith('Re:') ? selectedThread.latest.subject : `Re: ${selectedThread.latest.subject}`) : ''

  const handleOpenThread = (threadKey: string) => {
    setSelectedThreadKey(threadKey)
    const t = threads.find((x) => x.threadKey === threadKey)
    if (t) {
      const unread = t.messages.find((m: any) => !m.read)
      if (unread) markMessageRead(unread._id).then(() => load())
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedThreadKey) return
    const body = composeBody.trim()
    if (!body) return
    const isDispute = selectedThreadKey.startsWith('freight-dispute:')
    const to = replyToEmail
    const subject = replySubject
    if (!isDispute && (!to || !subject)) return
    setSending(true)
    try {
      if (isDispute) {
        await sendMailboxEmail({
          subject: subject || 'Dispute message',
          body,
          threadId: selectedThreadKey,
          inReplyTo: selectedThreadKey,
        })
      } else {
        await sendMailboxEmail({
          to: to!,
          subject: subject!,
          body,
          threadId: selectedThreadKey,
          inReplyTo: selectedThreadKey,
        })
      }
      setComposeBody('')
      load()
    } finally {
      setSending(false)
    }
  }

  if (loading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin" />
        Loading inbox…
      </div>
    )
  }

  const isDisputeThread = (key: string) => String(key).startsWith('freight-dispute:')
  const threadTitle = (t: { threadKey: string; latest?: any }) => {
    const info = disputeThreadInfo[t.threadKey]
    if (info) return `Dispute: ${info.warehouseCode} – ${info.carrierName}`
    return t.latest?.subject || '(No subject)'
  }
  const threadSubtitle = (t: { threadKey: string; messages: any[]; latest?: any }) => {
    const info = disputeThreadInfo[t.threadKey]
    if (info) return `${info.status} · ${t.messages.length} message${t.messages.length !== 1 ? 's' : ''}`
    return `${t.latest?.direction === 'inbound' ? (t.latest.fromEmail || '—') : (t.latest?.toEmails?.[0] || '—')} · ${t.messages.length} message${t.messages.length !== 1 ? 's' : ''}`
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Inbox</h1>
        <p className="text-gray-600 text-sm mt-1">
          {inboxTab === 'disputes'
            ? 'Dispute cases with warehouses and UnieWMS.'
            : 'Messages with warehouses.'}
        </p>
        <div className="flex gap-1 mt-3 p-1 rounded-lg bg-gray-100 inline-flex">
          <button
            type="button"
            onClick={() => { setInboxTab('messages'); setSelectedThreadKey(null) }}
            className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 ${inboxTab === 'messages' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <Mail className="w-4 h-4" />
            Messages
          </button>
          <button
            type="button"
            onClick={() => { setInboxTab('disputes'); setSelectedThreadKey(null) }}
            className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 ${inboxTab === 'disputes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <AlertCircle className="w-4 h-4" />
            Disputes
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden flex flex-col" style={{ minHeight: 400 }}>
        <div className="flex border-b border-gray-200">
          <div className="w-80 border-r border-gray-200 flex flex-col max-h-96 overflow-y-auto">
            <div className="p-2 border-b border-gray-100 text-xs text-gray-500">
              {threads.length} thread{threads.length !== 1 ? 's' : ''} · {unreadCount} unread
            </div>
            {threads.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">
                {inboxTab === 'disputes' ? 'No dispute cases yet.' : 'No threads yet.'}
              </div>
            ) : (
              threads.map((t) => (
                <button
                  key={t.threadKey}
                  type="button"
                  onClick={() => handleOpenThread(t.threadKey)}
                  className={`text-left px-3 py-2 border-b border-gray-100 hover:bg-gray-50 ${
                    selectedThreadKey === t.threadKey ? 'bg-amber-50 border-l-2 border-l-amber-500' : ''
                  } ${t.unread ? 'font-medium' : ''}`}
                >
                  <div className="text-sm truncate text-gray-900">{threadTitle(t)}</div>
                  <div className="text-xs text-gray-500 truncate">{threadSubtitle(t)}</div>
                </button>
              ))
            )}
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            {selectedThreadKey ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-3 border-b border-gray-200 text-sm font-medium text-gray-900">
                  {selectedThread?.latest?.subject || 'Thread'}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {threadMessages.map((msg: any) => (
                    <div
                      key={msg._id}
                      className={`rounded-lg p-3 max-w-[85%] ${msg.direction === 'inbound' ? 'mr-auto bg-gray-100' : 'ml-auto bg-amber-50'}`}
                    >
                      <div className="text-xs text-gray-500 mb-1">
                        {msg.direction === 'inbound' ? msg.fromEmail : 'You'} · {msg.createdAt && new Date(msg.createdAt).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-900 font-medium">{msg.subject}</div>
                      <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{msg.body}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                Select a thread to view and reply.
              </div>
            )}

            {selectedThreadKey && (
              <form onSubmit={handleSend} className="p-4 border-t border-gray-200 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  {isDisputeThread(selectedThreadKey) ? 'Reply to dispute case' : 'Reply'}
                </h3>
                {isDisputeThread(selectedThreadKey) ? (
                  <div className="text-xs text-gray-500 mb-2">Your message will be visible to the warehouse and UnieWMS.</div>
                ) : (
                  <div className="text-xs text-gray-500 mb-2">To: {replyToEmail || '—'} · {replySubject || '—'}</div>
                )}
                <textarea
                  placeholder="Message"
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  rows={3}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm mb-2"
                />
                <button
                  type="submit"
                  disabled={sending || !composeBody.trim()}
                  className="rounded-lg bg-amber-500 text-white font-semibold px-4 py-2 hover:bg-amber-600 disabled:opacity-50 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {sending ? 'Sending…' : 'Reply'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

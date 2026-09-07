"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const API_URL = "https://personal-ai-assistant-2nno.onrender.com";

type Message = { role: "user" | "assistant"; content: string; time?: string };
type ConversationSummary = { id: string; title: string; updatedAt: string };
type MemoryItem = { id: string; content: string };
type Reminder = { id: string; text: string; at: number; done: boolean };

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtTime(iso?: string) {
  if (!iso) return "";
  try {
    const clean = iso.endsWith("Z") ? iso : iso + "Z";
    return new Date(clean).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [userName, setUserName] = useState("");
  const [ready, setReady] = useState(false);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [showMemory, setShowMemory] = useState(false);
  const [newMemory, setNewMemory] = useState("");
  const [attachedFile, setAttachedFile] = useState<{ name: string; text: string } | null>(null);
  const [attachedImage, setAttachedImage] = useState<{ preview: string; base64: string; mime: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [showReminders, setShowReminders] = useState(false);
  const [showAgent, setShowAgent] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [agentOutput, setAgentOutput] = useState("");
  const [portInput, setPortInput] = useState("5268");
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [reminderText, setReminderText] = useState("");
  const [reminderMins, setReminderMins] = useState("10");
  const [notifPerm, setNotifPerm] = useState<string>("default");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    setUserName(localStorage.getItem("name") || "");
    setReady(true);
    if ("Notification" in window) setNotifPerm(Notification.permission);
    const savedDark = localStorage.getItem("dark") === "true";
    setDark(savedDark);
    if (savedDark) document.documentElement.classList.add("dark");
    // Reminders localStorage se load karo
    try {
      const saved = localStorage.getItem("reminders");
      if (saved) setReminders(JSON.parse(saved));
    } catch {}
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reminders save karo jab badle
  useEffect(() => {
    if (ready) localStorage.setItem("reminders", JSON.stringify(reminders));
  }, [reminders, ready]);

  // Har 15 second me check karo koi reminder due hua ki nahi
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setReminders((prev) => {
        let changed = false;
        const updated = prev.map((r) => {
          if (!r.done && r.at <= now) {
            changed = true;
            fireNotification(r.text);
            return { ...r, done: true };
          }
          return r;
        });
        return changed ? updated : prev;
      });
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  function fireNotification(text: string) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Reminder", { body: text });
    } else {
      alert("Reminder: " + text);
    }
    // Aur ek beep-type awaaz bhi
    if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance("Reminder: " + text);
      u.lang = "hi-IN";
      window.speechSynthesis.speak(u);
    }
  }

  async function enableNotifications() {
    if (!("Notification" in window)) {
      alert("Your browser does not support notifications.");
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === "granted") {
      new Notification("Notifications ON!", { body: "Reminders will show here now." });
    }
  }

  function addReminder() {
    const text = reminderText.trim();
    const mins = parseInt(reminderMins);
    if (!text || isNaN(mins) || mins <= 0) return;
    const r: Reminder = {
      id: Math.random().toString(36).slice(2),
      text,
      at: Date.now() + mins * 60 * 1000,
      done: false,
    };
    setReminders((prev) => [...prev, r]);
    setReminderText("");
  }

  function deleteReminder(id: string) {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }

  function authHeaders() {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("name");
    router.push("/login");
  }

  function toggleDark() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("dark", String(next));
    if (next) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }

  async function agentSystem() {
    try {
      const res = await fetch(`${API_URL}/api/agent/system`, { headers: authHeaders() });
      if (res.status === 401) return logout();
      const data = await res.json();
      setAgentOutput(data.output);
    } catch { setAgentOutput("Could not connect to agent."); }
  }

  async function agentPort() {
    const p = parseInt(portInput);
    if (isNaN(p)) { setAgentOutput("Sahi port number daalo."); return; }
    try {
      const res = await fetch(`${API_URL}/api/agent/port/${p}`, { headers: authHeaders() });
      if (res.status === 401) return logout();
      const data = await res.json();
      setAgentOutput(data.output);
    } catch { setAgentOutput("Could not connect to agent."); }
  }

  async function agentLaunch(app: string) {
    try {
      const res = await fetch(`${API_URL}/api/agent/launch`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ app }),
      });
      if (res.status === 401) return logout();
      const data = await res.json();
      setAgentOutput(data.output);
    } catch { setAgentOutput("Could not connect to agent."); }
  }

  async function agentDisk() {
    try {
      const res = await fetch(`${API_URL}/api/agent/disk`, { headers: authHeaders() });
      if (res.status === 401) return logout();
      const data = await res.json();
      setAgentOutput(data.output);
    } catch { setAgentOutput("Could not connect to agent."); }
  }

  async function agentApps() {
    try {
      const res = await fetch(`${API_URL}/api/agent/apps`, { headers: authHeaders() });
      if (res.status === 401) return logout();
      const data = await res.json();
      setAgentOutput(data.output);
    } catch { setAgentOutput("Could not connect to agent."); }
  }

  async function loadConversations() {
    try {
      const res = await fetch(`${API_URL}/api/conversations`, { headers: authHeaders() });
      if (res.status === 401) return logout();
      setConversations(await res.json());
    } catch {}
  }

  async function loadMemories() {
    try {
      const res = await fetch(`${API_URL}/api/memories`, { headers: authHeaders() });
      if (res.status === 401) return logout();
      setMemories(await res.json());
    } catch {}
  }

  useEffect(() => {
    if (ready) { loadConversations(); loadMemories(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  async function addMemory() {
    const content = newMemory.trim();
    if (!content) return;
    try {
      const res = await fetch(`${API_URL}/api/memories`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ content }),
      });
      if (res.status === 401) return logout();
      setNewMemory("");
      loadMemories();
    } catch {}
  }

  async function deleteMemory(id: string) {
    try {
      const res = await fetch(`${API_URL}/api/memories/${id}`, { method: "DELETE", headers: authHeaders() });
      if (res.status === 401) return logout();
      loadMemories();
    } catch {}
  }

  async function openConversation(id: string) {
    try {
      const res = await fetch(`${API_URL}/api/conversations/${id}`, { headers: authHeaders() });
      if (res.status === 401) return logout();
      const data = await res.json();
      setConversationId(id);
      setMessages(data.messages.map((m: { role: string; content: string; createdAt: string }) => ({
        role: m.role, content: m.content, time: fmtTime(m.createdAt)
      })));
    } catch {}
  }

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this chat?")) return;
    try {
      const res = await fetch(`${API_URL}/api/conversations/${id}`, { method: "DELETE", headers: authHeaders() });
      if (res.status === 401) return logout();
      if (id === conversationId) { setConversationId(null); setMessages([]); }
      loadConversations();
    } catch {}
  }

  async function renameConversation(id: string, currentTitle: string, e: React.MouseEvent) {
    e.stopPropagation();
    const newTitle = prompt("New name:", currentTitle);
    if (!newTitle || !newTitle.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/conversations/${id}`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (res.status === 401) return logout();
      loadConversations();
    } catch {}
  }

  function newChat() {
    setConversationId(null);
    setMessages([]);
    setInput("");
    setAttachedFile(null);
    setAttachedImage(null);
  }

  function toggleListening() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Your browser does not support voice input. Use Chrome."); return; }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const recognition = new SR();
    recognition.lang = "hi-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      setInput(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  function speak(text: string, index: number) {
    if (!window.speechSynthesis) { alert("Your browser does not support text-to-speech."); return; }
    if (speakingIndex !== null) {
      window.speechSynthesis.cancel();
      if (speakingIndex === index) { setSpeakingIndex(null); return; }
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "hi-IN";
    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);
    window.speechSynthesis.speak(utterance);
    setSpeakingIndex(index);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/upload`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData,
      });
      if (res.status === 401) return logout();
      const data = await res.json();
      if (!res.ok) { alert(data.error || "File upload fail hui."); return; }
      setAttachedFile({ name: data.fileName, text: data.text });
    } catch {
      alert("File upload me dikkat aayi.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Image must be smaller than 5MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      setAttachedImage({ preview: result, base64, mime: file.type });
    };
    reader.readAsDataURL(file);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  async function sendMessage() {
    const text = input.trim();
    if ((!text && !attachedFile && !attachedImage) || loading) return;
    let fullMessage = text;
    let displayMessage = text;
    if (attachedFile) {
      fullMessage = `[File: ${attachedFile.name}]\n\n${attachedFile.text}\n\n---\n\n${text || "Is file ke baare me batao."}`;
      displayMessage = (text ? text + "\n\n" : "") + `?? ${attachedFile.name}`;
    }
    if (attachedImage) {
      displayMessage = (text ? text : "") + " ?? [Image]";
    }
    setInput("");
    const imgToSend = attachedImage;
    setAttachedFile(null);
    setAttachedImage(null);
    setMessages((prev) => [...prev,
      { role: "user", content: displayMessage, time: nowTime() },
      { role: "assistant", content: "", time: nowTime() }
    ]);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/chat/stream`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ message: fullMessage, conversationId, imageBase64: imgToSend?.base64 || null, imageMimeType: imgToSend?.mime || null }),
      });
      if (res.status === 401) return logout();
      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
const decoder = new TextDecoder();

let buffer = "";
let pendingText = "";
let renderScheduled = false;

const flushText = () => {
  if (!pendingText) return;

  const text = pendingText;
  pendingText = "";
  renderScheduled = false;

  setMessages((prev) => {
    const updated = [...prev];
    const last = updated[updated.length - 1];

    if (last && last.role === "assistant") {
      updated[updated.length - 1] = {
        ...last,
        content: last.content + text,
      };
    }

    return updated;
  });
};

const scheduleFlush = () => {
  if (renderScheduled) return;

  renderScheduled = true;

  requestAnimationFrame(flushText);
};

while (true) {
  const { done, value } = await reader.read();

  if (done) break;

  buffer += decoder.decode(value, { stream: true });

  const lines = buffer.split("\n\n");
  buffer = lines.pop() || "";

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed.startsWith("data:")) continue;

    const jsonStr = trimmed.substring("data:".length).trim();

    if (!jsonStr) continue;

    try {
      const data = JSON.parse(jsonStr);

      if (data.type === "meta") {
        setConversationId(data.conversationId);
      }

      else if (data.type === "chunk") {
        pendingText += data.text;
        scheduleFlush();
      }
    }
    catch {
      // Ignore incomplete SSE JSON chunks.
    }
  }
}

// Make sure the final pending text is rendered.
flushText();
      loadConversations();
    } catch (err) {
      const msg = err instanceof TypeError
        ? "Cannot connect to server. Is the backend running?"
        : "Something went wrong. Please try again.";
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant" && last.content === "") {
          updated[updated.length - 1] = { ...last, content: msg };
        }
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (!file) continue;
        if (file.size > 5 * 1024 * 1024) { alert("Image must be smaller than 5MB."); return; }
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(",")[1];
          setAttachedImage({ preview: result, base64, mime: file.type });
        };
        reader.readAsDataURL(file);
        e.preventDefault();
        return;
      }
    }
  }

  if (!ready) {
    return <div className="flex items-center justify-center h-screen text-slate-400 bg-slate-950">Loading...</div>;
  }

  const initial = userName ? userName.charAt(0).toUpperCase() : "U";
  const pendingReminders = reminders.filter((r) => !r.done);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-slate-100">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`
          fixed md:relative
          inset-y-0 left-0
          z-50
          w-72
          bg-slate-950
          text-slate-100
          flex flex-col
          overflow-hidden
          shrink-0
          transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        <div className="p-4">
          <button
            onClick={() => { newChat(); if (window.innerWidth < 768) setSidebarOpen(false); }}
            className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl px-4 py-2.5 font-medium transition"
          >
            <span className="text-lg leading-none">+</span> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3">
          <div className="text-xs font-medium text-slate-500 px-2 py-2 uppercase tracking-wider">History</div>
          {conversations.length === 0 && (
            <div className="text-slate-600 text-sm px-2 py-4">No chats yet</div>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => { openConversation(c.id); if (window.innerWidth < 768) setSidebarOpen(false); }}
              className={`group flex items-center justify-between rounded-lg px-3 py-2.5 mb-1 text-sm cursor-pointer transition ${
                c.id === conversationId ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-900"
              }`}
            >
              <span className="truncate flex-1">{c.title || "Untitled"}</span>
              <button
                onClick={(e) => renameConversation(c.id, c.title, e)}
                className="ml-2 text-xs text-slate-500 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition"
                title="Rename"
              >
                Edit
              </button>
              <button
                onClick={(e) => deleteConversation(c.id, e)}
                className="ml-2 text-xs text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                title="Delete"
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        {/* Reminders */}
        <button
          onClick={() => setShowReminders(!showReminders)}
          className="mx-3 mt-2 text-left text-xs font-medium text-slate-400 hover:text-white px-2 py-2 flex items-center justify-between transition"
        >
          <span className="uppercase tracking-wider">Reminders ({pendingReminders.length})</span>
          <span>{showReminders ? "\u25B2" : "\u25BC"}</span>
        </button>

        {showReminders && (
          <div className="mx-3 mb-2 bg-slate-900 rounded-xl p-3 max-h-64 overflow-y-auto">
            {notifPerm !== "granted" && (
              <button
                onClick={enableNotifications}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-lg px-2 py-1.5 mb-2 transition"
              >
                Enable notifications
              </button>
            )}
            <input
              value={reminderText}
              onChange={(e) => setReminderText(e.target.value)}
              placeholder="What to remind you..."
              className="w-full bg-slate-800 text-sm text-white rounded-lg px-2 py-1.5 mb-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div className="flex gap-1 mb-2">
              <input
                type="number"
                value={reminderMins}
                onChange={(e) => setReminderMins(e.target.value)}
                className="w-16 bg-slate-800 text-sm text-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-slate-400 text-xs self-center">min later</span>
              <button onClick={addReminder} className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg px-2 text-sm transition">Set</button>
            </div>
            {pendingReminders.length === 0 && (
              <div className="text-slate-600 text-xs px-1 py-2">No reminders.</div>
            )}
            {pendingReminders.map((r) => (
              <div key={r.id} className="group flex items-start justify-between gap-2 text-xs text-slate-300 py-1.5 border-b border-slate-800 last:border-0">
                <div className="flex-1">
                  <div>{r.text}</div>
                  <div className="text-slate-500">{new Date(r.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                <button onClick={() => deleteReminder(r.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition shrink-0">x</button>
              </div>
            ))}
          </div>
        )}        {/* Windows Agent */}
        <button
          onClick={() => setShowAgent(!showAgent)}
          className="mx-3 mb-2 text-left text-xs font-medium text-slate-400 hover:text-white px-2 py-2 flex items-center justify-between transition"
        >
          <span className="uppercase tracking-wider">PC Agent</span>
          <span>{showAgent ? "\u25B2" : "\u25BC"}</span>
        </button>

        {showAgent && (
          <div className="mx-3 mb-2 bg-slate-900 rounded-xl p-3 max-h-72 overflow-y-auto">
            <button onClick={agentSystem} className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg px-2 py-1.5 mb-2 transition text-left">
              System Info dekho
            </button>
            <div className="flex gap-1 mb-2">
              <button onClick={agentDisk} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg px-2 py-1.5 transition">Disk Space</button>
              <button onClick={agentApps} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg px-2 py-1.5 transition">Running Apps</button>
            </div>
            <div className="flex gap-1 mb-2">
              <input
                value={portInput}
                onChange={(e) => setPortInput(e.target.value)}
                placeholder="Port"
                className="w-16 bg-slate-800 text-xs text-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button onClick={agentPort} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg px-2 transition">Port check</button>
            </div>
            <div className="flex gap-1 mb-2">
              <button onClick={() => agentLaunch("notepad")} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg px-1 py-1.5 transition">Notepad</button>
              <button onClick={() => agentLaunch("calc")} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg px-1 py-1.5 transition">Calc</button>
              <button onClick={() => agentLaunch("paint")} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg px-1 py-1.5 transition">Paint</button>
            </div>
            <div className="flex gap-1 mb-2">
              <button onClick={() => agentLaunch("chrome")} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg px-1 py-1.5 transition">Chrome</button>
              <button onClick={() => agentLaunch("explorer")} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg px-1 py-1.5 transition">Files</button>
              <button onClick={() => agentLaunch("settings")} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg px-1 py-1.5 transition">Settings</button>
            </div>
            <div className="flex gap-1 mb-2">
              <button onClick={() => agentLaunch("visualstudio")} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg px-1 py-1.5 transition">Visual Studio</button>
              <button onClick={() => agentLaunch("word")} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg px-1 py-1.5 transition">Word</button>
              <button onClick={() => agentLaunch("excel")} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg px-1 py-1.5 transition">Excel</button>
            </div>
            <div className="flex gap-1 mb-2">
              <button onClick={() => agentLaunch("taskmanager")} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg px-1 py-1.5 transition">Task Mgr</button>
              <button onClick={() => agentLaunch("cmd")} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg px-1 py-1.5 transition">CMD</button>
            </div>
            {agentOutput && (
              <pre className="text-xs text-slate-300 bg-slate-950 rounded-lg p-2 whitespace-pre-wrap break-words">{agentOutput}</pre>
            )}
          </div>
        )}


        <button
          onClick={() => setShowMemory(!showMemory)}
          className="mx-3 mb-2 text-left text-xs font-medium text-slate-400 hover:text-white px-2 py-2 flex items-center justify-between transition"
        >
          <span className="uppercase tracking-wider">Memory ({memories.length})</span>
          <span>{showMemory ? "\u25B2" : "\u25BC"}</span>
        </button>

        {showMemory && (
          <div className="mx-3 mb-3 bg-slate-900 rounded-xl p-3 max-h-64 overflow-y-auto">
            <div className="flex gap-1 mb-2">
              <input
                value={newMemory}
                onChange={(e) => setNewMemory(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addMemory(); }}
                placeholder="What should the AI remember..."
                className="flex-1 bg-slate-800 text-sm text-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-w-0"
              />
              <button onClick={addMemory} className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg px-3 text-sm transition">Add</button>
            </div>
            {memories.length === 0 && (
              <div className="text-slate-600 text-xs px-1 py-2">Nothing saved. Add above.</div>
            )}
            {memories.map((m) => (
              <div key={m.id} className="group flex items-start justify-between gap-2 text-xs text-slate-300 py-1.5 border-b border-slate-800 last:border-0">
                <span className="flex-1">{m.content}</span>
                <button onClick={() => deleteMemory(m.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition shrink-0">x</button>
              </div>
            ))}
          </div>
        )}

        <div className="p-4 border-t border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold text-sm">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{userName}</div>
            <button onClick={logout} className="text-xs text-slate-500 hover:text-slate-300 transition">Logout</button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-900">
        <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur border-b border-slate-200 dark:border-slate-700 px-3 sm:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg p-1.5 transition"
            title={sidebarOpen ? "Sidebar chhupao" : "Sidebar kholo"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 tracking-tight flex-1">Personal AI Assistant</h1>
          <button
            onClick={toggleDark}
            className="text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg p-1.5 transition"
            title="Dark mode"
          >
            {dark ? "\u2600" : "\u263D"}
          </button>
        </header>

        <main className="flex-1 min-w-0 overflow-y-auto px-3 sm:px-4 py-5 sm:py-8">
          <div className="w-full max-w-3xl mx-auto space-y-4 sm:space-y-6">
            {messages.length === 0 && (
              <div className="text-center mt-16 sm:mt-24 px-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500 text-white text-2xl font-bold mb-4 shadow-lg shadow-indigo-500/20">A</div>
                <p className="text-slate-800 text-base sm:text-lg font-medium">Hello {userName}!</p>
                <p className="text-slate-500 mt-1 px-4 text-sm sm:text-base break-words">Type a message, upload a file, or set a reminder.</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 sm:gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                  msg.role === "user" ? "bg-indigo-500 text-white" : "bg-slate-800 text-white"
                }`}>
                  {msg.role === "user" ? initial : "A"}
                </div>
                <div className={`flex flex-col max-w-[88%] sm:max-w-[75%] min-w-0 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base leading-relaxed break-words overflow-hidden ${
                    msg.role === "user"
                      ? "bg-indigo-500 text-white rounded-tr-sm whitespace-pre-wrap"
                      : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-sm shadow-sm"
                  }`}>
                    {msg.role === "assistant" ? (
                      msg.content ? (
                        <div className="markdown-body">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              code({ inline, className, children, ...props }: any) {
                                const match = /language-(\w+)/.exec(className || "");
                                if (!inline && match) {
                                  return (
                                    <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div">
                                      {String(children).replace(/\n$/, "")}
                                    </SyntaxHighlighter>
                                  );
                                }
                                return <code className={className} {...props}>{children}</code>;
                              },
                            }}
                          >{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        loading && i === messages.length - 1
                          ? <span className="inline-flex gap-1"><span className="animate-pulse">.</span><span className="animate-pulse">.</span><span className="animate-pulse">.</span></span>
                          : ""
                      )
                    ) : (
                      msg.content
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 px-1">
                    {msg.time && <span className="text-xs text-slate-400">{msg.time}</span>}
                    {msg.role === "assistant" && msg.content && (
                      <button
                        onClick={() => speak(msg.content, i)}
                        className="text-xs text-slate-400 hover:text-indigo-500 transition"
                        title="Sun-ne ke liye"
                      >
                        {speakingIndex === i ? "?? Stop" : "?? Sun"}
                      </button>
                    )}
                    {msg.role === "assistant" && msg.content && (
                      <button
                        onClick={() => { navigator.clipboard.writeText(msg.content); }}
                        className="text-xs text-slate-400 hover:text-indigo-500 transition"
                        title="Copy"
                      >
                        Copy
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </main>

        <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-2 sm:px-4 py-2 sm:py-4">
          <div className="max-w-3xl mx-auto">
            {attachedFile && (
              <div className="flex items-center gap-2 mb-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-sm text-indigo-700 w-fit">
                <span>?? {attachedFile.name}</span>
                <button onClick={() => setAttachedFile(null)} className="text-indigo-400 hover:text-red-500">x</button>
              </div>
            )}
            {attachedImage && (
              <div className="flex items-center gap-2 mb-2 bg-indigo-50 dark:bg-slate-700 border border-indigo-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-indigo-700 dark:text-slate-200 w-fit">
                <img src={attachedImage.preview} alt="preview" className="w-10 h-10 object-cover rounded" />
                <span>Image</span>
                <button onClick={() => setAttachedImage(null)} className="text-indigo-400 hover:text-red-500">x</button>
              </div>
            )}
            <div className="grid grid-cols-[auto_auto_auto_1fr_auto] sm:flex gap-1.5 sm:gap-2 items-end min-w-0">
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.txt,.md,.csv" className="hidden" />
              <input type="file" ref={imageInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="border border-slate-300 rounded-xl px-3 sm:px-4 py-3 text-slate-600 hover:bg-slate-100 transition disabled:opacity-50 shrink-0" title="Attach file">
                <svg
  className="w-5 h-5"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
  strokeLinecap="round"
  strokeLinejoin="round"
>
  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
  <polyline points="14 2 14 8 20 8" />
  <line x1="8" y1="13" x2="16" y2="13" />
  <line x1="8" y1="17" x2="16" y2="17" />
</svg>
              </button>
              <button onClick={() => imageInputRef.current?.click()} className="border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition" title="Attach image">
                <svg
  className="w-5 h-5"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
  strokeLinecap="round"
  strokeLinejoin="round"
>
  <rect x="3" y="3" width="18" height="18" rx="2" />
  <circle cx="8.5" cy="8.5" r="1.5" />
  <polyline points="21 15 16 10 5 21" />
</svg>
              </button>
              <button onClick={toggleListening} className={`border rounded-xl px-4 py-3 transition ${listening ? "bg-red-500 border-red-500 text-white animate-pulse" : "border-slate-300 text-slate-600 hover:bg-slate-100"}`} title="Speak to type"><svg
  className="w-5 h-5"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
  strokeLinecap="round"
  strokeLinejoin="round"
>
  <rect x="9" y="2" width="6" height="13" rx="3" />
  <path d="M5 10a7 7 0 0 0 14 0" />
  <line x1="12" y1="17" x2="12" y2="22" />
  <line x1="8" y1="22" x2="16" y2="22" />
</svg></button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={listening ? "Listening... speak now" : "Type a message..."}
                rows={1}
                className="flex-1 min-w-0 resize-none rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent max-h-40"
              />
              <button
                onClick={sendMessage}
                disabled={loading || (!input.trim() && !attachedFile && !attachedImage)}
                className="bg-indigo-500 text-white rounded-xl px-4 sm:px-6 py-3 font-medium hover:bg-indigo-600 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                Send
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}







































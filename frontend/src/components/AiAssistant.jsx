import { useState, useRef, useEffect } from "react";
import { FiMessageSquare, FiX, FiSend, FiZap, FiUser } from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import { Link } from "react-router-dom";

export default function AiAssistant() {
  const { user } = useAuth();
  const token = localStorage.getItem("access_token");
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I am Rentlora's AI Concierge. How can I help you today? You can search for properties, check your current bookings, or ask me to make a booking!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    // Format history as expected by Bedrock backend
    // Backend expects ChatRequest: { message: str, history: [{role: str, content: str}] }
    const formattedHistory = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const headers = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: userMessage,
          history: formattedHistory,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get agent response");
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          properties: data.properties,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I ran into an error connecting to the AI service. Please check your credentials or try again later.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
        >
          <FiMessageSquare size={24} className="group-hover:rotate-12 transition-transform duration-200" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 font-medium text-sm whitespace-nowrap transition-all duration-300">
            Ask AI Assistant
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[380px] sm:w-[420px] h-[550px] bg-white rounded-2xl border border-indigo-100 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-200">
          {/* Header */}
          <div className="bg-indigo-600 px-5 py-4 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FiZap className="text-amber-300 fill-amber-300 animate-pulse" />
              <div>
                <h3 className="font-bold text-sm">Rentlora AI Concierge</h3>
                <p className="text-xs text-indigo-200">Online & Ready to Help</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-indigo-200 hover:text-white transition-colors"
            >
              <FiX size={20} />
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-tr-none"
                      : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                  }`}
                >
                  {msg.content}
                </div>

                {/* Property recommendations rendering */}
                {msg.properties && msg.properties.length > 0 && (
                  <div className="w-full mt-3 grid grid-cols-1 gap-3">
                    {msg.properties.map((prop) => (
                      <div
                        key={prop.id}
                        className="bg-white rounded-xl border border-indigo-50 shadow-sm overflow-hidden flex hover:border-indigo-200 transition-all hover:shadow-md"
                      >
                        {prop.first_image ? (
                          <img
                            src={prop.first_image}
                            alt={prop.title}
                            className="w-24 h-24 object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-24 h-24 bg-indigo-50 flex items-center justify-center text-indigo-300 flex-shrink-0">
                            <FiUser size={24} />
                          </div>
                        )}
                        <div className="p-3 flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <h4 className="font-bold text-xs text-slate-800 truncate">
                              {prop.title}
                            </h4>
                            <p className="text-[10px] text-slate-500 truncate">
                              {prop.city}, {prop.country}
                            </p>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs font-extrabold text-indigo-600">
                              ${prop.price_per_night}/night
                            </span>
                            <Link
                              to={`/property/${prop.id}`}
                              onClick={() => setIsOpen(false)}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] py-1 px-3.5 rounded-lg transition-colors"
                            >
                              View Details
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-start space-x-2">
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-slate-500 shadow-sm flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce duration-300" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce duration-300" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce duration-300" style={{ animationDelay: "300ms" }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer input form */}
          <form
            onSubmit={handleSend}
            className="border-t border-slate-100 p-3 bg-white flex items-center space-x-2"
          >
            <input
              type="text"
              placeholder={user ? "Type your message..." : "Please log in to book properties..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none text-sm py-2.5 px-4 rounded-xl transition-all"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl p-2.5 shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSend size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

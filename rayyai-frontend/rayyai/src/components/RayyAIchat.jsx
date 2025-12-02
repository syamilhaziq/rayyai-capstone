import React, { useState, useEffect, useRef } from "react";
import {
    MessageSquare,
    Send,
    Paperclip,
    Bot,
    User,
    X,
    Sparkles,
    Upload,
    Star,
    Target,
    CreditCard,
    PieChart,
    BarChart3,
    Minimize2,
    Plus,
    Trash2,
    Clock,
    Edit2,
    Check,
    Copy,
    Hand,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { chatApi } from "../services/api";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";

export default function RayyAIAssistant({ isCollapsed = false }) {
    const navigate = useNavigate();
    
    // Get user name from localStorage
    const [userName, setUserName] = useState('User');
    
    useEffect(() => {
        const getUserName = () => {
            try {
                const userStr = localStorage.getItem("user");
                if (userStr) {
                    const user = JSON.parse(userStr);
                    return user.first_name || user.firstName || user.full_name?.split(' ')[0] || 'User';
                }
            } catch (error) {
                console.error("Error parsing user data:", error);
            }
            return 'User';
        };
        
        setUserName(getUserName());
        
        // Listen for storage changes (e.g., when user logs in/out)
        const handleStorageChange = () => {
            setUserName(getUserName());
        };
        
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);
    const [conversations, setConversations] = useState([]);
    const [currentConversationId, setCurrentConversationId] = useState(null);
    const [isLoadingConversations, setIsLoadingConversations] = useState(false);
    // Tab system state
    const [tabs, setTabs] = useState([]);
    const [activeTabId, setActiveTabId] = useState(null);

    // Tab-specific states - each tab has its own messages, loading, error, etc.
    const [tabStates, setTabStates] = useState({});
    // Structure: { [tabId]: { messages: [], isTyping: false, isLoadingMessages: false, error: null, uploadedFiles: [], currentMessage: "", requestController: null } }

    const [showHistory, setShowHistory] = useState(true);
    const [renamingTabId, setRenamingTabId] = useState(null);
    const [renameValue, setRenameValue] = useState("");
    const [deleteDialog, setDeleteDialog] = useState({
        open: false,
        conversationId: null,
        title: "",
    });
    const [isDeletingConversation, setIsDeletingConversation] = useState(false);
    const [deleteDialogError, setDeleteDialogError] = useState("");
    const hasHydratedTabsRef = useRef(false);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editingMessageContent, setEditingMessageContent] = useState("");
    const [messageActionLoading, setMessageActionLoading] = useState(false);
    const [messageActionError, setMessageActionError] = useState("");
    const [copiedMessageId, setCopiedMessageId] = useState(null);
    
    // Ref for messages container to enable auto-scroll
    const messagesEndRef = React.useRef(null);
    const messagesContainerRef = React.useRef(null);
    
    // Ref to store handleSendMessage function for auto-send functionality
    const handleSendMessageRef = React.useRef(null);
    
    const mapMessageResponse = React.useCallback((msg) => {
        if (!msg) {
            return null;
        }

        const messageId = msg.message_id ?? msg.messageId ?? null;
        const role = msg.role || (msg.type === "ai" ? "assistant" : "user");
        const createdAt = msg.created_at || msg.timestamp || new Date().toISOString();

        return {
            id: messageId ? messageId.toString() : `${role}-${createdAt}`,
            messageId,
            type: role === "assistant" ? "ai" : "user",
            role,
            content: msg.content || "",
            timestamp: new Date(createdAt),
            updatedAt: msg.updated_at ? new Date(msg.updated_at) : null,
            metadata: msg.metadata || msg.metadata_json,
            attachments: msg.attachments || [],
        };
    }, []);

    // Helper function to get default welcome message
    const getWelcomeMessage = () => ({
        id: "1",
        type: "ai",
        role: "assistant",
        content: "Hey there, I'm RayyAI! If you have any questions or need assistance, you can always chat with me and I'll be happy to help!",
        timestamp: new Date(),
    });

    // Helper function to initialize tab state
    const initializeTabState = (tabId) => {
        setTabStates(prev => ({
            ...prev,
            [tabId]: {
                messages: [getWelcomeMessage()],
                isTyping: false,
                isLoadingMessages: false,
                error: null,
                uploadedFiles: [],
                currentMessage: "",
                requestController: null
            }
        }));
    };

    // Helper function to update tab state
    const updateTabState = (tabId, updates) => {
        setTabStates(prev => ({
            ...prev,
            [tabId]: {
                ...prev[tabId],
                ...updates
            }
        }));
    };

    // Helper function to get current tab state
    const getCurrentTabState = () => {
        if (!activeTabId || !tabStates[activeTabId]) {
            return {
                messages: [getWelcomeMessage()],
                isTyping: false,
                isLoadingMessages: false,
                error: null,
                uploadedFiles: [],
                currentMessage: "",
                requestController: null
            };
        }
        return tabStates[activeTabId];
    };

    // Helper function to remove tab state (cleanup)
    const removeTabState = (tabId) => {
        setTabStates(prev => {
            const newStates = { ...prev };
            delete newStates[tabId];
            return newStates;
        });
    };

    const [isExpanded, setIsExpanded] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [wasMinimized, setWasMinimized] = useState(false);

    // Drag functionality state
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [hasDragged, setHasDragged] = useState(false);

    // Separate positions for minimized button and full chat
    const [minimizedPosition, setMinimizedPosition] = useState({
        x: 0,
        y: 0,
    });
    const [fullChatPosition, setFullChatPosition] = useState({
        x: 0,
        y: 0,
    });

    const formatMessageTimestamp = React.useCallback((value) => {
        if (!value) {
            return "";
        }

        const messageDate = new Date(value);
        if (Number.isNaN(messageDate.getTime())) {
            return "";
        }

        const now = new Date();
        const today = now.toDateString();
        const messageDay = messageDate.toDateString();

        let dayLabel;
        if (messageDay === today) {
            dayLabel = "Today";
        } else {
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);

            if (messageDay === yesterday.toDateString()) {
                dayLabel = "Yesterday";
            } else {
                dayLabel = messageDate.toLocaleDateString([], {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                });
            }
        }

        const hours24 = messageDate.getHours();
        const minutes = messageDate.getMinutes();
        const formattedHour = String(hours24).padStart(2, "0");
        const formattedMinute = String(minutes).padStart(2, "0");
        const amPm = hours24 >= 12 ? "PM" : "AM";
        const timeString = `${formattedHour}.${formattedMinute} ${amPm}`;

        return `${dayLabel} at ${timeString}`;
    }, []);

    // Calculate initial position for minimized button (right side of screen)
    const getInitialMinimizedPosition = () => {
        const screenWidth =
            typeof window !== "undefined" ? window.innerWidth : 1920;
        const buttonSize = 64;
        const marginFromEdge = 24;
        const cashFlowHeight = 100 + 17 + 24 + 6 * 44 + 22;

        return {
            x: screenWidth - buttonSize - marginFromEdge,
            y: cashFlowHeight,
        };
    };

    // Calculate center position for full chat
    const getCenterPosition = () => {
        const screenWidth =
            typeof window !== "undefined" ? window.innerWidth : 1920;
        const chatWidth = 1152;

        return {
            x: Math.max(0, (screenWidth - chatWidth) / 2),
            y: 8,
        };
    };

    // Load conversations and restore tabs from localStorage on mount
    useEffect(() => {
        if (!isExpanded) return;

        loadConversations();

        if (hasHydratedTabsRef.current) {
            return;
        }

        const savedTabsRaw = localStorage.getItem('rayyai-chat-tabs');
        const savedActiveTabId = localStorage.getItem('rayyai-active-tab-id');
        const savedConversationId = localStorage.getItem('rayyai-current-conversation-id');

        if (savedTabsRaw) {
            try {
                const parsed = JSON.parse(savedTabsRaw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setTabs(parsed);

                    // Initialize tab states for all restored tabs
                    parsed.forEach(tab => {
                        initializeTabState(tab.id);
                    });

                    const fallbackTabId =
                        savedActiveTabId && parsed.some((t) => t.id === savedActiveTabId)
                            ? savedActiveTabId
                            : parsed[parsed.length - 1]?.id;

                    if (fallbackTabId) {
                        setActiveTabId(fallbackTabId);
                        const targetTab = parsed.find((t) => t.id === fallbackTabId);
                        if (targetTab && targetTab.conversationId) {
                            setCurrentConversationId(targetTab.conversationId);
                        }
                    }
                }
            } catch (e) {
                console.error('Error restoring tabs:', e);
            }
        } else if (savedConversationId) {
            const parsedId = parseInt(savedConversationId, 10);
            if (!Number.isNaN(parsedId)) {
                setCurrentConversationId(parsedId);
            }
        }

        // If no tabs were restored, create a default welcome tab
        if (!savedTabsRaw || savedTabsRaw === '[]') {
            addTab(null, "New Chat");
        }

        hasHydratedTabsRef.current = true;
    }, [isExpanded]);

    // Save tabs to localStorage whenever they change
    useEffect(() => {
        if (tabs.length > 0) {
            localStorage.setItem('rayyai-chat-tabs', JSON.stringify(tabs));
        } else {
            localStorage.removeItem('rayyai-chat-tabs');
        }
    }, [tabs]);

    useEffect(() => {
        if (activeTabId) {
            localStorage.setItem('rayyai-active-tab-id', activeTabId);
        } else {
            localStorage.removeItem('rayyai-active-tab-id');
        }
    }, [activeTabId]);

    useEffect(() => {
        if (currentConversationId) {
            localStorage.setItem('rayyai-current-conversation-id', String(currentConversationId));
        } else {
            localStorage.removeItem('rayyai-current-conversation-id');
        }
    }, [currentConversationId]);

    // Sync active tab with current conversation
    useEffect(() => {
        if (activeTabId) {
            const tab = tabs.find(t => t.id === activeTabId);
            if (tab && tab.conversationId !== currentConversationId) {
                setCurrentConversationId(tab.conversationId);
                if (tab.conversationId) {
                    loadMessages(tab.conversationId, activeTabId);
                }
                // No need to set welcome message - tab state already initialized
            }
        }
    }, [activeTabId, tabs, currentConversationId]);

    // Load messages when conversation changes
    useEffect(() => {
        if (currentConversationId) {
            const existingTab = tabs.find(t => t.conversationId === currentConversationId);
            if (!existingTab) {
                // Auto-create tab for conversation
                const conv = conversations.find(c => c.conversation_id === currentConversationId);
                if (conv) {
                    addTab(conv.conversation_id, conv.title || "New Chat");
                }
            }
            loadMessages(currentConversationId);
        }
    }, [currentConversationId]);

    // Auto-scroll to bottom when messages change or typing starts
    useEffect(() => {
        if (!isExpanded || !activeTabId) return;

        const scrollToBottom = () => {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'end'
                });
            }
        };

        scrollToBottom();
        const timer = setTimeout(scrollToBottom, 100);

        return () => clearTimeout(timer);
    }, [activeTabId, tabStates, isExpanded]);

    // Auto-focus input when chat is expanded
    useEffect(() => {
        if (isExpanded) {
            // Small delay to ensure modal is fully rendered
            const timer = setTimeout(() => {
                const input = document.getElementById("chat-message-input");
                if (input) {
                    input.focus();
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isExpanded]);

    // Tab management functions
    const addTab = (conversationId, title = "New Chat") => {
        const newTab = {
            id: `tab-${Date.now()}`,
            conversationId,
            title,
            isNew: !conversationId,
            createdAt: new Date().toISOString()
        };

        // Initialize tab-specific state
        initializeTabState(newTab.id);

        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.id);

        if (conversationId) {
            setCurrentConversationId(conversationId);
            loadMessages(conversationId, newTab.id);
        } else {
            setCurrentConversationId(null);
        }
        return newTab;
    };

    const closeTab = (tabId) => {
        // Cancel any pending requests for this tab
        const tabState = tabStates[tabId];
        if (tabState?.requestController) {
            tabState.requestController.abort();
        }

        // Cleanup tab state
        removeTabState(tabId);

        setTabs(prev => {
            const filtered = prev.filter(t => t.id !== tabId);
            if (activeTabId === tabId) {
                if (filtered.length > 0) {
                    // Switch to another tab
                    const nextTab = filtered[0];
                    setActiveTabId(nextTab.id);
                    if (nextTab.conversationId) {
                        setCurrentConversationId(nextTab.conversationId);
                        loadMessages(nextTab.conversationId, nextTab.id);
                    } else {
                        setCurrentConversationId(null);
                    }
                } else {
                    // No tabs left
                    setActiveTabId(null);
                    setCurrentConversationId(null);
                }
            }
            return filtered;
        });
    };

    const updateTabTitle = async (tabId, newTitle) => {
        const tab = tabs.find(t => t.id === tabId);
        if (!tab || !tab.conversationId) return;
        
        try {
            await chatApi.updateConversation(tab.conversationId, newTitle);
            setTabs(prev => prev.map(t => 
                t.id === tabId ? { ...t, title: newTitle } : t
            ));
            loadConversations(); // Refresh list
        } catch (err) {
            console.error("Error updating title:", err);
        }
    };

    const openConversationInTab = (conversationId, title) => {
        const existingTab = tabs.find(t => t.conversationId === conversationId);
        if (existingTab) {
            setActiveTabId(existingTab.id);
        } else {
            addTab(conversationId, title);
        }
    };

    const handleDeleteConversation = (conversation, e) => {
        e.stopPropagation(); // Prevent opening the conversation when clicking delete
        setDeleteDialog({
            open: true,
            conversationId: conversation.conversation_id,
            title: conversation.title || "this conversation",
        });
        setDeleteDialogError("");
    };

    const cancelDeleteConversation = () => {
        if (isDeletingConversation) return;
        setDeleteDialog({
            open: false,
            conversationId: null,
            title: "",
        });
        setDeleteDialogError("");
    };

    const confirmDeleteConversation = async () => {
        if (!deleteDialog.conversationId || isDeletingConversation) return;

        setIsDeletingConversation(true);
        setDeleteDialogError("");

        const conversationId = deleteDialog.conversationId;

        try {
            await chatApi.deleteConversation(conversationId);

            // Remove the tab if it exists
            const tabToRemove = tabs.find(
                (t) => t.conversationId === conversationId
            );
            if (tabToRemove) {
                closeTab(tabToRemove.id);
            }

            // If this was the current conversation, clear it
            if (currentConversationId === conversationId) {
                setCurrentConversationId(null);
                // Reset active tab's messages to welcome message
                if (activeTabId) {
                    updateTabState(activeTabId, {
                        messages: [getWelcomeMessage()]
                    });
                }
            }

            // Refresh conversations list
            await loadConversations();

            setDeleteDialog({
                open: false,
                conversationId: null,
                title: "",
            });
        } catch (err) {
            console.error("Error deleting conversation:", err);
            setDeleteDialogError(
                err?.message || "Failed to delete conversation. Please try again."
            );
            setError("Failed to delete conversation");
        } finally {
            setIsDeletingConversation(false);
        }
    };

    const loadConversations = async () => {
        setIsLoadingConversations(true);
        try {
            const response = await chatApi.getConversations({ limit: 50 });
            setConversations(response.conversations || []);
        } catch (err) {
            console.error("Error loading conversations:", err);
            setError("Failed to load conversations");
        } finally {
            setIsLoadingConversations(false);
        }
    };

    const loadMessages = async (conversationId, targetTabId = activeTabId) => {
        if (!targetTabId) return;

        // Set loading state
        updateTabState(targetTabId, { isLoadingMessages: true, error: null });

        try {
            const messagesData = await chatApi.getMessages(conversationId);
            const formattedMessages = messagesData
                .map((msg) => mapMessageResponse(msg))
                .filter(Boolean);

            // Update specific tab's messages
            updateTabState(targetTabId, {
                messages: formattedMessages,
                isLoadingMessages: false
            });
        } catch (err) {
            console.error("Error loading messages:", err);
            updateTabState(targetTabId, {
                error: "Failed to load messages",
                isLoadingMessages: false
            });
        }
    };

    const startEditingMessage = (message) => {
        if (!message || message.type !== "user" || !message.messageId) {
            return;
        }
        setEditingMessageId(message.messageId);
        setEditingMessageContent(message.content || "");
        setMessageActionError("");
    };

    const cancelEditingMessage = () => {
        if (messageActionLoading) return;
        setEditingMessageId(null);
        setEditingMessageContent("");
        setMessageActionError("");
    };

    const saveEditedMessage = async () => {
        if (!editingMessageId || messageActionLoading) return;

        const trimmedContent = editingMessageContent.trim();
        if (!trimmedContent) {
            setMessageActionError("Message cannot be empty.");
            return;
        }

        const tabState = getCurrentTabState();
        const messageIndex = tabState.messages.findIndex(
            (msg) => msg.messageId === editingMessageId
        );

        if (messageIndex === -1) {
            setMessageActionError("Could not locate the message to edit.");
            return;
        }

        if (!currentConversationId) {
            setMessageActionError("No active conversation found.");
            return;
        }

        setMessageActionLoading(true);
        setMessageActionError("");
        const messagesToRemove = tabState.messages.slice(messageIndex);

        try {
            for (const msg of messagesToRemove) {
                if (msg?.messageId) {
                    await chatApi.deleteMessage(msg.messageId);
                }
            }

            // Update tab state with messages up to the edit point
            if (activeTabId) {
                updateTabState(activeTabId, {
                    messages: tabState.messages.slice(0, messageIndex)
                });
            }
            setEditingMessageId(null);
            setEditingMessageContent("");

            await handleSendMessage(trimmedContent);
        } catch (err) {
            console.error("Failed to re-prompt after editing message:", err);
            setMessageActionError(
                err?.message || "Failed to re-run the edited message."
            );
        } finally {
            setMessageActionLoading(false);
        }
    };

    const copyMessageToClipboard = async (message) => {
        if (!message?.content) return;
        try {
            await navigator.clipboard.writeText(message.content);
            setCopiedMessageId(message.messageId || message.id);
            setTimeout(() => setCopiedMessageId(null), 2000);
        } catch (err) {
            console.error("Failed to copy message:", err);
            setMessageActionError("Unable to copy message. Please try again.");
        }
    };

    const stopGenerating = () => {
        if (!activeTabId) return;
        const tabState = getCurrentTabState();
        if (tabState.requestController) {
            tabState.requestController.abort();
            updateTabState(activeTabId, {
                requestController: null,
                isTyping: false,
                error: "Generation stopped."
            });
        }
    };

    const handleNewConversation = async () => {
        try {
            // Create a new tab immediately (don't wait for API)
            const newTab = addTab(null, "New Chat");
            // Don't create conversation on backend yet - wait until first message
        } catch (err) {
            console.error("Error creating conversation:", err);
            setError("Failed to create new conversation");
        }
    };

    const handleSendMessage = React.useCallback(async (overrideMessage = null) => {
        if (!activeTabId) return;

        const tabState = getCurrentTabState();
        const baseMessage = overrideMessage !== null ? overrideMessage : tabState.currentMessage;
        if (!baseMessage.trim() && tabState.uploadedFiles.length === 0) return;

        // Allow sending files even without message text (AI will acknowledge the upload)
        const userMessageText = baseMessage.trim() || "Please process the uploaded file(s).";

        // Create new tab if none exists
        if (tabs.length === 0 || !activeTabId) {
            const newTab = addTab(null, "New Chat");
        }

        // If no conversation exists, create one first
        let convId = currentConversationId;
        if (!convId) {
            try {
                const newConv = await chatApi.createConversation();
                convId = newConv.conversation_id;
                setCurrentConversationId(convId);

                // Update the active tab with the new conversation ID
                const activeTab = tabs.find(t => t.id === activeTabId);
                if (activeTab) {
                    setTabs(prev => prev.map(t =>
                        t.id === activeTabId
                            ? { ...t, conversationId: convId }
                            : t
                    ));
                }

                loadConversations();
            } catch (err) {
                console.error("Error creating conversation:", err);
                updateTabState(activeTabId, { error: "Failed to create conversation" });
                return;
            }
        }

        // Add user message to UI immediately
        const tempUserMessage = {
            id: `temp-${Date.now()}`,
            type: "user",
            role: "user",
            content: userMessageText,
            timestamp: new Date(),
        };

        const controller = new AbortController();

        // Update tab state with new message and loading state
        updateTabState(activeTabId, {
            messages: [...tabState.messages, tempUserMessage],
            currentMessage: "",
            isTyping: true,
            error: null,
            requestController: controller
        });

        try {
            // Include uploaded files in the request
            const filesToSend = tabState.uploadedFiles.length > 0 ? tabState.uploadedFiles : [];
            console.log(`Sending message with ${filesToSend.length} file(s):`, filesToSend.map(f => f.name));
            const response = await chatApi.sendMessageToConversation(
                convId,
                userMessageText,
                filesToSend,
                { signal: controller.signal }
            );

            // Replace temp message with real one
            const currentTabState = getCurrentTabState();
            const filtered = currentTabState.messages.filter((m) => m.id !== tempUserMessage.id);
            updateTabState(activeTabId, {
                messages: [
                    ...filtered,
                    mapMessageResponse(response.message),
                    mapMessageResponse(response.assistant_response),
                ],
                uploadedFiles: [],
                isTyping: false,
                requestController: null
            });

            // Update tab title from first user message if new conversation
            const finalConvId = response.conversation.conversation_id;
            const tab = tabs.find(t => t.id === activeTabId);
            if (tab && (!tab.title || tab.title === "New Chat")) {
                const firstUserMsg = userMessageText.slice(0, 50);
                updateTabTitle(tab.id, firstUserMsg);
            }

            // Refresh conversations list
            loadConversations();
        } catch (err) {
            console.error("Error sending message:", err);
            const currentTabState = getCurrentTabState();
            const errorMessage = err?.message && err.message.toLowerCase().includes("abort")
                ? "Generation stopped."
                : err.message || "Failed to send message";

            // Remove temp message and set error
            updateTabState(activeTabId, {
                messages: currentTabState.messages.filter((m) => m.id !== tempUserMessage.id),
                error: errorMessage,
                isTyping: false,
                requestController: null
            });
        }
    }, [currentConversationId, activeTabId, tabs, tabStates, loadConversations, mapMessageResponse, updateTabTitle, getCurrentTabState, updateTabState]);
    
    // Store handleSendMessage in ref for use in useEffect
    React.useEffect(() => {
        handleSendMessageRef.current = handleSendMessage;
    }, [handleSendMessage]);

    // Global Enter key handler for sending messages (when chat is expanded)
    useEffect(() => {
        if (!isExpanded) return;

        const handleGlobalKeyDown = (e) => {
            // Only trigger if Enter is pressed (not Shift+Enter)
            if (e.key === "Enter" && !e.shiftKey) {
                const target = e.target;
                const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

                // Don't interfere with other inputs (tab rename, search, etc.)
                if (isInput && target.id !== "chat-message-input") {
                    return; // Let other inputs handle their own Enter
                }

                // Get current tab state
                const currentTabState = activeTabId && tabStates[activeTabId]
                    ? tabStates[activeTabId]
                    : { currentMessage: "", isTyping: false };

                // If message has content and we're not currently processing, send it
                if (currentTabState.currentMessage.trim() && !currentTabState.isTyping) {
                    // Only if focus is within the chat modal or on our input
                    const chatModal = document.querySelector('[style*="height: 90vh"]'); // Chat modal
                    if (chatModal && (chatModal.contains(target) || target.id === "chat-message-input")) {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSendMessage();
                    }
                }
            }
        };

        window.addEventListener("keydown", handleGlobalKeyDown, true); // Use capture phase
        return () => {
            window.removeEventListener("keydown", handleGlobalKeyDown, true);
        };
    }, [isExpanded, activeTabId, tabStates, handleSendMessage]);

    const handleFileUpload = (event) => {
        if (!activeTabId) return;
        const files = Array.from(event.target.files || []);
        const tabState = getCurrentTabState();
        updateTabState(activeTabId, {
            uploadedFiles: [...tabState.uploadedFiles, ...files]
        });
    };

    const removeFile = (index) => {
        if (!activeTabId) return;
        const tabState = getCurrentTabState();
        updateTabState(activeTabId, {
            uploadedFiles: tabState.uploadedFiles.filter((_, i) => i !== index)
        });
    };

    // Drag functionality handlers
    const handleMouseDown = (e) => {
        e.preventDefault();
        setIsDragging(true);
        setHasDragged(false);

        const currentPosition = isMinimized
            ? minimizedPosition
            : fullChatPosition;

        setDragStart({
            x: e.clientX - currentPosition.x,
            y: e.clientY - currentPosition.y,
        });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;

        setHasDragged(true);
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;

        const maxX = window.innerWidth - (isMinimized ? 80 : 800);
        const maxY = window.innerHeight - (isMinimized ? 80 : 600);

        const newPosition = {
            x: Math.max(0, Math.min(newX, maxX)),
            y: Math.max(0, Math.min(newY, maxY)),
        };

        if (isMinimized) {
            setMinimizedPosition(newPosition);
        } else {
            setFullChatPosition(newPosition);
        }
    };

    React.useEffect(() => {
        setMinimizedPosition(getInitialMinimizedPosition());
        setFullChatPosition(getCenterPosition());
    }, []);

    // Listen for custom event to open RayyAI chat
    React.useEffect(() => {
        const handleOpenRayyAI = (event) => {
            setIsExpanded(true);
            setIsMinimized(false);
            setFullChatPosition(getCenterPosition());

            // Handle different context types
            if (event.detail) {
                let messageToPrefill = null;
                let shouldAutoSend = event.detail.autoSend || false;

                if (event.detail.message) {
                    // Use the provided message
                    messageToPrefill = event.detail.message;
                } else if (event.detail.context === 'credit_card_analysis') {
                    messageToPrefill = `Analyze my ${event.detail.bank} credit card and provide insights on how I can maximize rewards and reduce costs.`;
                }

                if (messageToPrefill && activeTabId) {
                    // Pre-fill the message input in current tab
                    updateTabState(activeTabId, { currentMessage: messageToPrefill });

                    // Auto-send if requested
                    if (shouldAutoSend) {
                        // Wait for chat to fully expand and render, then trigger send
                        setTimeout(() => {
                            console.log('Auto-sending message...');

                            // Get the input element
                            const input = document.getElementById("chat-message-input");
                            if (input) {
                                // Ensure the input has the correct value
                                input.value = messageToPrefill;
                                input.focus();

                                // Trigger an Enter key event to send the message
                                const enterEvent = new KeyboardEvent('keydown', {
                                    key: 'Enter',
                                    code: 'Enter',
                                    keyCode: 13,
                                    which: 13,
                                    bubbles: true,
                                    cancelable: true,
                                    shiftKey: false
                                });

                                console.log('Dispatching Enter key event');
                                input.dispatchEvent(enterEvent);

                                // Fallback: also try clicking the send button
                                setTimeout(() => {
                                    const sendButton = document.querySelector('button[class*="bg-[#0DAD8D]"]');
                                    if (sendButton && !sendButton.disabled) {
                                        console.log('Fallback: Clicking send button');
                                        sendButton.click();
                                    }
                                }, 200);
                            }
                        }, 1000); // Increased delay to ensure everything is ready
                    }
                }
            }
        };

        window.addEventListener('openRayyAI', handleOpenRayyAI);
        return () => {
            window.removeEventListener('openRayyAI', handleOpenRayyAI);
        };
    }, []); // Empty deps - we use ref for handleSendMessage

    const handleMouseUp = () => {
        setIsDragging(false);
        setTimeout(() => setHasDragged(false), 10);
    };

    React.useEffect(() => {
        if (isDragging) {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
            document.body.style.userSelect = "none";

            return () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
                document.body.style.userSelect = "";
            };
        }
    }, [isDragging, dragStart, minimizedPosition, fullChatPosition]);

    // Get current tab state for rendering
    const currentTabState = getCurrentTabState();
    const { messages, isTyping, isLoadingMessages, error, uploadedFiles, currentMessage } = currentTabState;

    return (
        <>
            {/* Oval Button - Fixed with AnimatePresence */}
            <AnimatePresence>
                {!isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
                    >
                        <div className="flex justify-center pt-1 pb-3">
                            <button
                                onClick={() => {
                                    setIsExpanded(true);
                                    setIsMinimized(false);
                                    setFullChatPosition(getCenterPosition());
                                }}
                                className="flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95"
                                style={{
                                    background: "#0DAD8D",
                                    boxShadow: "0 8px 32px rgba(4, 54, 44, 0.3), 0 4px 16px rgba(13, 173, 141, 0.2)",
                                }}
                            >
                                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                                    <Sparkles className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-white font-medium text-sm">
                                    Ask RayyAI
                                </span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Full Screen Chat Overlay - Improved Animation */}
            <AnimatePresence mode="wait">
                {isExpanded && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                            onClick={() => setIsExpanded(false)}
                        />

                        {/* Chat Panel - Curtain Animation (Covers 80% of screen) */}
                        <motion.div
                            initial={{ y: "-100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "-100%" }}
                            transition={{
                                type: "tween",
                                duration: 0.4,
                                ease: "easeOut"
                            }}
                            className="fixed top-0 left-0 right-0 z-50"
                            style={{
                                height: "90vh",
                            }}
                        >
                            {/* Main Container with Dark Background - Full Curtain */}
                            <div
                                className="h-full w-full bg-[#04362c] shadow-2xl relative overflow-hidden flex"
                            >
                                {/* History Sidebar */}
                                <AnimatePresence>
                                    {showHistory && (
                                        <motion.div
                                            initial={{ width: 0, opacity: 0 }}
                                            animate={{ width: 320, opacity: 1 }}
                                            exit={{ width: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="flex-shrink-0 border-r border-[#d2eaee]/20 bg-[#04362c]/90 backdrop-blur-sm overflow-hidden flex flex-col"
                                        >
                                            <div className="flex-shrink-0 px-4 py-3 border-b border-[#d2eaee]/20 flex items-center justify-between">
                                                <h3 className="text-[#d2eaee] font-semibold flex items-center gap-2">
                                                    <Clock className="w-4 h-4" />
                                                    Chat History
                                                </h3>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setShowHistory(false)}
                                                    className="h-6 w-6 p-0 text-[#d2eaee]/60 hover:text-[#d2eaee] hover:bg-transparent"
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <div className="flex-1 overflow-y-auto scrollbar-hide px-2 py-2">
                                                {isLoadingConversations ? (
                                                    <div className="flex flex-col items-center justify-center py-12 space-y-3">
                                                        <div className="flex gap-1">
                                                            {[0, 150, 300].map((delay, i) => (
                                                                <div
                                                                    key={i}
                                                                    className="w-2 h-2 bg-[#0DAD8D] rounded-full animate-bounce"
                                                                    style={{ animationDelay: `${delay}ms` }}
                                                                />
                                                            ))}
                                                        </div>
                                                        <p className="text-[#d2eaee]/60 text-sm font-medium">
                                                            Loading conversations...
                                                        </p>
                                                    </div>
                                                ) : conversations.length === 0 ? (
                                                    <div className="text-center text-[#d2eaee]/60 text-sm py-8">
                                                        No conversations yet
                                                    </div>
                                                ) : (
                                                    conversations.map((conv) => (
                                                        <div
                                                            key={conv.conversation_id}
                                                            onClick={() => openConversationInTab(
                                                                conv.conversation_id,
                                                                conv.title || "New Chat"
                                                            )}
                                                            className={`group px-3 py-2 rounded-lg cursor-pointer mb-1 transition-all relative ${
                                                                conv.conversation_id === currentConversationId
                                                                    ? "bg-[#0DAD8D]/20 border border-[#0DAD8D]/30"
                                                                    : "hover:bg-[#d2eaee]/10"
                                                            }`}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-[#d2eaee] text-sm font-medium truncate mb-1">
                                                                        {conv.title || "New Chat"}
                                                                    </div>
                                                                    <div className="text-[#d2eaee]/60 text-xs">
                                                                        {conv.message_count || 0} messages •{" "}
                                                                        {new Date(conv.updated_at).toLocaleDateString()}
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={(e) => handleDeleteConversation(conv, e)}
                                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-[#d2eaee]/60 flex-shrink-0 hover:bg-white/10 hover:text-[#d2eaee]"
                                                                    title="Delete conversation"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Main Chat Content */}
                                <div className="flex-1 flex flex-col min-w-0">
                                    {/* Tabs Bar - Cursor AI Style */}
                                    <div className="flex-shrink-0 border-b border-[#d2eaee]/20 bg-[#04362c]/80 backdrop-blur-sm">
                                        <div className="flex items-center gap-1 px-2 overflow-x-auto scrollbar-hide">
                                            <Button
                                                onClick={() => setShowHistory(!showHistory)}
                                                variant="ghost"
                                                size="sm"
                                                className={`h-8 px-3 text-[#d2eaee]/60 hover:text-[#d2eaee] hover:bg-[#d2eaee]/10 rounded-lg flex-shrink-0 mr-1 ${
                                                    showHistory ? "bg-[#0DAD8D]/20 text-[#0DAD8D] border border-[#0DAD8D]" : ""
                                                }`}
                                                title="Chat History"
                                            >
                                                <Clock className="w-4 h-4 mr-1.5" />
                                                History
                                            </Button>
                                            {tabs.map((tab) => (
                                                <motion.div
                                                    key={tab.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className={`group relative flex items-center gap-2 px-3 py-2 min-w-[140px] max-w-[220px] cursor-pointer transition-all ${
                                                        activeTabId === tab.id
                                                            ? "bg-[#0DAD8D]/20 text-[#0DAD8D]"
                                                            : "text-[#d2eaee]/70 hover:text-[#d2eaee] hover:bg-[#d2eaee]/5"
                                                    }`}
                                                    onClick={() => setActiveTabId(tab.id)}
                                                >
                                                    {/* Active indicator */}
                                                    {activeTabId === tab.id && (
                                                        <motion.div
                                                            layoutId="activeTab"
                                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0DAD8D]"
                                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                        />
                                                    )}
                                                    {renamingTabId === tab.id ? (
                                                        <input
                                                            type="text"
                                                            value={renameValue}
                                                            onChange={(e) => setRenameValue(e.target.value)}
                                                            onBlur={() => {
                                                                if (renameValue.trim()) {
                                                                    updateTabTitle(tab.id, renameValue.trim());
                                                                }
                                                                setRenamingTabId(null);
                                                                setRenameValue("");
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") {
                                                                    if (renameValue.trim()) {
                                                                        updateTabTitle(tab.id, renameValue.trim());
                                                                    }
                                                                    setRenamingTabId(null);
                                                                    setRenameValue("");
                                                                } else if (e.key === "Escape") {
                                                                    setRenamingTabId(null);
                                                                    setRenameValue("");
                                                                }
                                                            }}
                                                            className="flex-1 bg-[#d2eaee]/20 text-[#d2eaee] px-2 py-1 rounded text-sm outline-none border border-[#0DAD8D]"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <>
                                                            <span className={`text-sm truncate flex-1 font-medium ${
                                                                activeTabId === tab.id ? "text-[#0DAD8D]" : "text-[#d2eaee]/70"
                                                            }`}>
                                                                {tab.title || "New Chat"}
                                                            </span>
                                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                {tab.conversationId && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setRenamingTabId(tab.id);
                                                                            setRenameValue(tab.title || "");
                                                                        }}
                                                                        className="p-1 hover:bg-[#d2eaee]/20 rounded transition-colors"
                                                                        title="Rename conversation"
                                                                    >
                                                                        <Edit2 className={`w-3 h-3 ${
                                                                            activeTabId === tab.id ? "text-[#0DAD8D]/80" : "text-[#d2eaee]/60"
                                                                        }`} />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        closeTab(tab.id);
                                                                    }}
                                                                    className="p-1 hover:bg-red-500/20 rounded transition-colors"
                                                                    title="Close tab"
                                                                >
                                                                    <X className={`w-3.5 h-3.5 ${
                                                                        activeTabId === tab.id ? "text-[#0DAD8D]/80" : "text-[#d2eaee]/60"
                                                                    } hover:text-red-400`} />
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </motion.div>
                                            ))}
                                            <Button
                                                onClick={handleNewConversation}
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-[#d2eaee]/60 hover:text-[#d2eaee] hover:bg-[#d2eaee]/10 rounded-lg flex-shrink-0 ml-1"
                                                title="New conversation"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col overflow-hidden">
                                        <div 
                                            className="flex-shrink-0 px-8 py-6 pb-6 transition-all duration-300"
                                            style={{
                                                opacity: messages.length > 1 ? 0 : 1,
                                                height: messages.length > 1 ? 0 : 'auto',
                                                overflow: messages.length > 1 ? 'hidden' : 'visible',
                                                marginBottom: messages.length > 1 ? 0 : undefined,
                                                paddingTop: messages.length > 1 ? 0 : undefined,
                                                paddingBottom: messages.length > 1 ? 0 : undefined
                                            }}
                                        >
                                            <div className="flex items-center justify-center mb-6">
                                                <div className="text-center">
                                                    <h2
                                                        className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#d2eaee] mb-2 select-none transition-all duration-200"
                                                    >
                                                        Hello, {userName}
                                                    </h2>
                                                    <p className="text-[#d2eaee]/80 text-base">
                                                        How can I assist you today?
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            {/* Text Action Buttons - Vertical layout */}
                                            <div className="flex flex-col gap-3 items-center mt-6 mb-4">
                                                {[
                                                    { msg: 'Show me all available financial services and features.', icon: Star },
                                                    { msg: 'Help me create a budget and set financial goals.', icon: Target },
                                                    { msg: 'Analyze my spending patterns and provide suggestions for better financial habits.', icon: BarChart3 }
                                                ].map(({ msg, icon: Icon }, index) => (
                                                    <motion.button
                                                        key={index}
                                                        whileHover={{ scale: 1.05, y: -2 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        className="bg-[#d2eaee]/10 backdrop-blur-sm rounded-lg px-6 py-3 border border-[#d2eaee]/20 cursor-pointer hover:bg-[#d2eaee]/20 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 w-full max-w-md text-left flex items-center gap-3"
                                                        onClick={() => {
                                                            if (activeTabId) {
                                                                updateTabState(activeTabId, { currentMessage: msg });
                                                            }
                                                            // Immediately send the message
                                                            setTimeout(() => handleSendMessage(msg), 50);
                                                        }}
                                                    >
                                                        <Icon className="w-5 h-5 text-[#0DAD8D] flex-shrink-0" />
                                                        <p className="text-[#d2eaee] text-sm font-medium">
                                                            {msg}
                                                        </p>
                                                    </motion.button>
                                                ))}
                                            </div>
                                            
                                            {error && (
                                                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                                                    {error}
                                                </div>
                                            )}
                                        </div>

                                        {/* Chat Messages Area - Scrollable */}
                                        <div
                                            ref={messagesContainerRef}
                                            className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scrollbar-hide min-h-0"
                                        >
                                             {isLoadingMessages ? (
                                                 <div className="flex flex-col items-center justify-center h-full space-y-4">
                                                     <div className="flex gap-1">
                                                         {[0, 150, 300].map((delay, i) => (
                                                             <div
                                                                 key={i}
                                                                 className="w-3 h-3 bg-[#0DAD8D] rounded-full animate-bounce"
                                                                 style={{ animationDelay: `${delay}ms` }}
                                                             />
                                                         ))}
                                                     </div>
                                                     <p className="text-[#d2eaee] text-base font-medium">
                                                         Loading messages...
                                                     </p>
                                                 </div>
                                             ) : messages.map((message) => {
                                                 const isUserMessage = message.type === "user";
                                                 const canEditMessage = isUserMessage && !!message.messageId;
                                                 const isEditing = !!message.messageId && editingMessageId === message.messageId;
                                                 const copyKey = message.messageId || message.id;

                                                 return (
                                                     <React.Fragment key={message.id}>
                                                         <div
                                                             className={`group flex flex-col ${
                                                                 isUserMessage ? "items-end" : "items-start"
                                                             }`}
                                                         >
                                                             <div
                                                                 className={`max-w-[80%] rounded-2xl p-3 ${
                                                                     isUserMessage
                                                                         ? "bg-[#0DAD8D] text-white shadow-lg"
                                                                         : "bg-white/95 text-[#04362c] shadow-md"
                                                                 }`}
                                                             >
                                                                <div>
                                                                    <div className="flex-1">
                                                                        <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert">
                                                                            {!isUserMessage && message.id === "1" ? (
                                                                                <div className="flex items-start gap-2">
                                                                                    <Hand className="w-5 h-5 text-[#04362c] flex-shrink-0 mt-0.5" />
                                                                                    <div className="flex-1">
                                                                                        <ReactMarkdown
                                                                                 components={{
                                                                                    h1: ({node, children, ...props}) => <h1 className="font-bold text-lg mb-3 text-[#04362c]" style={{fontWeight: 700}} {...props}>{children}</h1>,
                                                                                    h2: ({node, children, ...props}) => {
                                                                                        const textContent = React.Children.toArray(children)
                                                                                            .map((child) => (typeof child === "string" ? child : ""))
                                                                                            .join("")
                                                                                            .trim()
                                                                                            .toLowerCase();
                                                                                        if (textContent === "summary") {
                                                                                            return null;
                                                                                        }
                                                                                        return (
                                                                                            <h2 className="font-bold text-base mb-2 mt-4 text-[#04362c]" style={{fontWeight: 700}} {...props}>
                                                                                                {children}
                                                                                            </h2>
                                                                                        );
                                                                                    },
                                                                                    h3: ({node, children, ...props}) => <h3 className="font-bold text-sm mb-2 mt-3 text-[#04362c]" style={{fontWeight: 700}} {...props}>{children}</h3>,
                                                                                     p: ({node, ...props}) => <p className="font-medium text-sm leading-relaxed mb-2 text-[#04362c]" style={{fontWeight: 500}} {...props} />,
                                                                                     ul: ({node, ...props}) => <ul className="mb-3 space-y-1 text-[#04362c] list-none pl-0" {...props} />,
                                                                                     ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-3 space-y-1 text-[#04362c]" {...props} />,
                                                                                     li: ({node, ...props}) => <li className="font-medium text-sm text-[#04362c] list-none" style={{fontWeight: 500}} {...props} />,
                                                                                     strong: ({node, ...props}) => <strong className="font-bold text-[#04362c]" style={{fontWeight: 700}} {...props} />,
                                                                                     a: ({node, href, children, ...props}) => {
                                                                                         const handleClick = (e) => {
                                                                                             e.preventDefault();
                                                                                             if (href && href.startsWith('/')) {
                                                                                                 // Close chat first
                                                                                                 setIsExpanded(false);

                                                                                                 // If navigating to upload statement page, scroll to statement list after navigation
                                                                                                 if (href.includes('/transactions/upload')) {
                                                                                                     navigate(href);
                                                                                                     // Wait longer for page to fully render
                                                                                                     setTimeout(() => {
                                                                                                         const statementSection = document.getElementById('statement-list-section');
                                                                                                         if (statementSection) {
                                                                                                             statementSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                                                                         } else {
                                                                                                             // Fallback: scroll to top if element not found
                                                                                                             window.scrollTo({ top: 0, behavior: 'smooth' });
                                                                                                         }
                                                                                                     }, 300);
                                                                                                 } else {
                                                                                                     navigate(href);
                                                                                                 }
                                                                                             } else if (href) {
                                                                                                 window.open(href, '_blank', 'noopener,noreferrer');
                                                                                             }
                                                                                         };
                                                                                         return (
                                                                                             <a
                                                                                                 href={href}
                                                                                                 onClick={handleClick}
                                                                                                 className="font-bold text-[#0DAD8D] hover:text-[#0C98BA] underline cursor-pointer transition-colors"
                                                                                                 style={{fontWeight: 700}}
                                                                                                 {...props}
                                                                                             >
                                                                                                 {children}
                                                                                             </a>
                                                                                         );
                                                                                     },
                                                                                     code: ({node, inline, ...props}) => inline ? null : null,
                                                                                     pre: () => null,
                                                                                     br: () => <br className="mb-2" />,
                                                                                 }}
                                                                             >
                                                                                 {message.content}
                                                                             </ReactMarkdown>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <ReactMarkdown
                                                                                    components={{
                                                                                       h1: ({node, children, ...props}) => <h1 className="font-bold text-lg mb-3 text-[#04362c]" style={{fontWeight: 700}} {...props}>{children}</h1>,
                                                                                       h2: ({node, children, ...props}) => {
                                                                                           const textContent = React.Children.toArray(children)
                                                                                               .map((child) => (typeof child === "string" ? child : ""))
                                                                                               .join("")
                                                                                               .trim()
                                                                                               .toLowerCase();
                                                                                           if (textContent === "summary") {
                                                                                               return null;
                                                                                           }
                                                                                           return (
                                                                                               <h2 className="font-bold text-base mb-2 mt-4 text-[#04362c]" style={{fontWeight: 700}} {...props}>
                                                                                                   {children}
                                                                                               </h2>
                                                                                           );
                                                                                       },
                                                                                       h3: ({node, children, ...props}) => <h3 className="font-bold text-sm mb-2 mt-3 text-[#04362c]" style={{fontWeight: 700}} {...props}>{children}</h3>,
                                                                                        p: ({node, ...props}) => <p className="font-medium text-sm leading-relaxed mb-2 text-[#04362c]" style={{fontWeight: 500}} {...props} />,
                                                                                        ul: ({node, ...props}) => <ul className="mb-3 space-y-1 text-[#04362c] list-none pl-0" {...props} />,
                                                                                        ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-3 space-y-1 text-[#04362c]" {...props} />,
                                                                                        li: ({node, ...props}) => <li className="font-medium text-sm text-[#04362c] list-none" style={{fontWeight: 500}} {...props} />,
                                                                                        strong: ({node, ...props}) => <strong className="font-bold text-[#04362c]" style={{fontWeight: 700}} {...props} />,
                                                                                        a: ({node, href, children, ...props}) => {
                                                                                            const handleClick = (e) => {
                                                                                                e.preventDefault();
                                                                                                if (href && href.startsWith('/')) {
                                                                                                    // Close chat first
                                                                                                    setIsExpanded(false);

                                                                                                    // If navigating to upload statement page, scroll to statement list after navigation
                                                                                                    if (href.includes('/transactions/upload')) {
                                                                                                        navigate(href);
                                                                                                        // Wait longer for page to fully render
                                                                                                        setTimeout(() => {
                                                                                                            const statementSection = document.getElementById('statement-list-section');
                                                                                                            if (statementSection) {
                                                                                                                statementSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                                                                            } else {
                                                                                                                // Fallback: scroll to top if element not found
                                                                                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                                                                                            }
                                                                                                        }, 300);
                                                                                                    } else {
                                                                                                        navigate(href);
                                                                                                    }
                                                                                                } else if (href) {
                                                                                                    window.open(href, '_blank', 'noopener,noreferrer');
                                                                                                }
                                                                                            };
                                                                                            return (
                                                                                                <a
                                                                                                    href={href}
                                                                                                    onClick={handleClick}
                                                                                                    className="text-[#0DAD8D] underline hover:text-[#0DAD8D]/80"
                                                                                                    {...props}
                                                                                                >
                                                                                                    {children}
                                                                                                </a>
                                                                                            );
                                                                                        },
                                                                                        code: ({node, inline, ...props}) => inline ? null : null,
                                                                                        pre: () => null,
                                                                                        br: () => <br className="mb-2" />,
                                                                                    }}
                                                                                >
                                                                                    {message.content}
                                                                                </ReactMarkdown>
                                                                            )}
                                                                        </div>
                                                                         {message.metadata?.actions_executed && message.metadata.actions_executed.length > 0 && (
                                                                             <div className="mt-2 space-y-1">
                                                                                 {message.metadata.actions_executed.map((action, idx) => (
                                                                                     <Badge
                                                                                         key={idx}
                                                                                         variant={action.success ? "default" : "destructive"}
                                                                                         className="text-xs mr-1"
                                                                                     >
                                                                                         {action.success ? "✓" : "✗"} {action.action || "Action"} {action.success ? "executed" : "failed"}
                                                                                     </Badge>
                                                                                 ))}
                                                                             </div>
                                                                         )}
                                                                         {message.attachments &&
                                                                             message.attachments.length > 0 && (
                                                                                 <div className="mt-2 flex flex-wrap gap-1">
                                                                                     {message.attachments.map(
                                                                                         (file, index) => (
                                                                                             <Badge
                                                                                                 key={index}
                                                                                                 variant="secondary"
                                                                                                 className="text-xs"
                                                                                             >
                                                                                                 <Paperclip className="w-3 h-3 mr-1" />
                                                                                                 {file}
                                                                                             </Badge>
                                                                                         )
                                                                                     )}
                                                                                 </div>
                                                                             )}
                                                                     </div>
                                                                 </div>
                                                             </div>

                                                             {/* Timestamp below message bubble */}
                                                             <span
                                                                 className={`text-xs mt-1 ${
                                                                     isUserMessage ? "text-white/70" : "text-[#d2eaee]/70"
                                                                 }`}
                                                             >
                                                                 {formatMessageTimestamp(message.timestamp || message.createdAt || new Date())}
                                                             </span>
                                                         </div>

                                                         {isEditing && (
                                                             <div className={`mt-3 flex ${isUserMessage ? "justify-end" : "justify-start"}`}>
                                                                 <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg border border-[#0DAD8D]/30 p-4">
                                                                     <textarea
                                                                         value={editingMessageContent}
                                                                         onChange={(e) => setEditingMessageContent(e.target.value)}
                                                                         className="w-full min-h-[100px] rounded-xl border border-[#0DAD8D]/30 px-3 py-2 text-sm text-[#04362c] focus:outline-none focus:ring-2 focus:ring-[#0DAD8D]/40 focus:border-[#0DAD8D]"
                                                                         disabled={messageActionLoading}
                                                                     />
                                                                     {messageActionError && (
                                                                         <p className="mt-2 text-sm text-red-500">{messageActionError}</p>
                                                                     )}
                                                                     <div className="mt-3 flex justify-end gap-2">
                                                                         <button
                                                                             type="button"
                                                                             onClick={cancelEditingMessage}
                                                                             disabled={messageActionLoading}
                                                                             className="px-4 py-2 rounded-lg border border-[#04362c]/20 text-sm font-semibold text-[#04362c] hover:bg-[#04362c]/5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                                                         >
                                                                             Cancel
                                                                         </button>
                                                                         <button
                                                                             type="button"
                                                                             onClick={saveEditedMessage}
                                                                             disabled={messageActionLoading}
                                                                             className="px-4 py-2 rounded-lg bg-[#0DAD8D] text-white text-sm font-semibold hover:bg-[#0DAD8D]/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                                                         >
                                                                             {messageActionLoading ? "Saving..." : "Save Changes"}
                                                                         </button>
                                                                     </div>
                                                                 </div>
                                                             </div>
                                                         )}
                                                     </React.Fragment>
                                                 );
                                             })}
                                             {isTyping && (
                                                 <div className="space-y-3">
                                                     <div className="flex justify-start">
                                                         <div className="bg-white/95 text-[#04362c] shadow-md rounded-2xl p-3">
                                                             <div className="flex items-center gap-2">
                                                                 <Bot className="w-4 h-4 text-[#04362c]" />
                                                                 <div className="flex gap-1">
                                                                     {[0, 150, 300].map((delay, i) => (
                                                                         <div
                                                                             key={i}
                                                                             className="w-2 h-2 bg-[#0DAD8D] rounded-full animate-bounce"
                                                                             style={{ animationDelay: `${delay}ms` }}
                                                                         />
                                                                     ))}
                                                                 </div>
                                                             </div>
                                                         </div>
                                                     </div>
                                                     <div className="flex justify-start">
                                                         <button
                                                             type="button"
                                                             onClick={stopGenerating}
                                                             className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 text-xs font-semibold text-[#d2eaee] hover:bg-white/10 transition-all"
                                                         >
                                                             <X className="w-3 h-3" />
                                                             Stop Generating
                                                         </button>
                                                     </div>
                                                 </div>
                                             )}
                                            {/* Sentinel element for auto-scroll */}
                                            <div ref={messagesEndRef} />
                                            {uploadedFiles.length > 0 && (
                                                <div className="p-3 bg-[#d2eaee]/20 backdrop-blur-sm rounded-xl border border-[#d2eaee]/30">
                                                    <h4 className="text-[#d2eaee] text-xs font-medium mb-2">
                                                        Attached Files:
                                                    </h4>
                                                    <div className="space-y-1">
                                                        {uploadedFiles.map((file, index) => (
                                                            <div
                                                                key={index}
                                                                className="flex items-center justify-between bg-[#d2eaee]/10 p-2 rounded-lg border border-[#d2eaee]/20"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <Paperclip className="w-3 h-3 text-[#d2eaee]/80" />
                                                                    <span className="text-[#d2eaee] text-xs truncate">
                                                                        {file.name}
                                                                    </span>
                                                                    <span className="text-xs text-[#d2eaee]/60">
                                                                        ({(file.size / 1024).toFixed(1)} KB)
                                                                    </span>
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => removeFile(index)}
                                                                    className="text-[#d2eaee]/60 hover:text-[#d2eaee] h-5 w-5 p-0"
                                                                >
                                                                    ×
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Input Area - Fixed at Bottom */}
                                        <div className="flex-shrink-0 border-t border-[#d2eaee]/20 bg-[#04362c] px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1">
                                                    <input
                                                        id="chat-message-input"
                                                        type="text"
                                                        value={currentMessage}
                                                        onChange={(e) => {
                                                            if (activeTabId) {
                                                                updateTabState(activeTabId, { currentMessage: e.target.value });
                                                            }
                                                        }}
                                                        placeholder="Ask RayyAI anything"
                                                        className="w-full bg-[#d2eaee]/10 text-[#d2eaee] placeholder:text-[#d2eaee]/60 border border-[#d2eaee]/20 rounded-xl px-4 py-3 outline-none focus:border-[#d2eaee]/40 transition-colors"
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter" && !e.shiftKey) {
                                                                e.preventDefault();
                                                                handleSendMessage();
                                                            }
                                                        }}
                                                        autoFocus={isExpanded}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            document.getElementById("global-file-upload")?.click()
                                                        }
                                                        className="h-10 w-10 p-0 text-[#d2eaee]/60 hover:text-[#d2eaee] hover:bg-[#d2eaee]/10 rounded-xl"
                                                    >
                                                        <Paperclip className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleSendMessage()}
                                                        size="sm"
                                                        className="h-10 w-10 p-0 bg-[#0DAD8D] hover:bg-[#0DAD8D]/90 rounded-xl border-0 active:scale-95 transition-all"
                                                        disabled={
                                                            !currentMessage.trim() &&
                                                            uploadedFiles.length === 0
                                                        }
                                                    >
                                                        <Send className="w-4 h-4 text-white" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        <input
                                            type="file"
                                            multiple
                                            accept=".pdf,.png,.jpg,.jpeg,.csv,.doc,.docx"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            id="global-file-upload"
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {deleteDialog.open && (
                <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
                    <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_25px_80px_rgba(4,54,44,0.25)] border border-[#04362c]/10 overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 pt-6 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-[#04362c]">
                                    Delete conversation?
                                </h3>
                                <p className="text-sm text-[#04362c]/70 mt-2 leading-relaxed">
                                    This will permanently remove all messages. This action cannot be undone.
                                </p>
                            </div>
                        </div>

                        {deleteDialogError && (
                            <div className="px-6 py-3 text-sm text-red-600 bg-red-50 border-y border-red-100">
                                {deleteDialogError}
                            </div>
                        )}

                        <div className="px-6 pb-6 pt-4 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={cancelDeleteConversation}
                                disabled={isDeletingConversation}
                                className="px-5 py-2.5 rounded-xl border border-[#04362c]/20 text-sm font-semibold text-[#04362c] hover:bg-[#04362c]/5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                Keep Conversation
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteConversation}
                                disabled={isDeletingConversation}
                                className="px-5 py-2.5 rounded-xl bg-[#0DAD8D] text-white text-sm font-semibold shadow-lg hover:bg-[#0DAD8D]/90 transition-all inline-flex items-center gap-2 justify-center"
                            >
                                {isDeletingConversation ? (
                                    <>
                                        <span className="h-3 w-3 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Delete Conversation
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Close Button - Outside the modal, fixed at bottom of screen */}
            {isExpanded && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60]">
                    <button
                        onClick={() => {
                            setIsExpanded(false);
                            setIsMinimized(false);
                        }}
                        className="px-4 py-2 bg-[#04362c] text-[#d2eaee] rounded-full hover:bg-[#04362c]/90 transition-all duration-300 shadow-xl hover:shadow-[#d2eaee]/20 flex items-center gap-2 border-2 border-[#d2eaee]/30"
                    >
                        <X className="w-4 h-4" />
                        <span className="text-sm font-semibold">Close Chat</span>
                    </button>
                </div>
            )}
        </>
    );
}

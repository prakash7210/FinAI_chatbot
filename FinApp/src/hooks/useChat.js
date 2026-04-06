/* eslint-disable no-shadow */
import {useState, useEffect} from 'react';
import API from '../api/client';

export default function useChat() {
  const [messages, setMessages] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔥 LOAD CHATS
  const loadChats = async () => {
    const res = await API.get('/chats');
    setChats(res.data);
  };

  // 🔥 LOAD MESSAGES
  const loadMessages = async id => {
    setChatId(id);
    const res = await API.get(`/chats/${id}`);
    setMessages(res.data.messages);
  };

  // 🔥 NEW CHAT
  const createNewChat = () => {
    setMessages([]);
    setChatId(null);
  };

  // 🔥 SMOOTH TYPING (UPDATED WITH QUERY + SOURCE)
  const typeMessage = (text, query, source = 'llm_generated') => {
    let index = 0;
    const chunkSize = 3;

    const interval = setInterval(() => {
      index += chunkSize;

      setMessages(prev => {
        const last = prev[prev.length - 1];

        if (!last || last.isUser) {
          return [
            ...prev,
            {
              text: text.slice(0, index),
              isUser: false,
              query,
              source,
              feedbackGiven: false,
            },
          ];
        }

        const updated = [...prev];
        updated[updated.length - 1] = {
          ...last,
          text: text.slice(0, index),
        };

        return updated;
      });

      if (index >= text.length) clearInterval(interval);
    }, 30);
  };

  // 🔥 SEND MESSAGE
  const sendMessage = async text => {
    let id = chatId;

    if (!id) {
      const titleRes = await API.post('/generate-title', {query: text});
      const chatRes = await API.post('/chats', {title: titleRes.data.title});
      id = chatRes.data.id;
      setChatId(id);
      loadChats();
    }

    const userMsg = {text, isUser: true};
    setMessages(prev => [...prev, userMsg]);

    await API.post('/messages', {
      chatId: id,
      text,
      isUser: true,
    });

    setLoading(true);

    try {
      const res = await API.post('/analyze', {
        query: text,
        chatId: id,
      });

      const responseText = res.data.response;
      const source = res.data.source || 'llm_generated';

      // 🔥 typing animation WITH metadata
      setTimeout(() => {
        typeMessage(responseText, text, source);
      }, 200);

      await API.post('/messages', {
        chatId: id,
        text: responseText,
        isUser: false,
      });
    } catch (err) {
      console.log(err);
    }

    setLoading(false);
  };

  // 🔥 EDIT MESSAGE
  const editMessage = async (index, newText) => {
    const msg = messages[index];

    const updatedMessages = messages.slice(0, index + 1);
    updatedMessages[index] = {...msg, text: newText};
    setMessages(updatedMessages);

    try {
      if (msg?.id) {
        await API.put(`/messages/${msg.id}`, {
          text: newText,
        });
      }

      setLoading(true);

      const res = await API.post('/analyze', {
        query: newText,
      });

      const responseText = res.data.response;
      const source = res.data.source || 'llm_generated';

      setTimeout(() => {
        typeMessage(responseText, newText, source);
      }, 200);

      await API.post('/messages', {
        chatId: chatId,
        text: responseText,
        isUser: false,
      });
    } catch (err) {
      console.log('EDIT ERROR:', err);
    }

    setLoading(false);
  };

  // 🔥 DELETE CHAT
  const deleteChat = async chatId => {
    setChats(prev => prev.filter(c => c.id !== chatId));

    try {
      await API.delete(`/chats/${chatId}`);
    } catch (err) {
      console.log(err);
    }
  };

  // 🔥 RENAME CHAT
  const renameChat = async (chatId, newTitle) => {
    try {
      if (!newTitle || newTitle.trim() === '') return;

      await API.put(`/chats/${chatId}`, {
        title: newTitle,
      });

      setChats(prev =>
        prev.map(chat =>
          chat.id === chatId || chat._id === chatId
            ? {...chat, title: newTitle}
            : chat,
        ),
      );
    } catch (err) {
      console.log('RENAME ERROR:', err?.response?.data || err);
    }
  };

  useEffect(() => {
    loadChats();
  }, []);

  return {
    messages,
    chats,
    sendMessage,
    loadMessages,
    createNewChat,
    editMessage,
    deleteChat,
    renameChat,
    loading,
  };
}

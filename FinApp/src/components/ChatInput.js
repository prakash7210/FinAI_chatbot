/* eslint-disable curly */
/* eslint-disable react-native/no-inline-styles */
import React, {useState} from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import API from '../api/client';
import {COLORS} from '../theme/theme';

export default function ChatInput({onSend}) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  // 🔥 NEW: status message
  const [statusMsg, setStatusMsg] = useState('');

  // 🔥 auto clear message
  const showMessage = msg => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  // 🔥 PICK FILE (PDF)
  const pickAndUploadFile = async () => {
    if (loading) return;

    try {
      const file = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.pdf],
      });

      const formData = new FormData();

      formData.append('file', {
        uri: file.uri,
        name: file.name || 'file.pdf',
        type: file.type || 'application/pdf',
      });

      setLoading(true);

      await API.post('/loadpdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showMessage('✅ PDF uploaded successfully');
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.log('User cancelled');
      } else {
        console.log(err);
        showMessage('❌ Upload failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // 🚀 SEND MESSAGE
  const handleSend = async () => {
    if (!text.trim() || loading) return;

    try {
      setLoading(true);
      await onSend(text);
      setText('');
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      {/* 🔥 TOP STATUS MESSAGE */}
      {statusMsg !== '' && (
        <View
          style={{
            backgroundColor: '#111',
            padding: 8,
            alignItems: 'center',
          }}>
          <Text style={{color: '#fff'}}>{statusMsg}</Text>
        </View>
      )}

      {/* INPUT BAR */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 10,
          borderTopWidth: 1,
          borderColor: COLORS.border,
          backgroundColor: COLORS.background,
        }}>
        {/* ➕ BUTTON */}
        <TouchableOpacity onPress={pickAndUploadFile} disabled={loading}>
          <Text
            style={{
              fontSize: 26,
              color: loading ? '#888' : COLORS.accent,
            }}>
            ＋
          </Text>
        </TouchableOpacity>

        {/* INPUT */}
        <TextInput
          editable={!loading}
          value={text}
          onChangeText={setText}
          placeholder="Ask something..."
          placeholderTextColor="#888"
          style={{
            flex: 1,
            backgroundColor: COLORS.card,
            color: '#fff',
            padding: 12,
            borderRadius: 10,
            marginLeft: 8,
            opacity: loading ? 0.7 : 1,
          }}
        />

        {/* SEND BUTTON */}
        <TouchableOpacity
          onPress={handleSend}
          disabled={loading}
          style={{marginLeft: 8}}>
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.accent} />
          ) : (
            <Text
              style={{
                backgroundColor: COLORS.accent,
                padding: 12,
                borderRadius: 10,
              }}>
              Send
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* eslint-disable prettier/prettier */
/* eslint-disable curly */
/* eslint-disable react/react-in-jsx-scope */
/* eslint-disable react-native/no-inline-styles */
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import {COLORS} from '../theme/theme';
import {useState, useEffect, useRef} from 'react';
import Icon from 'react-native-vector-icons/FontAwesome5';
import API from '../api/client';

export default function MessageBubble({message, onEdit}) {
  const isUser = message?.isUser;

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message?.text || '');
  const [showActions, setShowActions] = useState(false);

  const [feedbackGiven, setFeedbackGiven] = useState(
    message?.feedbackGiven || false,
  );
  const [selected, setSelected] = useState(null);

  // 🔥 Animation
  const scale = useRef(new Animated.Value(1)).current;

  const animate = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // 🔥 FEEDBACK HANDLER
  const handleFeedback = async rating => {
    if (feedbackGiven) return;

    try {
      setSelected(rating);
      animate();

      await API.post('/feedback', {
        query: message?.query || '',
        answer: message?.text || '',
        rating,
        source: message?.source || 'llm_generated',
      });

      setFeedbackGiven(true); // 🔥 disable after click
    } catch (err) {
      console.log('FEEDBACK ERROR:', err);
    }
  };

  useEffect(() => {
    if (showActions && !editing) {
      const timer = setTimeout(() => setShowActions(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showActions, editing]);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      delayLongPress={300}
      onLongPress={() => setShowActions(true)}>
      <View
        style={[
          styles.container,
          {
            alignSelf: isUser ? 'flex-end' : 'flex-start',
            backgroundColor: isUser ? '#14532D' : COLORS.card,
          },
        ]}>
        {/* MESSAGE */}
        {editing ? (
          <TextInput
            value={editText}
            onChangeText={setEditText}
            autoFocus
            multiline
            style={styles.input}
          />
        ) : (
          <Markdown style={{body: {color: '#fff', fontSize: 15}}}>
            {String(message?.text ?? '')}
          </Markdown>
        )}

        {/* ✏️ EDIT (USER ONLY) */}
        {isUser && showActions && (
          <View style={styles.actions}>
            {editing ? (
              <>
                <TouchableOpacity
                  onPress={() => {
                    onEdit(editText);
                    setEditing(false);
                    setShowActions(false);
                  }}>
                  <Text style={styles.save}>Save</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setEditing(false);
                    setShowActions(false);
                  }}>
                  <Text style={[styles.cancel, {paddingLeft: 12}]}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity onPress={() => setEditing(true)}>
                <Text style={styles.edit}>
                  <Icon name="edit" size={16} /> edit
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 🔥 FEEDBACK (ICON ONLY) */}
        {!isUser && (
          <View style={styles.actionRow}>
            {/* 👍 */}
            <Animated.View style={{transform: [{scale}]}}>
              <TouchableOpacity
                onPress={() => handleFeedback(1)}
                disabled={feedbackGiven}>
                <Icon
                  name="thumbs-up"
                  size={18}
                  color={selected === 1 ? '#22c55e' : '#888'}
                  solid
                />
              </TouchableOpacity>
            </Animated.View>

            {/* 👎 */}
            <Animated.View style={{transform: [{scale}]}}>
              <TouchableOpacity
                onPress={() => handleFeedback(-1)}
                disabled={feedbackGiven}>
                <Icon
                  name="thumbs-down"
                  size={18}
                  color={selected === -1 ? '#22c55e' : '#888'}
                  solid
                />
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '85%',
    padding: 12,
    marginVertical: 6,
    borderRadius: 12,
  },
  input: {
    color: '#fff',
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 8,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 6,
  },

  actionRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 16,
    opacity: 0.8,
  },

  edit: {color: 'white', fontWeight: 'bold'},
  save: {color: 'white', fontWeight: 'bold',paddingRight: 12},
  cancel: {color: 'red'},
});

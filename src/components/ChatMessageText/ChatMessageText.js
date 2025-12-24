import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import tw from 'tailwind-react-native-classnames';

/**
 * Component để render chat message với khả năng parse markdown links
 * Hỗ trợ format: [product_name](/product/{id})
 */
const ChatMessageText = ({ text, isUser, isStreaming }) => {
  const navigation = useNavigation();

  // Chỉ parse links khi message hoàn tất (không streaming)
  if (isStreaming || !text) {
    return (
      <Text style={tw`${isUser ? 'text-white' : 'text-gray-800'}`}>
        {text || '...'}
      </Text>
    );
  }

  // Regex để tìm markdown links: [text](/product/{id})
  const linkRegex = /\[([^\]]+)\]\(\/product\/(\d+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  // Tìm tất cả các links trong text
  while ((match = linkRegex.exec(text)) !== null) {
    const [fullMatch, linkText, productId] = match;
    const matchStart = match.index;
    const matchEnd = matchStart + fullMatch.length;

    // Thêm text trước link
    if (matchStart > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, matchStart),
      });
    }

    // Thêm link
    parts.push({
      type: 'link',
      content: linkText,
      productId: parseInt(productId, 10),
    });

    lastIndex = matchEnd;
  }

  // Thêm text còn lại sau link cuối cùng
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex),
    });
  }

  // Nếu không có link nào (parts chỉ có text hoặc rỗng), render text bình thường
  const hasLinks = parts.some(part => part.type === 'link');
  if (!hasLinks) {
    return (
      <Text style={tw`${isUser ? 'text-white' : 'text-gray-800'}`}>
        {text}
      </Text>
    );
  }

  // Render với links clickable
  return (
    <Text style={tw`${isUser ? 'text-white' : 'text-gray-800'}`}>
      {parts.map((part, index) => {
        if (part.type === 'link') {
          return (
            <Text
              key={index}
              style={[
                tw`${isUser ? 'text-blue-200' : 'text-blue-600'}`,
                { 
                  fontWeight: '600',
                  textDecorationLine: 'underline',
                },
              ]}
              onPress={() => {
                console.log('[ChatMessageText] Clicked product link, productId:', part.productId);
                navigation.navigate('ProductScreen', { id: part.productId });
              }}>
              {part.content}
            </Text>
          );
        } else {
          return <Text key={index}>{part.content}</Text>;
        }
      })}
    </Text>
  );
};

export default ChatMessageText;


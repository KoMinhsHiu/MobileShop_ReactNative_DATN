import React from 'react';
import { View, Text, Pressable } from 'react-native';
import tw from 'tailwind-react-native-classnames';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={tw`flex-1 justify-center items-center bg-white p-4`}>
          <Text style={tw`text-xl font-bold text-red-600 mb-4`}>
            ⚠️ Đã xảy ra lỗi
          </Text>
          <Text style={tw`text-gray-600 text-center mb-4`}>
            Ứng dụng gặp sự cố. Vui lòng thử lại.
          </Text>
          <Pressable
            style={tw`bg-red-600 p-3 rounded-lg`}
            onPress={() => {
              this.setState({ hasError: false, error: null });
            }}
          >
            <Text style={tw`text-white font-bold`}>Thử lại</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

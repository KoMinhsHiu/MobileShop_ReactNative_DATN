import React from 'react';
import {StatusBar, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

const STATUSBAR_HEIGHT = StatusBar.currentHeight;

const CustomStatusBar = ({backgroundColor, ...props}) => (
  <View>
    <SafeAreaView>
      <StatusBar translucent backgroundColor={backgroundColor} {...props} />
    </SafeAreaView>
  </View>
);

export default CustomStatusBar;

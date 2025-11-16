import {Text} from 'react-native';
import React from 'react';

const ThemeText = ({weight, style, ...props}) => {
  let fontWeight = 'Poppins-Regular';
  switch (weight) {
    case 100:
      fontWeight = 'Poppins-ExtraLight';
      break;
    case 200:
      fontWeight = 'Poppins-ExtraLight';
      break;
    case 300:
      fontWeight = 'Poppins-Thin';
      break;
    case 400:
      fontWeight = 'Poppins-Regular';
      break;
    case 500:
      fontWeight = 'Poppins-Medium';
      break;
    case 600:
      fontWeight = 'Poppins-SemiBold';
      break;
    case 700:
      fontWeight = 'Poppins-Bold';
      break;
    case 800:
      fontWeight = 'Poppins-ExtraBold';
      break;
    case 900:
      fontWeight = 'Poppins-Black';
      break;
    default:
      break;
  }
  return (
    <Text style={[style, {fontFamily: fontWeight}]} {...props}>
      {props.children}
    </Text>
  );
};

// Tiêu đề: đậm
export const TitleText = ({style, ...props}) => (
  <ThemeText weight={700} style={style} {...props} />
);

// Nội dung: mảnh hơn
export const BodyText = ({style, ...props}) => (
  <ThemeText weight={300} style={style} {...props} />
);

export default ThemeText;

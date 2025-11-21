import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProducerDashboardScreen } from '../screens/producer/ProducerDashboardScreen';

export type ProducerStackParamList = {
  ProducerDashboard: undefined;
  ProducerProducts: undefined;
  ProducerOrders: undefined;
  ProducerAddProduct: undefined;
};

const Stack = createNativeStackNavigator<ProducerStackParamList>();

export const ProducerNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="ProducerDashboard" 
        component={ProducerDashboardScreen}
      />
    </Stack.Navigator>
  );
};


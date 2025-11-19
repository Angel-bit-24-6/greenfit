import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import EmployeeLoginScreen from '../screens/employee/EmployeeLoginScreen';
import OrdersDashboardScreen from '../screens/employee/OrdersDashboardScreen';
import OrderDetailScreen from '../screens/employee/OrderDetailScreen';

export type EmployeeStackParamList = {
  EmployeeLogin: undefined;
  EmployeeDashboard: undefined;
  OrderDetail: {
    orderId: string;
  };
};

const Stack = createStackNavigator<EmployeeStackParamList>();

export const EmployeeNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="EmployeeLogin"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#ff6b35', // Kitchen orange theme
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="EmployeeLogin" 
        component={EmployeeLoginScreen}
        options={{
          title: 'Kitchen Login',
          headerShown: false, // Custom header in component
        }}
      />
      
      <Stack.Screen 
        name="EmployeeDashboard" 
        component={OrdersDashboardScreen}
        options={{
          title: '🧑‍🍳 Kitchen Dashboard',
          headerLeft: () => null, // Disable back button
          gestureEnabled: false, // Disable swipe back
        }}
      />
      
      <Stack.Screen 
        name="OrderDetail" 
        component={OrderDetailScreen}
        options={{
          title: '📋 Order Details',
        }}
      />
    </Stack.Navigator>
  );
};
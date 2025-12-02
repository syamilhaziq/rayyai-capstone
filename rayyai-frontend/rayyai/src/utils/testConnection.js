// Test script to verify API connection
import api from '../config/api';

export const testConnection = async () => {
    try {
        console.log('Testing API connection...');
        
        // Test basic connection
        const response = await api.get('/');
        console.log('✅ API connection successful:', response.data);
        
        // Test goals endpoint
        try {
            const goalsResponse = await api.get('/goals');
            console.log('✅ Goals endpoint accessible:', goalsResponse.data);
        } catch (err) {
            console.log('⚠️ Goals endpoint error:', err.message);
        }
        
        // Test budget endpoint
        try {
            const budgetResponse = await api.get('/budget');
            console.log('✅ Budget endpoint accessible:', budgetResponse.data);
        } catch (err) {
            console.log('⚠️ Budget endpoint error:', err.message);
        }
        
        return true;
    } catch (error) {
        console.error('❌ API connection failed:', error.message);
        return false;
    }
};

// Auto-test on import (for development)
if (process.env.NODE_ENV === 'development') {
    testConnection();
}

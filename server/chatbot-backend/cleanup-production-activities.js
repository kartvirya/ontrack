const fetch = require('node-fetch');

async function cleanupProductionActivities() {
  try {
    const PRODUCTION_URL = 'https://lisa-frontend-yrg6.onrender.com';
    
    console.log('🔐 Logging in as admin...');
    
    // Step 1: Login as admin
    const loginResponse = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123456'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    if (!token) {
      throw new Error('No token received from login');
    }
    
    console.log('✅ Successfully logged in');
    
    // Step 2: Call cleanup endpoint
    console.log('🧹 Cleaning up old activities...');
    
    const cleanupResponse = await fetch(`${PRODUCTION_URL}/api/admin/activities/cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!cleanupResponse.ok) {
      const errorText = await cleanupResponse.text();
      throw new Error(`Cleanup failed: ${cleanupResponse.status} ${cleanupResponse.statusText} - ${errorText}`);
    }
    
    const cleanupData = await cleanupResponse.json();
    console.log('✅ Cleanup completed successfully!');
    console.log('📊 Result:', cleanupData);
    
    // Step 3: Verify activities are cleaned
    console.log('🔍 Verifying activities...');
    
    const activitiesResponse = await fetch(`${PRODUCTION_URL}/api/admin/activities`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (activitiesResponse.ok) {
      const activitiesData = await activitiesResponse.json();
      console.log(`📈 Activities remaining: ${activitiesData.activities.length}`);
      
      if (activitiesData.activities.length > 0) {
        console.log('📝 Sample remaining activities:');
        activitiesData.activities.slice(0, 5).forEach((activity, index) => {
          console.log(`  ${index + 1}. ${activity.action} - ${activity.details}`);
        });
      } else {
        console.log('🎉 No activities remaining - database is clean!');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the cleanup
cleanupProductionActivities(); 
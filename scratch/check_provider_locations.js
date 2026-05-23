const { createClient } = require('@insforge/sdk');

async function run() {
  const client = createClient({
    baseUrl: 'https://99qhmaqv.us-east.insforge.app',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MDUzODJ9.Sl2Y6o4CM8Ohfl_2gzMyxuqjkrtWkxNfa_-_5EnvWDs'
  });

  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email: '9999999999@mock-mobile.local',
    password: 'Static_Auth_9999999999'
  });

  if (authError) {
    console.error('Auth error:', authError);
    return;
  }

  if (authData.accessToken) {
    client.setAccessToken(authData.accessToken);
  }

  const { data: locData, error: locError } = await client.database
    .from('provider_locations')
    .select('*')
    .limit(1);

  if (locError) {
    console.error('Provider locations fetch error:', locError);
  } else {
    console.log('Sample provider locations keys:', locData.length > 0 ? Object.keys(locData[0]) : 'Empty table');
    console.log('Sample provider locations details:', locData[0]);
  }
}

run().catch(console.error);

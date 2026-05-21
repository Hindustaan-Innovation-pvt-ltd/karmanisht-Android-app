const { createClient } = require('@insforge/sdk');

async function run() {
  const client = createClient({
    baseUrl: 'https://99qhmaqv.us-east.insforge.app',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MDUzODJ9.Sl2Y6o4CM8Ohfl_2gzMyxuqjkrtWkxNfa_-_5EnvWDs'
  });

  console.log('Logging in as admin...');
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email: '9999999999@mock-mobile.local',
    password: 'Static_Auth_9999999999'
  });

  if (authError) {
    console.error('Auth error:', authError);
    return;
  }

  console.log('Successfully logged in. User ID:', authData.user.id);
  console.log('Access token:', authData.accessToken ? 'Present' : 'Missing');

  if (authData.accessToken) {
    client.setAccessToken(authData.accessToken);
  }

  console.log('Fetching users...');
  const { data: usersData, error: usersError } = await client.database
    .from('users')
    .select('id, mobile, full_name, role, is_active');

  if (usersError) {
    console.error('Users fetch error:', usersError);
  } else {
    console.log('Fetched users count:', usersData.length);
    console.log('Sample user:', usersData[0]);
  }

  console.log('Fetching service providers...');
  const { data: provData, error: provError } = await client.database
    .from('service_providers')
    .select('id, mobile, full_name, is_active');

  if (provError) {
    console.error('Providers fetch error:', provError);
  } else {
    console.log('Fetched providers count:', provData.length);
  }
}

run().catch(console.error);
